import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth.slice';
import inventoryReducer from './slices/inventory.slice';
import prescriptionsReducer from './slices/prescriptions.slice';
import queueReducer from './slices/queue.slice';
import pharmaciesReducer from './slices/pharmacies.slice';
import organizationsReducer from './slices/organizations.slice';
import syncReducer from './slices/sync.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    inventory: inventoryReducer,
    prescriptions: prescriptionsReducer,
    queue: queueReducer,
    pharmacies: pharmaciesReducer,
    organizations: organizationsReducer,
    sync: syncReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
