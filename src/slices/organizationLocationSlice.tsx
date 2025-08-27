import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getLocation } from '../services/adminService';

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
    start: string;
    end: string;
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
  loading: boolean;
  error: string | null;
}

const initialState: OrganizationLocationState = {
  location: null,
  loading: false,
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

      const locationData = await getLocation();
      return locationData;
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
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrganizationLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.location = action.payload;
        state.error = null;
      })
      .addCase(fetchOrganizationLocation.rejected, (state, action) => {
        state.loading = false;
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
