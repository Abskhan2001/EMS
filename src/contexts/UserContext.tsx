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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile(null);
      } else {
        setUserProfile(data);
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