import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { prescriptionsService } from '../../services/prescriptions.service';
import { logout } from './auth.slice';

export interface PrescriptionMedication {
  id: string;
  drugName: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
}

export type PrescriptionStatus =
  | "received"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export interface PrescriptionSummary {
  id: string;
  verificationCode: string;
  createdAt: string;
  status: PrescriptionStatus;
  readyAt?: string | null;
  pickedUpAt?: string | null;
  statusNotes?: string | null;
  substitutions?: Array<{
    medicationId: string;
    substituteDrugName: string;
    reason?: string;
  }>;
  fulfilledAt?: string | null;
  sentToPharmacy: boolean;
  assignedPharmacyId: string | null;
  patient: {
    id: string;
    name: string;
    email: string;
  } | null;
  doctor: {
    id: string;
    name: string;
    email: string;
  } | null;
  medications: PrescriptionMedication[];
}

interface PrescriptionsState {
  open: PrescriptionSummary[];
  loading: boolean;
  error: string | null;
  assignLoading: boolean;
  fulfilLoading: boolean;
  lastAssignedCode: string | null;
}

const initialState: PrescriptionsState = {
  open: [],
  loading: false,
  error: null,
  assignLoading: false,
  fulfilLoading: false,
  lastAssignedCode: null,
};

export const fetchOpenPrescriptions = createAsyncThunk(
  'prescriptions/fetchOpen',
  async ({ pharmacyId }: { pharmacyId: string }) => {
    const data = await prescriptionsService.fetchOpen(pharmacyId);
    return data as PrescriptionSummary[];
  },
);

export const assignPrescriptionByCode = createAsyncThunk(
  'prescriptions/assignByCode',
  async ({ pharmacyId, verificationCode }: { pharmacyId: string; verificationCode: string }) => {
    const data = await prescriptionsService.assignByCode(pharmacyId, verificationCode);
    return data as PrescriptionSummary;
  },
);

export const fulfilPrescription = createAsyncThunk(
  'prescriptions/fulfil',
  async ({
    pharmacyId,
    prescriptionId,
    payload,
  }: {
    pharmacyId: string;
    prescriptionId: string;
    payload: {
      dispensedMedications?: string[];
      notes?: string;
      pickupNotes?: string;
      pickupContact?: string;
      substitutions?: Array<{ medicationId: string; substituteDrugName: string; reason?: string }>;
      pharmacistId: string;
    };
  }) => {
    const data = await prescriptionsService.fulfil(pharmacyId, prescriptionId, payload);
    return data as PrescriptionSummary;
  },
);

export const updatePrescriptionStatus = createAsyncThunk(
  'prescriptions/updateStatus',
  async ({
    pharmacyId,
    prescriptionId,
    status,
    notes,
  }: {
    pharmacyId: string;
    prescriptionId: string;
    status: PrescriptionStatus;
    notes?: string;
  }) => {
    const data = await prescriptionsService.updateStatus(pharmacyId, prescriptionId, { status, notes });
    return data as PrescriptionSummary;
  },
);

const prescriptionsSlice = createSlice({
  name: 'prescriptions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOpenPrescriptions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOpenPrescriptions.fulfilled, (state, action) => {
        state.loading = false;
        state.open =
          action.payload?.filter(
            (prescription) => prescription.status !== "completed" && prescription.status !== "cancelled"
          ) ?? [];
      })
      .addCase(fetchOpenPrescriptions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to load prescriptions';
      })
      .addCase(assignPrescriptionByCode.pending, (state, action) => {
        state.assignLoading = true;
        state.error = null;
        state.lastAssignedCode = action.meta.arg.verificationCode;
      })
      .addCase(assignPrescriptionByCode.fulfilled, (state, action) => {
        state.assignLoading = false;
        state.lastAssignedCode = null;
        const exists = state.open.find((prescription) => prescription.id === action.payload.id);
        if (!exists) {
          state.open = [action.payload, ...state.open];
        } else {
          state.open = state.open.map((prescription) =>
            prescription.id === action.payload.id ? action.payload : prescription,
          );
        }
      })
      .addCase(assignPrescriptionByCode.rejected, (state, action) => {
        state.assignLoading = false;
        state.error =
          action.error.message ?? 'Unable to assign prescription. Please confirm the code.';
      })
      .addCase(fulfilPrescription.pending, (state) => {
        state.fulfilLoading = true;
        state.error = null;
      })
      .addCase(fulfilPrescription.fulfilled, (state, action) => {
        state.fulfilLoading = false;
        state.open = state.open.filter((prescription) => prescription.id !== action.payload.id);
      })
      .addCase(fulfilPrescription.rejected, (state, action) => {
        state.fulfilLoading = false;
        state.error = action.error.message ?? 'Unable to fulfil prescription';
      })
      .addCase(updatePrescriptionStatus.fulfilled, (state, action) => {
        state.open = state.open.map((prescription) =>
          prescription.id === action.payload.id ? action.payload : prescription,
        );
        state.open = state.open.filter(
          (prescription) => prescription.status !== 'completed' && prescription.status !== 'cancelled',
        );
      })
      .addCase(updatePrescriptionStatus.rejected, (state, action) => {
        state.error = action.error.message ?? 'Unable to update status';
      })
      .addCase(logout, () => ({ ...initialState }));
  },
});

export default prescriptionsSlice.reducer;
