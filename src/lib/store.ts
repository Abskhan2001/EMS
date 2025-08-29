
import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

// ✅ Authentication Store
interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  restoreSession: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,

  setUser: (user) => {
    set({ user });
    // Persist user data when setting user
    if (user) {
      localStorage.setItem('user_id', user.id);
      localStorage.setItem('user_email', user.email || '');
    }
  },

  isAuthenticated: false,

  initializeUser: () => {
    const sessionData = localStorage.getItem('supabaseSession');
    try {
      const session = sessionData ? JSON.parse(sessionData) : null;
      if (session?.user && session?.access_token) {
        set({ user: session.user });
        return true;
      }
    } catch (err) {
      console.error("Failed to initialize user from localStorage", err);
      localStorage.removeItem('supabaseSession');
    }
    return false;
  },

  restoreSession: () => {
    const sessionData = localStorage.getItem('supabaseSession');
    try {
      const parsedSession = sessionData ? JSON.parse(sessionData) : null;
      if (parsedSession?.user && parsedSession?.access_token) {
        // Check if the session is not expired
        const expiresAt = parsedSession.expires_at;
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (!expiresAt || currentTime < expiresAt) {
          set({ user: parsedSession.user });
          return true;
        } else {
          // Session expired, remove it
          localStorage.removeItem('supabaseSession');
          localStorage.removeItem('user_id');
          localStorage.removeItem('user_email');
        }
      }
    } catch (err) {
      console.error("Failed to parse session from localStorage", err);
      localStorage.removeItem('supabaseSession');
    }
    return false;
  },
}));




  





