import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarOpen: true,
  theme: 'dark', // Kalyra is primary dark-themed
  uploadProgress: {}, // videoId -> { stage, percent }
  activeUploads: 0,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    updateUploadProgress: (state, action) => {
      const { videoId, stage, percent } = action.payload;
      state.uploadProgress[videoId] = { stage, percent };
      if (percent === 100 || stage === 'failed') {
        state.activeUploads = Math.max(0, state.activeUploads - 1);
      }
    },
    startUploadTracking: (state, action) => {
      const { videoId } = action.payload;
      state.uploadProgress[videoId] = { stage: 'uploading', percent: 0 };
      state.activeUploads += 1;
    },
    clearUploadProgress: (state, action) => {
      delete state.uploadProgress[action.payload];
    }
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  updateUploadProgress,
  startUploadTracking,
  clearUploadProgress,
} = uiSlice.actions;

export default uiSlice.reducer;
