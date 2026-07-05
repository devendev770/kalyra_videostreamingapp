import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI, userAPI } from '../api';

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.login(credentials);
    sessionStorage.setItem('accessToken', data.accessToken);
    return data.user;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || 'Login failed');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.register(userData);
    sessionStorage.setItem('accessToken', data.accessToken);
    return data.user;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || 'Registration failed');
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authAPI.logout();
    sessionStorage.removeItem('accessToken');
    return null;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || 'Logout failed');
  }
});

export const checkAuthStatus = createAsyncThunk('auth/checkStatus', async (_, { rejectWithValue }) => {
  try {
    const token = sessionStorage.getItem('accessToken');
    if (!token) return null;
    const { data } = await authAPI.getMe();
    return data.user;
  } catch (error) {
    sessionStorage.removeItem('accessToken');
    return rejectWithValue(error.response?.data?.error || 'Session expired');
  }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (profileData, { rejectWithValue }) => {
  try {
    const { data } = await userAPI.updateProfile(profileData);
    return data.user;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || 'Profile update failed');
  }
});

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setOAuthToken: (state, action) => {
      sessionStorage.setItem('accessToken', action.payload);
      state.isAuthenticated = true;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
      })
      // Check status
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        state.loading = false;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
      })
      // Update profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { clearError, setOAuthToken } = authSlice.actions;
export default authSlice.reducer;
