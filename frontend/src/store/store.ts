import { configureStore } from '@reduxjs/toolkit';
import scanReducer from './features/scanSlice';
import authReducer from './features/authSlice';
import websiteReducer from './features/websiteSlice';

export const store = configureStore({
  reducer: {
    scan: scanReducer,
    auth: authReducer,
    website: websiteReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
