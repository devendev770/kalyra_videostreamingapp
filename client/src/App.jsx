import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuthStatus } from './store/authSlice';
import { SocketProvider } from './contexts/SocketContext';
import { Toaster } from 'react-hot-toast';

// Layout & Common
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import OAuthCallback from './pages/auth/OAuthCallback';


// Core Discovery Pages
import Home from './pages/Home';
import Trending from './pages/Trending';
import Subscriptions from './pages/Subscriptions';
import Search from './pages/Search';
import Watch from './pages/Watch';
import Community from './pages/Community';
import Channel from './pages/Channel';
import Library from './pages/Library';
import CreatorStudio from './pages/CreatorStudio';
import AdminDashboard from './pages/AdminDashboard';
import LiveStreams from './pages/LiveStreams';
import LiveRoom from './pages/LiveRoom';
import Vibes from './pages/Vibes';
import WatchParty from './pages/WatchParty';
import WatchPartyRoom from './pages/WatchPartyRoom';

const App = () => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-zinc-400 mt-4">Initializing Kalyra...</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth Routes */}
            <Route path="/auth">
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
              <Route path="callback" element={<OAuthCallback />} />
              <Route path="" element={<Navigate to="/auth/login" replace />} />
            </Route>

            {/* Application Platform Layout Workspace */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="trending" element={<Trending />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="vibes" element={<Vibes />} />
              <Route path="live" element={<LiveStreams />} />
              <Route path="live/:id" element={<LiveRoom />} />
              <Route path="watch-party" element={<WatchParty />} />
              <Route
                path="watch-party/:roomCode"
                element={
                  <ProtectedRoute>
                    <WatchPartyRoom />
                  </ProtectedRoute>
                }
              />
              <Route path="search" element={<Search />} />
              <Route path="watch/:id" element={<Watch />} />
              <Route path="community" element={<Community />} />

              {/* Personal Library & Channel pages */}
              <Route path="channel/:id" element={<Channel />} />
              
              {/* Authenticated personal space routes */}
              <Route
                path="library"
                element={
                  <ProtectedRoute>
                    <Library />
                  </ProtectedRoute>
                }
              />
              <Route
                path="library/:tab"
                element={
                  <ProtectedRoute>
                    <Library />
                  </ProtectedRoute>
                }
              />
              
              {/* Creator Studio Workspace */}
              <Route
                path="studio"
                element={
                  <ProtectedRoute allowedRoles={['user', 'creator', 'admin']}>
                    <CreatorStudio />
                  </ProtectedRoute>
                }
              />

              {/* Admin Moderation Panel */}
              <Route
                path="admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback routing redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </SocketProvider>
    </ErrorBoundary>
  );
};

export default App;
