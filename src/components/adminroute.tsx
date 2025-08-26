import { ReactNode } from 'react'
import { useAppSelector } from '../hooks/redux.CustomHooks';
import { Navigate } from 'react-router-dom';

interface AdminRouteProps {
  children: ReactNode;
}

function AdminRoute({ children }: AdminRouteProps) {
  const user = useAppSelector((state) => state.auth.user);

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user role is admin
  if (user && user.role === "admin") {
    return <>{children}</>;
  } else {
    // Redirect based on role
    if (user.role === "superadmin") return <Navigate to="/superadmin" replace />;
    if (user.role === "user") return <Navigate to="/user" replace />;
    return <Navigate to="/" replace />;
  }
}

// SuperAdmin Route Component
interface SuperAdminRouteProps {
  children: ReactNode;
}

export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const user = useAppSelector((state) => state.auth.user);

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user role is superadmin
  if (user && user.role === "superadmin") {
    return <>{children}</>;
  } else {
    // Redirect based on role
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "user") return <Navigate to="/user" replace />;
    return <Navigate to="/" replace />;
  }
}

// User Route Component
interface UserRouteProps {
  children: ReactNode;
}

export function UserRoute({ children }: UserRouteProps) {
  const user = useAppSelector((state) => state.auth.user);

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user role is user
  if (user && user.role === "user") {
    return <>{children}</>;
  } else {
    // Redirect based on role
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "superadmin") return <Navigate to="/superadmin" replace />;
    return <Navigate to="/" replace />;
  }
}

// Employee Route Component
interface EmployeeRouteProps {
  children: ReactNode;
}

export function EmployeeRoute({ children }: EmployeeRouteProps) {
  const user = useAppSelector((state) => state.auth.user);

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user role is employee, client, or product manager
  if (user && (user.role === "employee" || user.role === "client" || user.role === "product manager")) {
    return <>{children}</>;
  } else {
    // Redirect based on role
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "superadmin") return <Navigate to="/superadmin" replace />;
    if (user.role === "user") return <Navigate to="/user" replace />;
    return <Navigate to="/" replace />;
  }
}

export default AdminRoute;
