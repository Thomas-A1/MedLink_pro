import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { OrganizationSummary, organizationsService } from '../../services/organizations.service';

interface OrganizationsState {
  items: OrganizationSummary[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  lastCreated?: OrganizationSummary | null;
}

const initialState: OrganizationsState = {
  items: [],
  loading: false,
  error: null,
  creating: false,
  lastCreated: null,
};

export const fetchOrganizations = createAsyncThunk('organizations/fetchAll', async () => {
  const data = await organizationsService.fetchAll();
  return data;
});

export const createOrganization = createAsyncThunk(
  'organizations/create',
  async (payload: {
    name: string;
    type: string;
    primaryLocationName?: string;
    primaryLocationAddress?: string;
    primaryLocationRegion?: string;
    primaryLocationDistrict?: string;
    primaryLocationCountry?: string;
    primaryLocationPhone: string;
    primaryLocationLatitude: number;
    primaryLocationLongitude: number;
    timezone: string;
    brandColor: string;
    logoUrl?: string;
    adminEmail: string;
    adminFirstName: string;
    adminLastName?: string;
    adminPassword?: string;
  }) => {
    const data = await organizationsService.create(payload);
    return data;
  },
);

export const updateOrganization = createAsyncThunk(
  'organizations/update',
  async (payload: {
    id: string;
    name?: string;
    type?: string;
    primaryLocationName?: string;
    primaryLocationAddress?: string;
    primaryLocationRegion?: string;
    primaryLocationDistrict?: string;
    primaryLocationCountry?: string;
    primaryLocationPhone?: string;
    primaryLocationLatitude?: number;
    primaryLocationLongitude?: number;
    timezone?: string;
    brandColor?: string;
    logoUrl?: string;
    adminEmail?: string;
    adminFirstName?: string;
    adminLastName?: string;
  }) => {
    const { id, ...updateData } = payload;
    const data = await organizationsService.update(id, updateData);
    return data;
  },
);

export const deleteOrganization = createAsyncThunk(
  'organizations/delete',
  async (id: string) => {
    await organizationsService.delete(id);
    return id;
  },
);

const organizationsSlice = createSlice({
  name: 'organizations',
  initialState,
  reducers: {
    clearLastCreated(state) {
      state.lastCreated = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrganizations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrganizations.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchOrganizations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to load organizations';
      })
      .addCase(createOrganization.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createOrganization.fulfilled, (state, action) => {
        state.creating = false;
        state.lastCreated = action.payload;
        state.items = [action.payload, ...state.items];
      })
      .addCase(createOrganization.rejected, (state, action) => {
        state.creating = false;
        state.error = action.error.message ?? 'Unable to create organization';
      })
      .addCase(updateOrganization.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrganization.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateOrganization.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to update organization';
      })
      .addCase(deleteOrganization.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteOrganization.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(deleteOrganization.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to delete organization';
      });
  },
});

export const { clearLastCreated } = organizationsSlice.actions;
export default organizationsSlice.reducer;

