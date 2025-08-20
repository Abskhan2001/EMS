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
      const userResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/users/${currentuser?.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error(`Failed to fetch user profile: ${userResponse.status}`);
      }

      const userResult = await userResponse.json();
      if (!userResult.success || !userResult.user) {
        throw new Error('Failed to fetch user profile');
      }

      const userprofile = {
        id: userResult.user._id || userResult.user.id,
        role: userResult.user.role,
        organizationId: userResult.user.organizationId || userResult.user.organization_id
      };

      // Then fetch all users from the same organization
      const usersResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/users?organizationId=${userprofile?.organizationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!usersResponse.ok) {
        throw new Error(`Failed to fetch users: ${usersResponse.status}`);
      }

      const usersResult = await usersResponse.json();
      const users = usersResult.success && usersResult.users ? usersResult.users : [];

      // Filter users: exclude current user
      let filteredusers = (users || []).filter((user) =>
        (user._id || user.id) !== currentuser?.id
      );

      // Transform user data to match expected format
      const transformedUsers = (filteredusers || []).map(user => ({
        id: user._id || user.id,
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