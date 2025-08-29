import { AttendanceLocation, LocationCheckResult, AttendanceRecord } from '../slices/attendanceSlice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1';

// Get authentication token from localStorage (supports both legacy and new keys)
const getAuthToken = (): string => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found. Please login again.');
  }
  return token;
};

// Create headers with authentication
const createAuthHeaders = (): HeadersInit => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`,
  };
};

// Handle API response with timeout
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Create fetch with timeout
const fetchWithTimeout = (url: string, options: RequestInit, timeout = 8000): Promise<Response> => {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
};

// Location Services
export const locationService = {
  // Get user's current location using browser geolocation API (optimized for speed)
  getCurrentLocation: (): Promise<AttendanceLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options = {
        enableHighAccuracy: false, // Use network location (faster)
        timeout: 5000, // Reduce timeout to 5 seconds
        maximumAge: 60000, // Use cached location up to 1 minute old
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        options
      );
    });
  },

  // Fast location check - tries network location first, falls back to GPS
  getFastLocation: (): Promise<AttendanceLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      // First try: Fast network-based location
      const fastOptions = {
        enableHighAccuracy: false, // Use network location (faster)
        timeout: 3000, // Quick timeout
        maximumAge: 30000, // Use cached location up to 30 seconds old
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          // If fast location fails, try with GPS as fallback
          console.warn('Fast location failed, trying GPS...', error);

          const gpsOptions = {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 60000,
          };

          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            },
            (gpsError) => {
              let errorMessage = 'Failed to get location';
              switch (gpsError.code) {
                case gpsError.PERMISSION_DENIED:
                  errorMessage = 'Location access denied by user';
                  break;
                case gpsError.POSITION_UNAVAILABLE:
                  errorMessage = 'Location information is unavailable';
                  break;
                case gpsError.TIMEOUT:
                  errorMessage = 'Location request timed out';
                  break;
              }
              reject(new Error(errorMessage));
            },
            gpsOptions
          );
        },
        fastOptions
      );
    });
  },

  // Check if user is within organization location (with timeout)
  checkUserLocation: async (coordinates: AttendanceLocation): Promise<LocationCheckResult> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/location/check`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }),
      }, 5000); // 5 second timeout for location check

      return await handleResponse(response);
    } catch (error: any) {
      throw new Error(`Location check failed: ${error.message}`);
    }
  },

  // Get organization locations
  getOrganizationLocations: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/location`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      return await handleResponse(response);
    } catch (error: any) {
      throw new Error(`Failed to get organization locations: ${error.message}`);
    }
  },
};

// Attendance Services
export const attendanceService = {
  // Get current attendance status
  getCurrentAttendance: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/current`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      return await handleResponse(response);
    } catch (error: any) {
      throw new Error(`Failed to get current attendance: ${error.message}`);
    }
  },

  // Check in
  checkIn: async (checkInData: {
    workMode: 'on_site' | 'remote';
    latitude: number;
    longitude: number;
    locationId?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; attendance: AttendanceRecord }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/check-in`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify(checkInData),
      });

      return await handleResponse(response);
    } catch (error: any) {
      throw new Error(`Check-in failed: ${error.message}`);
    }
  },

  // Check out
  checkOut: async (checkOutData: {
    attendanceId: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
  }): Promise<{ success: boolean; message: string; attendance: AttendanceRecord }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/check-out/${checkOutData.attendanceId}`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          latitude: checkOutData.latitude,
          longitude: checkOutData.longitude,
          notes: checkOutData.notes,
        }),
      });

      return await handleResponse(response);
    } catch (error: any) {
      throw new Error(`Check-out failed: ${error.message}`);
    }
  },

  // Get attendance history
  getAttendanceHistory: async (params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    workMode?: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = `${API_BASE_URL}/attendance/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      return await handleResponse(response);
    } catch (error: any) {
      throw new Error(`Failed to get attendance history: ${error.message}`);
    }
  },

  // Get attendance statistics
  getAttendanceStats: async (params?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = `${API_BASE_URL}/attendance/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      return await handleResponse(response);
    } catch (error: any) {
      throw new Error(`Failed to get attendance statistics: ${error.message}`);
    }
  },
};

// Combined service for attendance workflow
export const attendanceWorkflowService = {
  // Complete check-in workflow with location verification
  performCheckIn: async (notes?: string): Promise<{
    success: boolean;
    message: string;
    attendance: AttendanceRecord;
    workMode: 'on_site' | 'remote';
  }> => {
    try {
      // Step 1: Get user's current location (optimized for speed)
      console.log('🔍 Getting user location...');
      const startTime = Date.now();
      const coordinates = await locationService.getFastLocation();
      console.log(`📍 Location obtained in ${Date.now() - startTime}ms`);

      // Step 2: Check if user is within organization location
      console.log('🌐 Checking location against organization...');
      const locationStartTime = Date.now();
      const locationCheck = await locationService.checkUserLocation(coordinates);
      console.log(`✅ Location check completed in ${Date.now() - locationStartTime}ms`);

      // Step 3: Determine work mode and location ID
      const workMode: 'on_site' | 'remote' = locationCheck.status === 'onsite' ? 'on_site' : 'remote';
      const locationId = locationCheck.location?._id;

      // Step 4: Perform check-in
      console.log('⏰ Performing check-in...');
      const checkInStartTime = Date.now();
      const checkInData = {
        workMode,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        locationId,
        notes,
      };

      const result = await attendanceService.checkIn(checkInData);
      console.log(`✅ Check-in completed in ${Date.now() - checkInStartTime}ms`);
      console.log(`🎯 Total workflow time: ${Date.now() - startTime}ms`);

      return {
        ...result,
        workMode,
      };
    } catch (error: any) {
      throw new Error(`Check-in workflow failed: ${error.message}`);
    }
  },

  // Complete check-out workflow
  performCheckOut: async (attendanceId: string, notes?: string): Promise<{
    success: boolean;
    message: string;
    attendance: AttendanceRecord;
  }> => {
    try {
      // Get current location for check-out (fast method)
      let coordinates: AttendanceLocation | undefined;
      try {
        coordinates = await locationService.getFastLocation();
      } catch (locationError) {
        // Location is optional for check-out, continue without it
        console.warn('Could not get location for check-out:', locationError);
      }

      const checkOutData = {
        attendanceId,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        notes,
      };

      return await attendanceService.checkOut(checkOutData);
    } catch (error: any) {
      throw new Error(`Check-out workflow failed: ${error.message}`);
    }
  },
};

// Export all services
export default {
  location: locationService,
  attendance: attendanceService,
  workflow: attendanceWorkflowService,
};
