import Dexie, { Table } from 'dexie';
import type { InventoryListItem } from '../services/inventory.service';

interface CachedInventoryItem extends InventoryListItem {
  pharmacyId: string;
  cachedAt: number;
}

class InventoryCacheDatabase extends Dexie {
  inventoryItems!: Table<CachedInventoryItem, string>;

  constructor() {
    super('MedLinkInventoryCache');
    this.version(1).stores({
      inventoryItems: '&id, pharmacyId, cachedAt',
    });
  }
}

const db = new InventoryCacheDatabase();

export const inventoryCache = {
  async cacheInventory(pharmacyId: string, items: InventoryListItem[]) {
    const timestamp = Date.now();
    await db.transaction('rw', db.inventoryItems, async () => {
      await db.inventoryItems.where('pharmacyId').equals(pharmacyId).delete();
      await db.inventoryItems.bulkPut(
        items.map((item) => ({
          ...item,
          pharmacyId,
          cachedAt: timestamp,
        })),
      );
    });
    return timestamp;
  },

  async upsert(pharmacyId: string, item: InventoryListItem) {
    await db.inventoryItems.put({
      ...item,
      pharmacyId,
      cachedAt: Date.now(),
    });
  },

  async load(pharmacyId: string): Promise<InventoryListItem[]> {
    const records = await db.inventoryItems.where('pharmacyId').equals(pharmacyId).toArray();
    return records
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ cachedAt: _cachedAt, ...rest }) => rest);
  },

  async clear(pharmacyId: string) {
    await db.inventoryItems.where('pharmacyId').equals(pharmacyId).delete();
  },
};

