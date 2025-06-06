
import React, { ReactNode } from 'react'
import { useAuthStore } from '../lib/store';
import { Navigate } from 'react-router-dom';

interface AdminRouteProps {
  children: ReactNode;
}

function AdminRoute({ children }: AdminRouteProps) {
  const currentUser = useAuthStore((state) => state.user);
  
  if (currentUser?.email?.endsWith("@admin.com")) {
    return <>{children}</>;
  } else {
    return <Navigate to="/" />;
  }
}

export default AdminRoute;
