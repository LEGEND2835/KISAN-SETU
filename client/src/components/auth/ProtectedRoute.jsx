import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-slate-400 text-sm">Verifying session...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If a farmer tries to access officer routes, redirect to /my-bookings
    if (user.role === 'farmer') {
      return <Navigate to="/my-bookings" replace />;
    }
    // If an officer tries to access farmer routes, redirect to /centre/officer
    return <Navigate to="/centre/officer" replace />;
  }

  return children;
}
