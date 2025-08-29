import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { attendanceService, locationService, attendanceWorkflowService } from '../services/userService';

// Types
export interface AttendanceLocation {
  latitude: number;
  longitude: number;
}

export interface AttendanceRecord {
  _id: string;
  userId: string;
  organizationId: string;
  locationId?: string;
  checkIn: string;
  checkOut?: string;
  workMode: 'on_site' | 'remote';
  coordinates: {
    checkIn: AttendanceLocation;
    checkOut?: AttendanceLocation;
  };
  status: 'present' | 'late' | 'absent';
  totalHours: number;
  breakTime: number;
  workingHours: number;
  notes?: string;
  adminNotes?: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationCheckResult {
  status: 'onsite' | 'remote';
  location?: {
    _id: string;
    name: string;
    address: string;
  };
}

export interface AttendanceState {
  currentAttendance: AttendanceRecord | null;
  attendanceStatus: 'not_checked_in' | 'checked_in' | 'checked_out';
  locationStatus: LocationCheckResult | null;
  isLoading: boolean;
  isCheckingLocation: boolean;
  isCheckingIn: boolean;
  isCheckingOut: boolean;
  error: string | null;
  lastLocationCheck: number | null;

  // Legacy state for old pages compatibility
  isCheckedIn: boolean;
  checkInTime: string | null;
  isOnBreak: boolean;
  breakStartTime: string | null;
  workMode: 'on_site' | 'remote' | null;
  isRemoteCheckedIn: boolean;
  RemotecheckInTime: string | null;
  isOnRemoteBreak: boolean;
  RemotebreakStartTime: string | null;
  RemoteworkMode: 'on_site' | 'remote' | null;
}

const initialState: AttendanceState = {
  currentAttendance: null,
  attendanceStatus: 'not_checked_in',
  locationStatus: null,
  isLoading: false,
  isCheckingLocation: false,
  isCheckingIn: false,
  isCheckingOut: false,
  error: null,
  lastLocationCheck: null,

  // Legacy state for old pages compatibility
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
};

// Async thunks
export const checkUserLocation = createAsyncThunk(
  'attendance/checkUserLocation',
  async (coordinates: AttendanceLocation, { rejectWithValue }) => {
    try {
      return await locationService.checkUserLocation(coordinates);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const getCurrentLocation = createAsyncThunk(
  'attendance/getCurrentLocation',
  async (_, { rejectWithValue }) => {
    try {
      return await locationService.getCurrentLocation();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const getCurrentAttendance = createAsyncThunk(
  'attendance/getCurrentAttendance',
  async (_, { rejectWithValue }) => {
    try {
      return await attendanceService.getCurrentAttendance();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const performCheckIn = createAsyncThunk(
  'attendance/performCheckIn',
  async (notes: string | undefined, { rejectWithValue }) => {
    try {
      return await attendanceWorkflowService.performCheckIn(notes);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const performCheckOut = createAsyncThunk(
  'attendance/performCheckOut',
  async ({ attendanceId, notes }: { attendanceId: string; notes?: string }, { rejectWithValue }) => {
    try {
      return await attendanceWorkflowService.performCheckOut(attendanceId, notes);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetLocationStatus: (state) => {
      state.locationStatus = null;
      state.lastLocationCheck = null;
    },
    setAttendanceStatus: (state, action: PayloadAction<'not_checked_in' | 'checked_in' | 'checked_out'>) => {
      state.attendanceStatus = action.payload;
    },

    // Legacy reducers for old pages compatibility
    setCheckIn: (state, action: PayloadAction<string | null>) => {
      state.checkInTime = action.payload;
    },
    setBreakTime: (state, action: PayloadAction<string | null>) => {
      state.breakStartTime = action.payload;
    },
    setWorkMode: (state, action: PayloadAction<'on_site' | 'remote' | null>) => {
      state.workMode = action.payload;
    },
    setIsCheckedIn: (state, action: PayloadAction<boolean>) => {
      state.isCheckedIn = action.payload;
    },
    setIsOnBreak: (state, action: PayloadAction<boolean>) => {
      state.isOnBreak = action.payload;
    },
    setRemoteCheckIn: (state, action: PayloadAction<string | null>) => {
      state.RemotecheckInTime = action.payload;
    },
    setRemoteBreakTime: (state, action: PayloadAction<string | null>) => {
      state.RemotebreakStartTime = action.payload;
    },
    setRemoteWorkMode: (state, action: PayloadAction<'on_site' | 'remote' | null>) => {
      state.RemoteworkMode = action.payload;
    },
    setIsRemoteCheckedIn: (state, action: PayloadAction<boolean>) => {
      state.isRemoteCheckedIn = action.payload;
    },
    setIsOnRemoteBreak: (state, action: PayloadAction<boolean>) => {
      state.isOnRemoteBreak = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Check user location
    builder
      .addCase(checkUserLocation.pending, (state) => {
        state.isCheckingLocation = true;
        state.error = null;
      })
      .addCase(checkUserLocation.fulfilled, (state, action) => {
        state.isCheckingLocation = false;
        state.locationStatus = action.payload;
        state.lastLocationCheck = Date.now();
      })
      .addCase(checkUserLocation.rejected, (state, action) => {
        state.isCheckingLocation = false;
        state.error = action.payload as string;
      });

    // Get current attendance
    builder
      .addCase(getCurrentAttendance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCurrentAttendance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentAttendance = action.payload.attendance;
        state.attendanceStatus = action.payload.status;
      })
      .addCase(getCurrentAttendance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Get current location
    builder
      .addCase(getCurrentLocation.pending, (state) => {
        state.isCheckingLocation = true;
        state.error = null;
      })
      .addCase(getCurrentLocation.fulfilled, (state) => {
        state.isCheckingLocation = false;
      })
      .addCase(getCurrentLocation.rejected, (state, action) => {
        state.isCheckingLocation = false;
        state.error = action.payload as string;
      });





    // Check in
    builder
      .addCase(performCheckIn.pending, (state) => {
        state.isCheckingIn = true;
        state.error = null;
      })
      .addCase(performCheckIn.fulfilled, (state, action) => {
        state.isCheckingIn = false;
        state.currentAttendance = action.payload.attendance;
        state.attendanceStatus = 'checked_in';
      })
      .addCase(performCheckIn.rejected, (state, action) => {
        state.isCheckingIn = false;
        state.error = action.payload as string;
      });

    // Check out
    builder
      .addCase(performCheckOut.pending, (state) => {
        state.isCheckingOut = true;
        state.error = null;
      })
      .addCase(performCheckOut.fulfilled, (state, action) => {
        state.isCheckingOut = false;
        state.currentAttendance = action.payload.attendance;
        state.attendanceStatus = 'checked_out';
      })
      .addCase(performCheckOut.rejected, (state, action) => {
        state.isCheckingOut = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  resetLocationStatus,
  setAttendanceStatus,
  // Legacy actions for old pages compatibility
  setCheckIn,
  setBreakTime,
  setWorkMode,
  setIsCheckedIn,
  setIsOnBreak,
  setRemoteCheckIn,
  setRemoteBreakTime,
  setRemoteWorkMode,
  setIsRemoteCheckedIn,
  setIsOnRemoteBreak,
} = attendanceSlice.actions;
export default attendanceSlice.reducer;
