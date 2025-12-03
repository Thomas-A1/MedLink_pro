import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { queueService } from '../../services/queue.service';
import { logout } from './auth.slice';

export type QueueStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'skipped';

export interface QueueEntry {
  id: string;
  status: QueueStatus;
  priority: number;
  createdAt: string;
  acknowledgedAt?: string;
  completedAt?: string;
  waitTimeMinutes: number;
  patient: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
  };
}

interface QueueState {
  entries: QueueEntry[];
  loading: boolean;
  error: string | null;
  updating: boolean;
}

const initialState: QueueState = {
  entries: [],
  loading: false,
  error: null,
  updating: false,
};

export const fetchQueue = createAsyncThunk('queue/fetch', async (pharmacyId: string) => {
  const data = await queueService.fetchQueue(pharmacyId);
  return data as QueueEntry[];
});

export const enqueueQueueEntry = createAsyncThunk(
  'queue/enqueue',
  async ({
    pharmacyId,
    payload,
  }: {
    pharmacyId: string;
    payload: { patientId?: string; patientName?: string; patientEmail?: string };
  }) => {
    const data = await queueService.enqueue(pharmacyId, payload);
    return data as QueueEntry;
  },
);

export const updateQueueStatus = createAsyncThunk(
  'queue/updateStatus',
  async ({
    pharmacyId,
    entryId,
    status,
  }: {
    pharmacyId: string;
    entryId: string;
    status: QueueStatus;
  }) => {
    const data = await queueService.updateStatus(pharmacyId, entryId, status);
    return data as QueueEntry;
  },
);

const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    setQueueEntries(state, action) {
      state.entries = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQueue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQueue.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = action.payload;
      })
      .addCase(fetchQueue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to load queue';
      })
      .addCase(enqueueQueueEntry.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(enqueueQueueEntry.fulfilled, (state, action) => {
        state.updating = false;
        state.entries = [action.payload, ...state.entries];
      })
      .addCase(enqueueQueueEntry.rejected, (state, action) => {
        state.updating = false;
        state.error = action.error.message ?? 'Unable to add patient to queue';
      })
      .addCase(updateQueueStatus.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateQueueStatus.fulfilled, (state, action) => {
        state.updating = false;
        state.entries = state.entries
          .map((entry) => (entry.id === action.payload.id ? action.payload : entry))
          .filter((entry) => entry.status !== 'completed' && entry.status !== 'cancelled');
      })
      .addCase(updateQueueStatus.rejected, (state, action) => {
        state.updating = false;
        state.error = action.error.message ?? 'Unable to update queue entry';
      })
      .addCase(logout, () => ({ ...initialState }));
  },
});

export const { setQueueEntries } = queueSlice.actions;
export default queueSlice.reducer;
