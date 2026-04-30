import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const AdminRoute = ({ children, requireSuperAdmin = false }) => {
  const { isAuthenticated, isInitialized, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (!isInitialized) {
    return <LoadingSpinner message="Verifying admin access..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireSuperAdmin ? !isSuperAdmin : !isAdmin) {
    return <Navigate to="/Dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
