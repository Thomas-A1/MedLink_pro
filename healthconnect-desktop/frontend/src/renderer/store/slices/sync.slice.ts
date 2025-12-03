import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { syncService } from "../../services/sync.service";
import { logout } from "./auth.slice";

interface SyncState {
  pendingJobs: number;
  processing: boolean;
  lastSyncedAt: number | null;
  error: string | null;
}

const initialState: SyncState = {
  pendingJobs: 0,
  processing: false,
  lastSyncedAt: null,
  error: null,
};

export const loadSyncJobs = createAsyncThunk("sync/loadJobs", async () => {
  const jobs = await syncService.listJobs();
  return jobs.length;
});

export const processSyncQueue = createAsyncThunk<{ processed: number; failures: number }>(
  "sync/process",
  async () => {
    const result = await syncService.processQueue();
    return result;
  }
);

const syncSlice = createSlice({
  name: "sync",
  initialState,
  reducers: {
    incrementPending(state) {
      state.pendingJobs += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSyncJobs.fulfilled, (state, action) => {
        state.pendingJobs = action.payload;
      })
      .addCase(processSyncQueue.pending, (state) => {
        state.processing = true;
        state.error = null;
      })
      .addCase(processSyncQueue.fulfilled, (state, action) => {
        state.processing = false;
        state.pendingJobs = Math.max(state.pendingJobs - action.payload.processed, 0);
        if (action.payload.failures === 0) {
          state.lastSyncedAt = Date.now();
        } else {
          state.error = "Some sync jobs failed. Will retry automatically.";
        }
      })
      .addCase(processSyncQueue.rejected, (state, action) => {
        state.processing = false;
        state.error = action.error.message ?? "Unable to sync changes.";
      })
      .addCase(logout, () => ({
        ...initialState,
      }));
  },
});

export const { incrementPending } = syncSlice.actions;
export default syncSlice.reducer;


