import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentVideo: null, // video details when playing in mini-player/global player
  isPlaying: false,
  volume: 0.8,
  muted: false,
  playbackSpeed: 1.0,
  quality: 'auto',
  pipActive: false,
  queue: [],
  currentIndex: -1,
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    playVideo: (state, action) => {
      state.currentVideo = action.payload;
      state.isPlaying = true;
    },
    setPlaying: (state, action) => {
      state.isPlaying = action.payload;
    },
    setVolume: (state, action) => {
      state.volume = action.payload;
      state.muted = action.payload === 0;
    },
    setMuted: (state, action) => {
      state.muted = action.payload;
    },
    setPlaybackSpeed: (state, action) => {
      state.playbackSpeed = action.payload;
    },
    setQuality: (state, action) => {
      state.quality = action.payload;
    },
    setPipActive: (state, action) => {
      state.pipActive = action.payload;
    },
    addToQueue: (state, action) => {
      state.queue.push(action.payload);
      if (state.currentIndex === -1) {
        state.currentIndex = 0;
        state.currentVideo = action.payload;
      }
    },
    removeFromQueue: (state, action) => {
      state.queue = state.queue.filter((v) => v._id !== action.payload);
      if (state.queue.length === 0) {
        state.currentIndex = -1;
        state.currentVideo = null;
        state.isPlaying = false;
      }
    },
    nextVideo: (state) => {
      if (state.currentIndex < state.queue.length - 1) {
        state.currentIndex += 1;
        state.currentVideo = state.queue[state.currentIndex];
        state.isPlaying = true;
      }
    },
    prevVideo: (state) => {
      if (state.currentIndex > 0) {
        state.currentIndex -= 1;
        state.currentVideo = state.queue[state.currentIndex];
        state.isPlaying = true;
      }
    },
    clearQueue: (state) => {
      state.queue = [];
      state.currentIndex = -1;
      state.currentVideo = null;
      state.isPlaying = false;
    }
  },
});

export const {
  playVideo,
  setPlaying,
  setVolume,
  setMuted,
  setPlaybackSpeed,
  setQuality,
  setPipActive,
  addToQueue,
  removeFromQueue,
  nextVideo,
  prevVideo,
  clearQueue,
} = playerSlice.actions;

export default playerSlice.reducer;
