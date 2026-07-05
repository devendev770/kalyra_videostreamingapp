import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';

/**
 * Protect routes against unauthenticated users or unauthorized roles
 * @param {Array} allowedRoles - Optional list of roles that can access this route
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-sm text-zinc-400 mt-3 font-medium">Authenticating session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
