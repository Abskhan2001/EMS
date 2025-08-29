import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { locationService } from '../services/userService';

// Define the Location interface based on the backend model
export interface OrganizationLocation {
  _id: string;
  id?: string; // For compatibility
  coordinates: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  name?: string;
  address?: string;
  isActive: boolean;
  workingHours: {
    start: string; // legacy
    end: string;   // legacy
    startHour: number;
    endHour: number;
    reliefMinutes: number; // grace period in minutes
  };

  contactInfo?: {
    phone?: string;
    email?: string;
    manager?: string;
  };
  metadata?: any;
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
}

interface OrganizationLocationState {
  location: OrganizationLocation | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: OrganizationLocationState = {
  location: null,
  isLoading: false,
  error: null,
};

// Async thunk to fetch organization location
export const fetchOrganizationLocation = createAsyncThunk(
  'organizationLocation/fetchLocation',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      let user = state.auth.user;

      // If user is not in Redux state, try to get from localStorage
      if (!user) {
        console.log('User not found in Redux state, checking localStorage...');
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            user = JSON.parse(userStr);
            console.log('User found in localStorage:', user);
          } catch (e) {
            console.error('Error parsing user from localStorage:', e);
          }
        }
      }

      if (!user) {
        throw new Error('User not found in state or localStorage');
      }

      // Handle both string and object organizationId formats
      let organizationId: string;
      if (typeof user.organizationId === 'string') {
        organizationId = user.organizationId;
      } else if (user.organizationId && user.organizationId._id) {
        organizationId = user.organizationId._id;
      } else {
        throw new Error('Organization ID not found in user data');
      }

      console.log('🌐 Calling locationService.getOrganizationLocations()...');
      const locationData = await locationService.getOrganizationLocations();
      console.log('📍 Location data received:', locationData);

      // Transform the API response - it returns an array, we need the first item
      if (locationData && Array.isArray(locationData) && locationData.length > 0) {
        const location = locationData[0];
        return {
          _id: location._id,
          id: location.id || location._id,
          coordinates: {
            latitude: location.coordinates?.latitude || 0,
            longitude: location.coordinates?.longitude || 0,
          },
          radius: location.radius || 0,
          name: location.name,
          address: location.address,
          isActive: location.isActive !== false,
          workingHours: location.workingHours || { start: "09:00", end: "17:00" },
          contactInfo: location.contactInfo,
          metadata: location.metadata,
          organizationId: typeof location.organizationId === 'string'
            ? location.organizationId
            : location.organizationId?._id || location.organizationId?.id,
          createdAt: location.createdAt,
          updatedAt: location.updatedAt,
        };
      }

      return null;
    } catch (error: any) {
      console.error('Error in fetchOrganizationLocation:', error);
      return rejectWithValue(error.message || 'Failed to fetch organization location');
    }
  }
);

const organizationLocationSlice = createSlice({
  name: 'organizationLocation',
  initialState,
  reducers: {
    setLocation: (state, action: PayloadAction<OrganizationLocation | null>) => {
      state.location = action.payload;
      state.error = null;
    },
    clearLocation: (state) => {
      state.location = null;
      state.error = null;
    },
    setLocationError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearLocationError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrganizationLocation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrganizationLocation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.location = action.payload;
        state.error = null;
      })
      .addCase(fetchOrganizationLocation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  setLocation, 
  clearLocation, 
  setLocationError, 
  clearLocationError 
} = organizationLocationSlice.actions;

export default organizationLocationSlice.reducer;
