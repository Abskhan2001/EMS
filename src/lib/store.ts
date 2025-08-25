
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




  

// ✅ Attendance Store
type WorkMode = 'on_site' | 'remote' | null;

interface AttendanceState {
  isCheckedIn: boolean;
  checkInTime: string | null;
  isOnBreak: boolean;
  breakStartTime: string | null;
  isRemoteCheckedIn: boolean;
  RemotecheckInTime: string | null;
  isOnRemoteBreak: boolean;
  RemotebreakStartTime: string | null;
  RemoteworkMode: 'on_site' | 'remote' | null;
  workMode: 'on_site' | 'remote' | null;

  setCheckIn: (time: string | null) => void;
  setBreakTime: (time: string | null) => void;
  setWorkMode: (mode: 'on_site' | 'remote' | null) => void;
  setIsCheckedIn: (status: boolean) => void;
  setIsOnBreak: (status: boolean) => void;
  setRemoteCheckIn: (time: string | null) => void;
  setRemoteBreakTime: (time: string | null) => void;
  setRemoteWorkMode: (mode: 'on_site' | 'remote' | null) => void;
  setIsRemoteCheckedIn: (status: boolean) => void;
  setIsOnRemoteBreak: (status: boolean) => void;
}

// interface AttendanceState {
//   // On-site
//   isCheckedIn: boolean;
//   checkInTime: string | null;
//   isOnBreak: boolean;
//   breakStartTime: string | null;
//   workMode: WorkMode;

//   // Remote
//   isRemoteCheckedIn: boolean;
//   remoteCheckInTime: string | null;
//   isOnRemoteBreak: boolean;
//   remoteBreakStartTime: string | null;
//   remoteWorkMode: WorkMode;

//   // Setters
//   setIsCheckedIn: (status: boolean) => void;
//   setCheckInTime: (time: string | null) => void;
//   setIsOnBreak: (status: boolean) => void;
//   setBreakStartTime: (time: string | null) => void;
//   setWorkMode: (mode: WorkMode) => void;

//   setIsRemoteCheckedIn: (status: boolean) => void;
//   setRemoteCheckInTime: (time: string | null) => void;
//   setIsOnRemoteBreak: (status: boolean) => void;
//   setRemoteBreakStartTime: (time: string | null) => void;
//   setRemoteWorkMode: (mode: WorkMode) => void;
// }

// / ✅ Attendance Store
export const useAttendanceStore = create<AttendanceState>((set) => ({
  isCheckedIn: false,
  checkInTime: null,
  isOnBreak: false,
  breakStartTime: null,
  workMode: null,
  isRemoteCheckedIn: false,
  RemotecheckInTime: null,
  isOnRemoteBreak: false,
  RemotebreakStartTime: null,
  RemoteworkMode: null,

  setCheckIn: (time) => set({ checkInTime: time }),
  setBreakTime: (time) => set({ breakStartTime: time }),
  setWorkMode: (mode) => set({ workMode: mode }),
  setIsCheckedIn: (status) => set({ isCheckedIn: status }),
  setIsOnBreak: (status) => set({ isOnBreak: status }),

  // ✅ Corrected Remote State Updates
  setRemoteCheckIn: (time) => set({ RemotecheckInTime: time }),
  setRemoteBreakTime: (time) => set({ RemotebreakStartTime: time }),
  setRemoteWorkMode: (mode) => set({ RemoteworkMode: mode }),
  setIsRemoteCheckedIn: (status) => set({ isRemoteCheckedIn: status }),
  setIsOnRemoteBreak: (status) => set({ isOnRemoteBreak: status }),
}));

