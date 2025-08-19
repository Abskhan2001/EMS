import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from './supabase';
import { useAuthStore } from './store';
import { useUser } from '../contexts/UserContext';

// Define the shape of the context data
interface UserType {
  chatUsers: any[];
}

// Create the context with a default value
const MyContext = createContext<UserType | undefined>(undefined);

// Create a provider component
interface MyProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<MyProviderProps> = ({ children }) => {
  const [chatUsers, setChatUsers] = useState<any[]>([]);

  const currentuser = useAuthStore((state) => state.user);

  async function fetchAllUsers() {
    try {
      // First, get the current user's profile to get their organization_id
      const { data: userprofile, error: profileerror } = await supabase
        .from("users")
        .select("id, role, organizationId")
        .eq("id", currentuser?.id)
        .single();

      if (profileerror) throw profileerror;

      // Then fetch all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;

      // Filter users: exclude current user AND only include users from same organization
      let filteredusers = users.filter((user) =>
        user.id !== currentuser?.id &&
        (user.organizationId || user.organization_id) === (userprofile?.organizationId || userprofile?.organization_id)
      );

      // Transform user data to match expected format
      const transformedUsers = filteredusers.map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.fullName || user.full_name,
        role: user.role,
        department: user.department,
        organization_id: user.organizationId || user.organization_id,
        profile_image: user.profileImage || user.profile_image,
        created_at: user.createdAt || user.created_at,
        updated_at: user.updatedAt || user.updated_at
      }));

      console.log(transformedUsers);
      setChatUsers(transformedUsers);
      console.log(`Total users fetched: ${transformedUsers?.length || 0}`);
    } catch (error) {
      console.error('Error fetching users:', error);
      setChatUsers([]);
    }
  }

  useEffect(() => {
    if (currentuser?.id) {
      fetchAllUsers();
    }
  }, [currentuser?.id]);

  return (
    <MyContext.Provider value={{ chatUsers }}>
      {children}
    </MyContext.Provider>
  );
};

// Create a custom hook for consuming the context
export const useUserContext = (): UserType => {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};