import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, loading, mustChangePassword, getDashboardPath } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <span className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  if (mustChangePassword && !window.location.pathname.includes('change-password')) {
    return <Navigate to="/change-password" replace />;
  }

  return children ?? <Outlet />;
};

export default ProtectedRoute;
