import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AdminProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location.pathname, message: 'Please log in as an admin to continue' }} replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" state={{ message: 'Access denied. Admin only.' }} replace />;
  }

  return children;
}
