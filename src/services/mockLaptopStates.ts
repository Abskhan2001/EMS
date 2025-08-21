/**
 * Mock Laptop States Service
 * Provides laptop state data without requiring database changes
 */

import type { LaptopState } from './laptopStateMonitor';

export interface MockLaptopStateData {
  user_id: string;
  state: LaptopState;
  timestamp: string;
  last_activity?: string;
  battery_level?: number;
  is_charging?: boolean;
  full_name?: string;
  email?: string;
}

// Cache to store generated states
const stateCache: Record<string, MockLaptopStateData> = {};

/**
 * Get mock laptop state for a user
 */
export function getMockLaptopState(userId: string): MockLaptopStateData {
  if (stateCache[userId]) {
    return stateCache[userId];
  }

  // Generate deterministic state based on user ID
  const hash = hashString(userId);
  const stateIndex = hash % 3;
  const state: LaptopState = ['On', 'Sleep', 'Off'][stateIndex];

  // Generate current realistic battery levels based on state
  let batteryLevel: number;
  let isCharging: boolean;

  switch (state) {
    case 'On':
      // Online users typically have 40-90% battery
      batteryLevel = 40 + (hash % 51);
      isCharging = batteryLevel < 50 ? (hash % 3) === 0 : (hash % 6) === 0;
      break;
    case 'Sleep':
      // Sleeping users might have lower battery
      batteryLevel = 25 + (hash % 65);
      isCharging = batteryLevel < 40 ? (hash % 2) === 0 : (hash % 8) === 0;
      break;
    case 'Off':
      // Offline users might have very low battery or be charging
      batteryLevel = 15 + (hash % 75);
      isCharging = batteryLevel < 30 ? (hash % 2) === 0 : false;
      break;
    default:
      batteryLevel = 50;
      isCharging = false;
  }

  const now = new Date();
  const timestamp = now.toISOString(); // Current time, not past time
  const lastActivity = now.toISOString(); // Current time for active status

  const mockState: MockLaptopStateData = {
    user_id: userId,
    state,
    timestamp,
    last_activity: lastActivity,
    battery_level: batteryLevel,
    is_charging: isCharging
  };

  stateCache[userId] = mockState;
  return mockState;
}

/**
 * Get mock laptop states for multiple users
 */
export function getMockLaptopStates(userIds: string[]): Record<string, MockLaptopStateData> {
  const result: Record<string, MockLaptopStateData> = {};

  userIds.forEach(userId => {
    result[userId] = getMockLaptopState(userId);
  });

  return result;
}

/**
 * Update mock laptop state
 */
export function updateMockLaptopState(userId: string, state: LaptopState): void {
  const existing = stateCache[userId] || getMockLaptopState(userId);

  stateCache[userId] = {
    ...existing,
    state,
    timestamp: new Date().toISOString()
  };
}

/**
 * Automatically update laptop states to simulate real activity
 */
export function updateLaptopStatesAutomatically(userIds: string[]): void {
  userIds.forEach(userId => {
    if (stateCache[userId]) {
      const currentState = stateCache[userId];
      const now = new Date();

      // Use a more predictable hash for consistent behavior
      const timeHash = hashString(userId + Math.floor(now.getTime() / (5 * 60 * 1000)).toString());
      const shouldChange = (timeHash % 20) === 0; // 5% chance to change state (more realistic)

      if (shouldChange) {
        // Make realistic state transitions
        let newState: LaptopState = currentState.state;

        switch (currentState.state) {
          case 'On':
            // Online can go to Sleep (80%) or Off (20%)
            newState = (timeHash % 5) === 0 ? 'Off' : 'Sleep';
            break;
          case 'Sleep':
            // Sleep can go to On (60%) or Off (40%)
            newState = (timeHash % 5) < 3 ? 'On' : 'Off';
            break;
          case 'Off':
            // Off can only go to On (when user returns)
            newState = 'On';
            break;
        }

        // Realistic battery changes
        let newBatteryLevel = currentState.battery_level || 50;
        let newIsCharging = currentState.is_charging || false;

        if (newState === 'Off') {
          // When off, battery drains slowly and not charging
          newBatteryLevel = Math.max(5, newBatteryLevel - Math.floor(Math.random() * 10));
          newIsCharging = false;
        } else if (newState === 'Sleep') {
          // When sleeping, battery drains slowly
          newBatteryLevel = Math.max(10, newBatteryLevel - Math.floor(Math.random() * 5));
          // Might start charging if battery is low
          newIsCharging = newBatteryLevel < 30 ? Math.random() > 0.5 : currentState.is_charging;
        } else {
          // When on, battery changes based on charging status
          if (newIsCharging || (newBatteryLevel < 20 && Math.random() > 0.3)) {
            // Charging: battery goes up
            newBatteryLevel = Math.min(100, newBatteryLevel + Math.floor(Math.random() * 15));
            newIsCharging = true;
            // Stop charging when near full
            if (newBatteryLevel > 90) newIsCharging = Math.random() > 0.7;
          } else {
            // Not charging: battery goes down slowly
            newBatteryLevel = Math.max(15, newBatteryLevel - Math.floor(Math.random() * 8));
          }
        }

        // Update the state with realistic changes
        stateCache[userId] = {
          ...currentState,
          state: newState,
          timestamp: now.toISOString(),
          last_activity: newState === 'On' ? now.toISOString() : currentState.last_activity,
          battery_level: newBatteryLevel,
          is_charging: newIsCharging
        };

        console.log(`User ${userId}: ${currentState.state} → ${newState} (Current Battery: ${newBatteryLevel}%${newIsCharging ? ' Charging' : ''})`);
      } else {
        // Update timestamp and slightly adjust battery for current status
        let currentBattery = currentState.battery_level || 50;
        let currentCharging = currentState.is_charging || false;

        // Small realistic battery changes even when state doesn't change
        if (currentCharging) {
          currentBattery = Math.min(100, currentBattery + Math.floor(Math.random() * 3));
          if (currentBattery > 95) currentCharging = false; // Stop charging when full
        } else {
          currentBattery = Math.max(10, currentBattery - Math.floor(Math.random() * 2));
          if (currentBattery < 20) currentCharging = Math.random() > 0.6; // Start charging when low
        }

        stateCache[userId] = {
          ...currentState,
          timestamp: now.toISOString(),
          last_activity: now.toISOString(),
          battery_level: currentBattery,
          is_charging: currentCharging
        };
      }
    }
  });
}

/**
 * Clear the state cache (useful for testing or resetting)
 */
export function clearLaptopStateCache(): void {
  Object.keys(stateCache).forEach(key => delete stateCache[key]);
  console.log('Laptop state cache cleared');
}

/**
 * Simple hash function
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}