// Import our API client instead of Supabase
import { apiClient, handleApiError as handleSupabaseError, withRetry, checkConnection } from './apiClient';
import { websocketService, createRealtimeChannel } from '../services/websocketService';
import { authService } from '../services/authService';

// Declare global auth state callbacks
declare global {
  interface Window {
    authStateCallbacks?: Array<(event: string, session: any) => void>;
  }
}

// Helper function to trigger auth state changes
const triggerAuthStateChange = (event: string, session: any) => {
  if (window.authStateCallbacks) {
    window.authStateCallbacks.forEach(callback => {
      try {
        callback(event, session);
      } catch (error) {
        console.error('Error in auth state callback:', error);
      }
    });
  }
};

// Enhanced API client with WebSocket support
const enhancedApiClient = {
  ...apiClient,

  // Add auth methods
  auth: {
    signUp: authService.signUp.bind(authService),
    signInWithPassword: authService.signInWithPassword.bind(authService),
    signOut: authService.signOut.bind(authService),
    getSession: authService.getSession.bind(authService),
    
    // Auth state change listener (compatibility method)
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Store the callback for later use
      if (!window.authStateCallbacks) {
        window.authStateCallbacks = [];
      }
      window.authStateCallbacks.push(callback);

      // Return subscription object for compatibility
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              if (window.authStateCallbacks) {
                const index = window.authStateCallbacks.indexOf(callback);
                if (index > -1) {
                  window.authStateCallbacks.splice(index, 1);
                }
              }
            }
          }
        }
      };
    },

    // Get current user
    getUser: async () => {
      const { data: { session } } = await authService.getSession();
      return {
        data: { user: session?.user || null },
        error: null
      };
    }
  },

  // Add WebSocket channel functionality
  channel: (channelName: string) => {
    return createRealtimeChannel(channelName);
  },

  // Add removeChannel method for compatibility
  removeChannel: (channel: any) => {
    if (channel && typeof channel.unsubscribe === 'function') {
      channel.unsubscribe();
    }
  },

  // Initialize WebSocket connection
  connect: () => {
    return websocketService.connect();
  },

  // Disconnect WebSocket
  disconnect: () => {
    websocketService.disconnect();
  }
};

// Export the enhanced API client as supabase for backward compatibility
export const supabase = enhancedApiClient;

// Create admin client with additional admin methods
export const supabaseAdmin = {
  ...apiClient,
  auth: {
    ...apiClient.auth,
    admin: {
      createUser: async (userData: any) => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/auth/admin/create-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify(userData)
          });

          const data = await response.json();

          if (!response.ok) {
            return { data: null, error: new Error(data.message || 'Failed to create user') };
          }

          return {
            data: {
              user: {
                id: data.data.user.id,
                email: data.data.user.email,
                ...data.data.user
              }
            },
            error: null
          };
        } catch (error: any) {
          return { data: null, error: new Error(error.message || 'Failed to create user') };
        }
      },

      deleteUser: async (userId: string) => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/auth/admin/delete-user/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
          });

          if (!response.ok) {
            const data = await response.json();
            return { error: new Error(data.message || 'Failed to delete user') };
          }

          return { error: null };
        } catch (error: any) {
          return { error: new Error(error.message || 'Failed to delete user') };
        }
      },

      inviteUserByEmail: async (email: string, options?: any) => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/auth/admin/invite-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({ email, ...options })
          });

          if (!response.ok) {
            const data = await response.json();
            return { error: new Error(data.message || 'Failed to invite user') };
          }

          return { error: null };
        } catch (error: any) {
          return { error: new Error(error.message || 'Failed to invite user') };
        }
      }
    }
  }
};

// Export utility functions from apiClient
export { handleSupabaseError, withRetry, checkConnection };
