
import { ReactNode, useEffect, useState } from 'react'
import { useAuthStore } from '../lib/store';
import { useUser } from '../contexts/UserContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface AdminRouteProps {
  children: ReactNode;
}

function AdminRoute({ children }: AdminRouteProps) {
  const currentUser = useAuthStore((state) => state.user);
  const { userProfile, loading } = useUser();
  const [roleChecked, setRoleChecked] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fallback role check if UserContext is not ready
  useEffect(() => {
    const checkUserRole = async () => {
      if (!currentUser?.id) {
        setRoleChecked(true);
        return;
      }

      // If userProfile is already loaded, use it
      if (userProfile && !loading) {
        setUserRole(userProfile.role);
        setRoleChecked(true);
        return;
      }

      // Fallback: Direct API query
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/users/${currentUser.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUserRole(data.user.role || null);
          } else {
            setUserRole(null);
          }
        } else {
          console.error('Error fetching user role:', response.status, response.statusText);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole(null);
      } finally {
        setRoleChecked(true);
      }
    };

    checkUserRole();
  }, [currentUser?.id, userProfile, loading]);

  // Show loading while checking role
  if (!roleChecked || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9A00FF]"></div>
      </div>
    );
  }

  // Use userProfile role if available, otherwise use fallback role
  const effectiveRole = userProfile?.role || userRole;

  if (currentUser && effectiveRole === "admin") {
    return <>{children}</>;
  } else {
    // Redirect based on role
    if (effectiveRole === "superadmin") return <Navigate to="/superadmin" replace />;
    if (effectiveRole === "user") return <Navigate to="/user" replace />;
    if (effectiveRole === "employee" || effectiveRole === "client") return <Navigate to="/employee" replace />;
    return <Navigate to="/" replace />;
  }
}

// SuperAdmin Route Component
interface SuperAdminRouteProps {
  children: ReactNode;
}

export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const currentUser = useAuthStore((state) => state.user);
  const { userProfile, loading } = useUser();
  const [roleChecked, setRoleChecked] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fallback role check if UserContext is not ready
  useEffect(() => {
    const checkUserRole = async () => {
      if (!currentUser?.id) {
        setRoleChecked(true);
        return;
      }

      // If userProfile is already loaded, use it
      if (userProfile && !loading) {
        setUserRole(userProfile.role);
        setRoleChecked(true);
        return;
      }

      // Fallback: Direct database query
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', currentUser.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setUserRole(null);
        } else {
          setUserRole(data?.role || null);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole(null);
      } finally {
        setRoleChecked(true);
      }
    };

    checkUserRole();
  }, [currentUser?.id, userProfile, loading]);

  // Show loading while checking role
  if (!roleChecked || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9A00FF]"></div>
      </div>
    );
  }

  // Use userProfile role if available, otherwise use fallback role
  const effectiveRole = userProfile?.role || userRole;

  if (currentUser && effectiveRole === "superadmin") {
    return <>{children}</>;
  } else {
    // Redirect based on role
    if (effectiveRole === "admin") return <Navigate to="/admin" replace />;
    if (effectiveRole === "user") return <Navigate to="/user" replace />;
    if (effectiveRole === "employee" || effectiveRole === "client") return <Navigate to="/employee" replace />;
    return <Navigate to="/" replace />;
  }
}

// User Route Component
interface UserRouteProps {
  children: ReactNode;
}

export function UserRoute({ children }: UserRouteProps) {
  const currentUser = useAuthStore((state) => state.user);
  const { userProfile, loading } = useUser();
  const [roleChecked, setRoleChecked] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fallback role check if UserContext is not ready
  useEffect(() => {
    const checkUserRole = async () => {
      if (!currentUser?.id) {
        setRoleChecked(true);
        return;
      }

      // If userProfile is already loaded, use it
      if (userProfile && !loading) {
        setUserRole(userProfile.role);
        setRoleChecked(true);
        return;
      }

      // Fallback: Direct database query
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', currentUser.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setUserRole(null);
        } else {
          setUserRole(data?.role || null);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole(null);
      } finally {
        setRoleChecked(true);
      }
    };

    checkUserRole();
  }, [currentUser?.id, userProfile, loading]);

  // Show loading while checking role
  if (!roleChecked || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9A00FF]"></div>
      </div>
    );
  }

  // Use userProfile role if available, otherwise use fallback role
  const effectiveRole = userProfile?.role || userRole;

  if (currentUser && effectiveRole === "user") {
    return <>{children}</>;
  } else {
    // Redirect based on role
    if (effectiveRole === "admin") return <Navigate to="/admin" replace />;
    if (effectiveRole === "superadmin") return <Navigate to="/superadmin" replace />;
    if (effectiveRole === "employee" || effectiveRole === "client") return <Navigate to="/employee" replace />;
    return <Navigate to="/" replace />;
  }
}

// Employee Route Component
interface EmployeeRouteProps {
  children: ReactNode;
}

export function EmployeeRoute({ children }: EmployeeRouteProps) {
  const currentUser = useAuthStore((state) => state.user);
  const { userProfile, loading } = useUser();
  const [roleChecked, setRoleChecked] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fallback role check if UserContext is not ready
  useEffect(() => {
    const checkUserRole = async () => {
      if (!currentUser?.id) {
        setRoleChecked(true);
        return;
      }

      // If userProfile is already loaded, use it
      if (userProfile && !loading) {
        setUserRole(userProfile.role);
        setRoleChecked(true);
        return;
      }

      // Fallback: Direct API query
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/users/${currentUser.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUserRole(data.user.role || null);
          } else {
            setUserRole(null);
          }
        } else {
          console.error('Error fetching user role:', response.status, response.statusText);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole(null);
      } finally {
        setRoleChecked(true);
      }
    };

    checkUserRole();
  }, [currentUser?.id, userProfile, loading]);

  // Show loading while checking role
  if (!roleChecked || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9A00FF]"></div>
      </div>
    );
  }

  // Use userProfile role if available, otherwise use fallback role
  const effectiveRole = userProfile?.role || userRole;

  if (currentUser && (effectiveRole === "employee" || effectiveRole === "client" || effectiveRole === "product manager")) {
    return <>{children}</>;
  } else {
    // Redirect based on role
    if (effectiveRole === "admin") return <Navigate to="/admin" replace />;
    if (effectiveRole === "superadmin") return <Navigate to="/superadmin" replace />;
    if (effectiveRole === "user") return <Navigate to="/user" replace />;
    return <Navigate to="/" replace />;
  }
}

export default AdminRoute;
