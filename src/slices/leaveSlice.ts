import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import userService, { LeaveRequestData, LeaveRequestResponse, Holiday } from '../services/userService';

// Types
export interface LeaveState {
  // Leave requests
  leaveRequests: LeaveRequestResponse['leaveRequest'][];
  currentLeaveRequest: LeaveRequestResponse['leaveRequest'] | null;

  // Holidays
  holidays: Holiday[];

  // Leave balance
  leaveBalance: any;
  
  // Loading states
  loading: boolean;
  holidaysLoading: boolean;
  balanceLoading: boolean;
  
  // Error states
  error: string | null;
  holidaysError: string | null;
  balanceError: string | null;
  
  // Pagination
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
}

const initialState: LeaveState = {
  leaveRequests: [],
  currentLeaveRequest: null,
  holidays: [],
  leaveBalance: null,
  loading: false,
  holidaysLoading: false,
  balanceLoading: false,
  error: null,
  holidaysError: null,
  balanceError: null,
  pagination: null,
};

// Async thunks
export const createLeaveRequest = createAsyncThunk(
  'leave/createLeaveRequest',
  async (data: LeaveRequestData, { rejectWithValue, getState }) => {
    try {
      // Check if user is authenticated
      const state = getState() as any;
      const user = state.auth?.user;

      if (!user) {
        return rejectWithValue('User not authenticated');
      }

      const response = await userService.leave.createLeaveRequest(data);
      return response.leaveRequest;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create leave request');
    }
  }
);

export const fetchLeaveRequests = createAsyncThunk(
  'leave/fetchLeaveRequests',
  async (
    params: {
      status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
      leaveType?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {},
    { rejectWithValue, getState }
  ) => {
    try {
      // Check if user is authenticated
      const state = getState() as any;
      const user = state.auth?.user;

      if (!user) {
        return rejectWithValue('User not authenticated');
      }

      const response = await userService.leave.getLeaveRequests(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch leave requests');
    }
  }
);

export const fetchLeaveRequestById = createAsyncThunk(
  'leave/fetchLeaveRequestById',
  async (leaveId: string, { rejectWithValue }) => {
    try {
      const response = await leaveService.getLeaveRequestById(leaveId);
      return response.leaveRequest;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch leave request');
    }
  }
);

export const updateLeaveRequest = createAsyncThunk(
  'leave/updateLeaveRequest',
  async (
    { leaveId, data }: { leaveId: string; data: Partial<CreateLeaveRequestData> },
    { rejectWithValue }
  ) => {
    try {
      const response = await leaveService.updateLeaveRequest(leaveId, data);
      return response.leaveRequest;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update leave request');
    }
  }
);

export const cancelLeaveRequest = createAsyncThunk(
  'leave/cancelLeaveRequest',
  async (
    { leaveId, reason }: { leaveId: string; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      await leaveService.cancelLeaveRequest(leaveId, reason);
      return leaveId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to cancel leave request');
    }
  }
);

export const deleteLeaveRequest = createAsyncThunk(
  'leave/deleteLeaveRequest',
  async (leaveId: string, { rejectWithValue }) => {
    try {
      await leaveService.deleteLeaveRequest(leaveId);
      return leaveId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete leave request');
    }
  }
);

export const fetchHolidays = createAsyncThunk(
  'leave/fetchHolidays',
  async (year?: number, { rejectWithValue, getState }) => {
    try {
      // Check if user is authenticated
      const state = getState() as any;
      const user = state.auth?.user;

      if (!user) {
        return rejectWithValue('User not authenticated');
      }

      const response = await userService.leave.getHolidays(year);
      return response.holidays;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch holidays');
    }
  }
);

export const fetchLeaveBalance = createAsyncThunk(
  'leave/fetchLeaveBalance',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Check if user is authenticated
      const state = getState() as any;
      const user = state.auth?.user;

      if (!user) {
        return rejectWithValue('User not authenticated');
      }

      const response = await userService.leave.getLeaveBalance();
      return response.balance;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch leave balance');
    }
  }
);

export const fetchLeaveStats = createAsyncThunk(
  'leave/fetchLeaveStats',
  async (year?: number, { rejectWithValue }) => {
    try {
      const response = await userService.leave.getLeaveStats(year);
      return response.stats;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch leave statistics');
    }
  }
);

const leaveSlice = createSlice({
  name: 'leave',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.holidaysError = null;
      state.balanceError = null;
    },
    clearCurrentLeaveRequest: (state) => {
      state.currentLeaveRequest = null;
    },
    resetLeaveState: (state) => {
      state.leaveRequests = [];
      state.currentLeaveRequest = null;
      state.holidays = [];
      state.leaveBalance = null;
      state.error = null;
      state.holidaysError = null;
      state.balanceError = null;
      state.pagination = null;
    },
  },
  extraReducers: (builder) => {
    // Create leave request
    builder
      .addCase(createLeaveRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLeaveRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.leaveRequests.unshift(action.payload);
        state.currentLeaveRequest = action.payload;
      })
      .addCase(createLeaveRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch leave requests
      .addCase(fetchLeaveRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeaveRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.leaveRequests = action.payload.leaveRequests;
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchLeaveRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch leave request by ID
      .addCase(fetchLeaveRequestById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeaveRequestById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentLeaveRequest = action.payload;
      })
      .addCase(fetchLeaveRequestById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update leave request
      .addCase(updateLeaveRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLeaveRequest.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.leaveRequests.findIndex(req => req._id === action.payload._id);
        if (index !== -1) {
          state.leaveRequests[index] = action.payload;
        }
        if (state.currentLeaveRequest?._id === action.payload._id) {
          state.currentLeaveRequest = action.payload;
        }
      })
      .addCase(updateLeaveRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Cancel leave request
      .addCase(cancelLeaveRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelLeaveRequest.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.leaveRequests.findIndex(req => req._id === action.payload);
        if (index !== -1) {
          state.leaveRequests[index].status = 'cancelled';
        }
        if (state.currentLeaveRequest?._id === action.payload) {
          state.currentLeaveRequest.status = 'cancelled';
        }
      })
      .addCase(cancelLeaveRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Delete leave request
      .addCase(deleteLeaveRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteLeaveRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.leaveRequests = state.leaveRequests.filter(req => req._id !== action.payload);
        if (state.currentLeaveRequest?._id === action.payload) {
          state.currentLeaveRequest = null;
        }
      })
      .addCase(deleteLeaveRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch holidays
      .addCase(fetchHolidays.pending, (state) => {
        state.holidaysLoading = true;
        state.holidaysError = null;
      })
      .addCase(fetchHolidays.fulfilled, (state, action) => {
        state.holidaysLoading = false;
        state.holidays = action.payload;
      })
      .addCase(fetchHolidays.rejected, (state, action) => {
        state.holidaysLoading = false;
        state.holidaysError = action.payload as string;
      })

      // Fetch leave balance
      .addCase(fetchLeaveBalance.pending, (state) => {
        state.balanceLoading = true;
        state.balanceError = null;
      })
      .addCase(fetchLeaveBalance.fulfilled, (state, action) => {
        state.balanceLoading = false;
        state.leaveBalance = action.payload;
      })
      .addCase(fetchLeaveBalance.rejected, (state, action) => {
        state.balanceLoading = false;
        state.balanceError = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  clearCurrentLeaveRequest, 
  resetLeaveState 
} = leaveSlice.actions;

export default leaveSlice.reducer;
