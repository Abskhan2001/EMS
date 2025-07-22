/**
 * Laptop State Monitor Service
 *
 * This service monitors laptop states using web browser APIs:
 * - Page Visibility API: Detects when tab/window becomes hidden (potential sleep/minimize)
 * - Online/Offline Events: Detects network connectivity changes
 * - Focus/Blur Events: Detects when window loses/gains focus
 * - Mouse/Keyboard Activity: Detects user activity
 * - Battery API: Detects power state changes (if available)
 */

import { supabase } from '../lib/supabase';

export type LaptopState = 'On' | 'Sleep' | 'Off';

interface LaptopStateData {
  user_id: string;
  state: LaptopState;
  timestamp: string;
  last_activity?: string;
  battery_level?: number;
  is_charging?: boolean;
}

class LaptopStateMonitor {
  private currentState: LaptopState = 'On';
  private userId: string | null = null;
  private lastActivity: Date = new Date();
  private activityTimeout: NodeJS.Timeout | null = null;
  private stateUpdateInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // Configuration
  private readonly ACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity = Sleep
  private readonly STATE_UPDATE_INTERVAL = 30 * 1000; // Update state every 30 seconds
  private readonly OFFLINE_TIMEOUT = 2 * 60 * 1000; // 2 minutes offline = Off

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize the laptop state monitoring
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.setupEventListeners();
    this.startStateUpdateInterval();

    // Create initial state immediately
    await this.createInitialState();

    this.isInitialized = true;

    console.log('Laptop State Monitor initialized for user:', this.userId);
  }

  /**
   * Create initial laptop state with real detection
   */
  private async createInitialState(): Promise<void> {
    try {
      // Detect real laptop state
      const realState = await this.detectRealLaptopState();

      // Update current state with real data
      await this.updateState(realState.state, realState.batteryLevel, realState.isCharging);

    } catch (error) {
      console.error('Error in createInitialState:', error);
      // Fallback to default state
      await this.updateState('On');
    }
  }

  /**
   * Detect real laptop state using browser APIs
   */
  private async detectRealLaptopState(): Promise<{state: LaptopState, batteryLevel?: number, isCharging?: boolean}> {
    let batteryLevel: number | undefined;
    let isCharging: boolean | undefined;

    try {
      // Get real battery information
      // @ts-ignore - Battery API is experimental
      if ('getBattery' in navigator) {
        // @ts-ignore
        const battery = await navigator.getBattery();
        batteryLevel = Math.round(battery.level * 100);
        isCharging = battery.charging;
        console.log(`Real battery detected: ${batteryLevel}% ${isCharging ? '(Charging)' : '(Not charging)'}`);
      }
    } catch (error) {
      console.log('Battery API not available, using defaults');
    }

    // Determine state based on page visibility and activity
    let state: LaptopState = 'On';

    if (document.hidden) {
      state = 'Sleep';
    } else if (!navigator.onLine) {
      state = 'Off';
    } else {
      state = 'On';
    }

    console.log(`Real laptop state detected: ${state}`);

    return {
      state,
      batteryLevel,
      isCharging
    };
  }

  /**
   * Cleanup and stop monitoring
   */
  public destroy(): void {
    this.removeEventListeners();

    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }

    if (this.stateUpdateInterval) {
      clearInterval(this.stateUpdateInterval);
    }

    this.isInitialized = false;
    console.log('Laptop State Monitor destroyed');
  }

  /**
   * Setup all event listeners for state detection
   */
  private setupEventListeners(): void {
    // Page Visibility API - detects tab/window visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Online/Offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Window focus/blur events
    window.addEventListener('focus', this.handleWindowFocus.bind(this));
    window.addEventListener('blur', this.handleWindowBlur.bind(this));

    // User activity events
    document.addEventListener('mousemove', this.handleUserActivity.bind(this));
    document.addEventListener('keydown', this.handleUserActivity.bind(this));
    document.addEventListener('click', this.handleUserActivity.bind(this));
    document.addEventListener('scroll', this.handleUserActivity.bind(this));

    // Beforeunload event - detect when user is closing/refreshing
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  /**
   * Remove all event listeners
   */
  private removeEventListeners(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    window.removeEventListener('focus', this.handleWindowFocus.bind(this));
    window.removeEventListener('blur', this.handleWindowBlur.bind(this));
    document.removeEventListener('mousemove', this.handleUserActivity.bind(this));
    document.removeEventListener('keydown', this.handleUserActivity.bind(this));
    document.removeEventListener('click', this.handleUserActivity.bind(this));
    document.removeEventListener('scroll', this.handleUserActivity.bind(this));
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  /**
   * Handle page visibility changes
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page is hidden - could indicate sleep or minimize
      this.scheduleStateCheck('Sleep', 1000); // Check after 1 second
    } else {
      // Page is visible again
      this.updateState('On');
      this.resetActivityTimer();
    }
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.updateState('On');
    this.resetActivityTimer();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    // Schedule a check to see if we should mark as "Off" after timeout
    setTimeout(() => {
      if (!navigator.onLine) {
        this.updateState('Off');
      }
    }, this.OFFLINE_TIMEOUT);
  }

  /**
   * Handle window focus
   */
  private handleWindowFocus(): void {
    this.updateState('On');
    this.resetActivityTimer();
  }

  /**
   * Handle window blur
   */
  private handleWindowBlur(): void {
    // Don't immediately change state, just schedule a check
    this.scheduleStateCheck('Sleep', 5000); // Check after 5 seconds
  }

  /**
   * Handle user activity
   */
  private async handleUserActivity(): Promise<void> {
    this.lastActivity = new Date();

    if (this.currentState !== 'On') {
      // Get real battery info when becoming active
      const realState = await this.detectRealLaptopState();
      this.updateState('On', realState.batteryLevel, realState.isCharging);
    }

    this.resetActivityTimer();
  }

  /**
   * Handle before unload (page closing/refreshing)
   */
  private handleBeforeUnload(): void {
    // Don't mark as Off immediately, as user might be refreshing
    // The state will be updated by the interval check
  }

  /**
   * Reset the activity timer
   */
  private resetActivityTimer(): void {
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }

    this.activityTimeout = setTimeout(() => {
      this.updateState('Sleep');
    }, this.ACTIVITY_TIMEOUT);
  }

  /**
   * Schedule a state check after a delay
   */
  private scheduleStateCheck(targetState: LaptopState, delay: number): void {
    setTimeout(() => {
      // Only update if conditions are still met
      if (targetState === 'Sleep' && (document.hidden || !document.hasFocus())) {
        this.updateState('Sleep');
      }
    }, delay);
  }

  /**
   * Start the periodic state update interval
   */
  private startStateUpdateInterval(): void {
    this.stateUpdateInterval = setInterval(() => {
      this.checkAndUpdateState();
    }, this.STATE_UPDATE_INTERVAL);
  }

  /**
   * Check current conditions and update state accordingly
   */
  private checkAndUpdateState(): void {
    const now = new Date();
    const timeSinceActivity = now.getTime() - this.lastActivity.getTime();

    // Check if offline for too long
    if (!navigator.onLine) {
      this.updateState('Off');
      return;
    }

    // Check if inactive for too long
    if (timeSinceActivity > this.ACTIVITY_TIMEOUT) {
      this.updateState('Sleep');
      return;
    }

    // Check if page is hidden
    if (document.hidden) {
      this.updateState('Sleep');
      return;
    }

    // Otherwise, should be On
    if (this.currentState !== 'On') {
      this.updateState('On');
    }
  }

  /**
   * Update the laptop state
   */
  private async updateState(newState: LaptopState, batteryLevel?: number, isCharging?: boolean): Promise<void> {
    const previousState = this.currentState;
    this.currentState = newState;

    console.log(`Laptop state: ${newState} (Battery: ${batteryLevel || 'unknown'}%${isCharging ? ' Charging' : ''})`);

    // Get real battery info if not provided
    if (batteryLevel === undefined || isCharging === undefined) {
      try {
        // @ts-ignore - Battery API is experimental
        if ('getBattery' in navigator) {
          // @ts-ignore
          const battery = await navigator.getBattery();
          batteryLevel = batteryLevel || Math.round(battery.level * 100);
          isCharging = isCharging !== undefined ? isCharging : battery.charging;
        }
      } catch (error) {
        // Battery API not available or failed
      }
    }

    const stateData: LaptopStateData = {
      user_id: this.userId!,
      state: newState,
      timestamp: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      battery_level: batteryLevel,
      is_charging: isCharging,
    };

    // Save to database (or mock storage)
    await this.saveLaptopState(stateData);
  }

  /**
   * Save laptop state to database
   */
  private async saveLaptopState(stateData: LaptopStateData): Promise<void> {
    try {
      const { error } = await supabase
        .from('laptop_states')
        .upsert({
          user_id: stateData.user_id,
          state: stateData.state,
          timestamp: stateData.timestamp,
          last_activity: stateData.last_activity,
          battery_level: stateData.battery_level,
          is_charging: stateData.is_charging,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving laptop state:', error);
      }
    } catch (error) {
      console.error('Error saving laptop state:', error);
    }
  }

  /**
   * Get current laptop state
   */
  public getCurrentState(): LaptopState {
    return this.currentState;
  }

  /**
   * Manually set laptop state (for testing or admin override)
   */
  public async setManualState(state: LaptopState): Promise<void> {
    await this.updateState(state);
  }
}

export default LaptopStateMonitor;