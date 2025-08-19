import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department: string;
  position: string;
  phone: string;
  address: string;
  hire_date: string;
  salary: number;
  created_at: string;
  updated_at: string;
  organization_id: string,
}

interface UserContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  refreshUserProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  userProfile: null,
  loading: true,
  setUserProfile: () => { },
  refreshUserProfile: async () => { },
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);

  const fetchUserProfile = async () => {
    if (!user?.id) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/users/${user.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          // Transform the data to match expected interface
          const transformedData = {
            id: result.user._id || result.user.id,
            email: result.user.email,
            full_name: result.user.fullName || result.user.full_name,
            role: result.user.role,
            department: result.user.department,
            position: result.user.position || '',
            phone: result.user.phone || '',
            address: result.user.address || '',
            hire_date: result.user.hireDate || result.user.hire_date || '',
            salary: result.user.salary || 0,
            created_at: result.user.createdAt || result.user.created_at,
            updated_at: result.user.updatedAt || result.user.updated_at,
            organization_id: result.user.organizationId || result.user.organization_id
          };
          setUserProfile(transformedData);
        } else {
          console.error('Error fetching user profile: Invalid response');
          setUserProfile(null);
        }
      } else {
        console.error('Error fetching user profile:', response.status, response.statusText);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserProfile = async () => {
    setLoading(true);
    await fetchUserProfile();
  };

  useEffect(() => {
    fetchUserProfile();
  }, [user?.id]);

  return (
    <UserContext.Provider value={{ userProfile, loading, refreshUserProfile, setUserProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};