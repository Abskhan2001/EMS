import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { getEmployeesByOrganization, addEmployee as addEmployeeService, updateEmployee as updateEmployeeService, deleteEmployee } from '../services/adminService';

export interface Employee {
  _id: string;
  id?: string; // For compatibility
  fullName: string;
  email: string;
  personal_email?: string;
  phoneNumber?: string;
  hireDate?: string;
  projects?: any[];
  TotalKPI?: number;
  role?: string;
  rating?: number;
  daily_log?: string | null;
  managerId?: string | null;
  organizationId?: string;
  status?: string;
  profilePicture?: string | null;
  profession?: string;
  location?: string;
  salary?: number | null;
  per_hour_pay?: number | null;
  workMode?: string;
  emailVerified?: boolean;
  loginAttempts?: number;
  slackUserId?: string;
  fcmTokens?: string[];
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  isLocked?: boolean;
  preferences?: {
    notifications?: {
      email?: boolean;
      push?: boolean;
      slack?: boolean;
    };
    theme?: string;
    language?: string;
    timezone?: string;
  };
}

interface EmployeeState {
  employees: Employee[];
  currentEmployee: Employee | null;
  loading: boolean;
  error: string | null;
  employeeView: 'generalview' | 'detailview';
}

const initialState: EmployeeState = {
  employees: [],
  currentEmployee: null,
  loading: false,
  error: null,
  employeeView: 'generalview',
};

// Async thunk to fetch employees
export const fetchEmployees = createAsyncThunk(
  'employee/fetchEmployees',
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

      const employeesData = await getEmployeesByOrganization(organizationId);
      return employeesData;
    } catch (error: any) {
      console.error('Error in fetchEmployees:', error);
      return rejectWithValue(error.message || 'Failed to fetch employees');
    }
  }
);

// Async thunk to delete employee (soft delete)
export const deleteEmployeeAsync = createAsyncThunk(
  'employee/deleteEmployee',
  async (employeeId: string, { rejectWithValue }) => {
    try {
      await deleteEmployee(employeeId);
      return employeeId;
    } catch (error: any) {
      console.error('Error in deleteEmployee:', error);
      return rejectWithValue(error.message || 'Failed to delete employee');
    }
  }
);

const employeeSlice = createSlice({
  name: 'employee',
  initialState,
  reducers: {
    setCurrentEmployee: (state, action: PayloadAction<Employee | null>) => {
      state.currentEmployee = action.payload;
    },
    setEmployeeView: (state, action: PayloadAction<'generalview' | 'detailview'>) => {
      state.employeeView = action.payload;
    },
    addEmployee: (state, action: PayloadAction<Employee>) => {
      state.employees.push(action.payload);
    },
    updateEmployee: (state, action: PayloadAction<Employee>) => {
      const index = state.employees.findIndex(emp => emp._id === action.payload._id);
      if (index !== -1) {
        state.employees[index] = action.payload;
      }
    },
    removeEmployee: (state, action: PayloadAction<string>) => {
      state.employees = state.employees.filter(emp => emp._id !== action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload || [];
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete employee cases
      .addCase(deleteEmployeeAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEmployeeAsync.fulfilled, (state, action) => {
        state.loading = false;
        // Remove the deleted employee from the list
        state.employees = state.employees.filter(emp => emp._id !== action.payload);
      })
      .addCase(deleteEmployeeAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentEmployee,
  setEmployeeView,
  addEmployee,
  updateEmployee,
  removeEmployee,
  clearError,
} = employeeSlice.actions;

// Export actions and reducer
export default employeeSlice.reducer;
