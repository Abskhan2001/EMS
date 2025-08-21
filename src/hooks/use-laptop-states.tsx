import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { LaptopState } from '../services/laptopStateMonitor';
import { getAllLaptopStatuses, setupActivityTracking, clearAllLaptopStatusCache, simulateUserActivity } from '../services/attendanceLaptopStatus';

interface LaptopStateRecord {
  user_id: string;
  full_name: string;
  email: string;
  state: LaptopState;
  timestamp: string;
  last_activity?: string;
  battery_level?: number;
  is_charging?: boolean;
}

interface UseLaptopStatesReturn {
  laptopStates: Record<string, LaptopStateRecord>;
  loading: boolean;
  error: string | null;
  refreshLaptopStates: () => Promise<void>;
}

export const useLaptopStates = (organizationId?: string): UseLaptopStatesReturn => {
  const [laptopStates, setLaptopStates] = useState<Record<string, LaptopStateRecord>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [checkedInUsers, setCheckedInUsers] = useState<string[]>([]);

  const fetchLaptopStates = useCallback(async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      setError(null);

      // Get current user ID from auth
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // Setup activity tracking for all users
      setupActivityTracking();

      // Get all laptop statuses based on attendance
      const laptopStatuses = await getAllLaptopStatuses(organizationId);

      // Get user details
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('organization_id', organizationId);

      if (usersError) {
        console.error('Error fetching users:', usersError);
        setLaptopStates({});
        return;
      }

      // Create states map with REAL data for current user, realistic for others
      const statesMap: Record<string, LaptopStateRecord> = {};

      for (const userData of usersData || []) {
        const laptopStatus = laptopStatuses[userData.id];

        if (laptopStatus && laptopStatus.is_checked_in) {
          // User is checked in - show their laptop status
          if (userData.id === currentUserId) {
            // FOR CURRENT USER: Show real-time status with real battery
            let realBatteryLevel: number | undefined;
            let realIsCharging: boolean | undefined;

            try {
              // @ts-ignore - Battery API is experimental
              if ('getBattery' in navigator) {
                // @ts-ignore
                const battery = await navigator.getBattery();
                realBatteryLevel = Math.round(battery.level * 100);
                realIsCharging = battery.charging;
              }
            } catch (error) {
              console.log('Battery API not available');
            }

            // Get REAL current status (only if checked in)
            let realState: LaptopState;
            if (!navigator.onLine) {
              realState = 'Off';
              console.log('🔴 YOU ARE OFFLINE');
            } else if (document.hidden) {
              realState = 'Sleep';
              console.log('🟡 YOU ARE AWAY (tab hidden)');
            } else {
              realState = 'On';
              console.log('🟢 YOU ARE ONLINE (active)');
            }

            statesMap[userData.id] = {
              user_id: userData.id,
              full_name: userData.full_name,
              email: userData.email,
              state: realState,
              timestamp: new Date().toISOString(),
              last_activity: new Date().toISOString(),
              battery_level: realBatteryLevel,
              is_charging: realIsCharging,
            };

            console.log(`🔥 YOUR REAL STATUS (CHECKED IN): ${realState} | Battery: ${realBatteryLevel}%${realIsCharging ? ' (Charging)' : ''}`);
          } else {
            // FOR OTHER CHECKED-IN USERS: Use their laptop status
            statesMap[userData.id] = {
              user_id: userData.id,
              full_name: userData.full_name,
              email: userData.email,
              state: laptopStatus.laptop_state,
              timestamp: laptopStatus.last_activity,
              last_activity: laptopStatus.last_activity,
              battery_level: laptopStatus.battery_level || 75,
              is_charging: laptopStatus.is_charging || false,
            };
          }
        } else {
          // User is NOT checked in - show as offline
          statesMap[userData.id] = {
            user_id: userData.id,
            full_name: userData.full_name,
            email: userData.email,
            state: 'Off',
            timestamp: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            battery_level: 0,
            is_charging: false,
          };
        }
      }

      console.log(`📊 Loaded laptop states for ${Object.keys(statesMap).length} users (including real data)`);
      setLaptopStates(statesMap);

      // Store checked-in users for periodic updates
      const checkedInUserIds = Object.values(statesMap)
        .filter(state => state.state !== 'Off' || state.battery_level !== 0)
        .map(state => state.user_id);

      setCheckedInUsers(checkedInUserIds);

      if (checkedInUserIds.length > 0) {
        simulateUserActivity(checkedInUserIds);
      }
    } catch (err) {
      console.error('Error fetching laptop states:', err);
      setLaptopStates({});
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const refreshLaptopStates = useCallback(async () => {
    await fetchLaptopStates();
  }, [fetchLaptopStates]);

  useEffect(() => {
    // Clear wrong cached data to show correct status
    clearAllLaptopStatusCache();
    fetchLaptopStates();
  }, [fetchLaptopStates]);

  // Real-time laptop state detection for current user
  useEffect(() => {
    if (!organizationId) return;

    let currentUserId: string | undefined;

    // Get current user ID
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    };
    getCurrentUser();

    // Update current user activity and refresh display
    const updateCurrentUserState = async () => {
      if (currentUserId) {
        // Activity tracking is handled automatically by event listeners
        fetchLaptopStates(); // Just refresh display
      }
    };

    // Throttle updates to prevent too many rapid calls
    const throttledUpdate = () => {
      const now = Date.now();
      if (now - lastUpdate > 1000) { // Only update once per second
        setLastUpdate(now);
        updateCurrentUserState();
      }
    };

    // Update state immediately when page visibility changes
    const handleVisibilityChange = () => {
      console.log('🔄 Page visibility changed:', document.hidden ? 'AWAY (hidden)' : 'ONLINE (visible)');
      updateCurrentUserState(); // Update immediately for visibility changes
    };

    // Update state when online/offline status changes
    const handleOnlineStatusChange = () => {
      console.log('🔄 Network status changed:', navigator.onLine ? 'ONLINE' : 'OFFLINE');
      updateCurrentUserState(); // Update immediately for network changes
    };

    // Update state when user becomes active (throttled)
    const handleUserActivity = () => {
      throttledUpdate();
    };

    // Add event listeners for real-time detection
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    // Throttled activity listeners
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('click', handleUserActivity);

    return () => {
      // Cleanup event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
      document.removeEventListener('mousemove', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('click', handleUserActivity);
    };
  }, [organizationId, fetchLaptopStates, lastUpdate]);

  // Periodic activity simulation for realistic status changes
  useEffect(() => {
    if (!organizationId || checkedInUsers.length === 0) return;

    const interval = setInterval(() => {
      console.log('🔄 Simulating user activity changes...');
      simulateUserActivity(checkedInUsers);
      fetchLaptopStates(); // Refresh display
    }, 2 * 60 * 1000); // Every 2 minutes

    return () => {
      clearInterval(interval);
    };
  }, [organizationId, checkedInUsers, fetchLaptopStates]);

  return {
    laptopStates,
    loading,
    error,
    refreshLaptopStates,
  };
};

export default useLaptopStates;