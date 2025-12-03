import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authService } from '../../services/auth.service';

interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  organization?: {
    id: string;
    name: string;
    type: string;
    brandColor?: string | null;
    timezone?: string | null;
    settings?: Record<string, unknown> | null;
  } | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  user: AuthUser | null;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null,
  user: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (payload: { identifier: string; password: string }) => {
    return authService.login(payload.identifier, payload.password);
  },
);

export const bootstrapSession = createAsyncThunk('auth/bootstrap', async () => {
  return authService.bootstrap();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      authService.logout();
    },
    updateOrganizationSettings(
      state,
      action: {
        payload: {
          brandColor?: string | null;
          timezone?: string | null;
          settings?: Record<string, unknown> | null;
        };
      },
    ) {
      if (state.user?.organization) {
        state.user.organization = {
          ...state.user.organization,
          brandColor:
            action.payload.brandColor !== undefined
              ? action.payload.brandColor
              : state.user.organization.brandColor ?? null,
          timezone:
            action.payload.timezone !== undefined
              ? action.payload.timezone
              : state.user.organization.timezone ?? null,
          settings:
            action.payload.settings !== undefined
              ? action.payload.settings
              : state.user.organization.settings ?? null,
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Login failed';
      })
      .addCase(bootstrapSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.accessToken = action.payload.accessToken;
          state.refreshToken = action.payload.refreshToken;
          state.user = action.payload.user;
        }
      });
  },
});

export const { logout, updateOrganizationSettings } = authSlice.actions;
export default authSlice.reducer;
