import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { pharmacyService, PharmacySummary } from '../../services/pharmacy.service';
import { logout } from './auth.slice';

interface PharmacyState {
  items: PharmacySummary[];
  activePharmacyId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: PharmacyState = {
  items: [],
  activePharmacyId: null,
  loading: false,
  error: null,
};

export const fetchMyPharmacies = createAsyncThunk('pharmacies/fetchMine', async () => {
  const data = await pharmacyService.listMine();
  return data;
});

const pharmaciesSlice = createSlice({
  name: 'pharmacies',
  initialState,
  reducers: {
    setActivePharmacy(state, action: PayloadAction<string>) {
      state.activePharmacyId = action.payload;
    },
    resetPharmacies(state) {
      state.items = [];
      state.activePharmacyId = null;
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyPharmacies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyPharmacies.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        if (!state.activePharmacyId && action.payload.length > 0) {
          state.activePharmacyId = action.payload[0].id;
        } else if (
          state.activePharmacyId &&
          action.payload.every((pharmacy) => pharmacy.id !== state.activePharmacyId)
        ) {
          state.activePharmacyId = action.payload[0]?.id ?? null;
        }
      })
      .addCase(fetchMyPharmacies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to load pharmacies';
      })
      .addCase(logout, () => ({ ...initialState }));
  },
});

export const { setActivePharmacy, resetPharmacies } = pharmaciesSlice.actions;
export default pharmaciesSlice.reducer;

