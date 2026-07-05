import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import uiReducer from './uiSlice';
import playerReducer from './playerSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    player: playerReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
