import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  inventoryService,
  InventoryListItem,
  CreateInventoryPayload,
  AdjustInventoryPayload,
  StockMovementEntry,
} from '../../services/inventory.service';
import { inventoryCache } from '../../storage/inventoryCache';
import { logout } from './auth.slice';
import { syncService } from '../../services/sync.service';
import { incrementPending } from './sync.slice';
import type { RootState } from '../store';

interface InventoryState {
  items: InventoryListItem[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  lastSyncedAt: number | null;
  movementsByItem: Record<string, StockMovementEntry[]>;
  movementsLoading: boolean;
  movementsError: string | null;
}

const initialState: InventoryState = {
  items: [],
  loading: false,
  error: null,
  isOffline: false,
  lastSyncedAt: null,
  movementsByItem: {},
  movementsLoading: false,
  movementsError: null,
};

const sortByName = (items: InventoryListItem[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name));

export const fetchInventory = createAsyncThunk(
  'inventory/fetch',
  async ({ pharmacyId }: { pharmacyId: string }) => {
    const items = await inventoryService.fetchInventory(pharmacyId);
    const timestamp = await inventoryCache.cacheInventory(pharmacyId, items);
    return { pharmacyId, items, timestamp };
  },
);

export const loadInventoryFromCache = createAsyncThunk(
  'inventory/loadCache',
  async ({ pharmacyId }: { pharmacyId: string }) => {
    const items = await inventoryCache.load(pharmacyId);
    return { pharmacyId, items };
  },
);

export const createInventoryItem = createAsyncThunk(
  'inventory/create',
  async (
    { pharmacyId, payload }: { pharmacyId: string; payload: CreateInventoryPayload },
    { dispatch },
  ) => {
    try {
      const item = await inventoryService.createItem(pharmacyId, payload);
      await inventoryCache.upsert(pharmacyId, item);
      return { item, optimistic: false };
    } catch (err: any) {
      if (shouldQueue(err)) {
        const tempId = `temp-${Date.now()}`;
        const optimisticItem = buildOptimisticItem(payload, pharmacyId, tempId);
        await inventoryCache.upsert(pharmacyId, optimisticItem);
        await syncService.enqueueInventoryCreate(pharmacyId, payload, tempId);
        dispatch(incrementPending());
        return { item: optimisticItem, optimistic: true };
      }
      throw err;
    }
  },
);

export const adjustInventoryItem = createAsyncThunk(
  'inventory/adjust',
  async (
    {
      pharmacyId,
      itemId,
      payload,
    }: {
      pharmacyId: string;
      itemId: string;
      payload: AdjustInventoryPayload;
    },
    { getState, dispatch },
  ) => {
    try {
      const item = await inventoryService.adjustStock(pharmacyId, itemId, payload);
      await inventoryCache.upsert(pharmacyId, item);
      return { item, optimistic: false };
    } catch (err: any) {
      if (shouldQueue(err)) {
        const state = getState() as RootState;
        const current = state.inventory.items.find((item) => item.id === itemId);
        if (!current) {
          throw err;
        }
        const optimisticItem = {
          ...current,
          quantityInStock: Math.max(current.quantityInStock + payload.quantityDelta, 0),
          meta: computeMeta(
            {
              quantityInStock: Math.max(current.quantityInStock + payload.quantityDelta, 0),
              reorderLevel: current.reorderLevel,
              expiryDate: current.expiryDate,
            },
            true,
          ),
        } as InventoryListItem;
        await inventoryCache.upsert(pharmacyId, optimisticItem);
        await syncService.enqueueInventoryAdjust(pharmacyId, itemId, payload);
        dispatch(incrementPending());
        return { item: optimisticItem, optimistic: true };
      }
      throw err;
    }
  },
);

export const fetchInventoryMovements = createAsyncThunk(
  'inventory/fetchMovements',
  async ({ pharmacyId, itemId }: { pharmacyId: string; itemId: string }) => {
    const movements = await inventoryService.fetchMovements(pharmacyId, itemId);
    return { itemId, movements };
  },
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    clearInventory(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = sortByName(action.payload.items);
        state.isOffline = false;
        state.lastSyncedAt = action.payload.timestamp;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to load inventory';
        state.isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : state.isOffline;
      })
      .addCase(loadInventoryFromCache.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadInventoryFromCache.fulfilled, (state, action) => {
        state.loading = false;
        state.items = sortByName(action.payload.items);
        state.isOffline = true;
      })
      .addCase(loadInventoryFromCache.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to access offline cache';
      })
      .addCase(createInventoryItem.fulfilled, (state, action) => {
        const { item, optimistic } = action.payload;
        const existingIndex = state.items.findIndex((candidate) => candidate.id === item.id);
        if (existingIndex >= 0) {
          state.items[existingIndex] = item;
        } else {
          state.items.push(item);
        }
        state.items = sortByName(state.items);
        if (optimistic) {
          state.isOffline = true;
        }
      })
      .addCase(adjustInventoryItem.fulfilled, (state, action) => {
        const { item, optimistic } = action.payload;
        const index = state.items.findIndex((candidate) => candidate.id === item.id);
        if (index >= 0) {
          state.items[index] = item;
        }
        state.items = sortByName(state.items);
        if (optimistic) {
          state.isOffline = true;
        }
      })
      .addCase(fetchInventoryMovements.pending, (state) => {
        state.movementsLoading = true;
        state.movementsError = null;
      })
      .addCase(fetchInventoryMovements.fulfilled, (state, action) => {
        state.movementsLoading = false;
        state.movementsByItem[action.payload.itemId] = action.payload.movements;
      })
      .addCase(fetchInventoryMovements.rejected, (state, action) => {
        state.movementsLoading = false;
        state.movementsError = action.error.message ?? 'Unable to load stock movements';
      })
      .addCase(logout, () => ({ ...initialState }));
  },
});

export const { clearInventory } = inventorySlice.actions;
export default inventorySlice.reducer;

function shouldQueue(error: any) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  return error?.message === 'Network Error';
}

function buildOptimisticItem(
  payload: CreateInventoryPayload,
  pharmacyId: string,
  tempId: string,
): InventoryListItem {
  const now = new Date();
  const expiryDate = payload.expiryDate ?? null;
  return {
    id: tempId,
    pharmacyId,
    name: payload.name,
    genericName: payload.genericName ?? null,
    category: payload.category,
    form: payload.form,
    strength: payload.strength,
    manufacturer: payload.manufacturer ?? null,
    batchNumber: payload.batchNumber ?? null,
    expiryDate,
    quantityInStock: payload.quantityInStock,
    reorderLevel: payload.reorderLevel,
    unitPrice: payload.unitPrice,
    sellingPrice: payload.sellingPrice,
    barcode: payload.barcode ?? null,
    requiresPrescription: payload.requiresPrescription,
    isAvailable: true,
    meta: computeMeta({
      quantityInStock: payload.quantityInStock,
      reorderLevel: payload.reorderLevel,
      expiryDate,
    }, true),
  };
}

function computeMeta(
  data: { quantityInStock: number; reorderLevel: number; expiryDate: string | null },
  pending = false,
) {
  const now = new Date();
  const expiry = data.expiryDate ? new Date(data.expiryDate) : null;
  const expiresInDays =
    expiry && Number.isFinite(expiry.getTime())
      ? Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
  const isExpired = expiresInDays !== null && expiresInDays < 0;
  const isExpiringSoon = expiresInDays !== null && expiresInDays >= 0 && expiresInDays <= 30;
  const isLowStock = data.quantityInStock <= data.reorderLevel;
  const isOutOfStock = data.quantityInStock === 0;
  const statusTags: string[] = [];
  if (pending) {
    statusTags.push('pending-sync');
  }
  if (isOutOfStock) {
    statusTags.push('out-of-stock');
  } else if (isLowStock) {
    statusTags.push('low-stock');
  }
  if (isExpired) {
    statusTags.push('expired');
  } else if (isExpiringSoon) {
    statusTags.push('expiring-soon');
  }
  return {
    isLowStock,
    isOutOfStock,
    isExpired,
    isExpiringSoon,
    expiresInDays,
    statusTags,
  };
}
