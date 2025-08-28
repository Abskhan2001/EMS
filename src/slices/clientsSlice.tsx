import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getClientsByOrganization, deleteClient } from '../services/adminService';

// Define the Client interface based on the backend model
export interface Client {
  _id: string;
  id?: string; // For compatibility
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: 'client';
  organizationId: string;
  status?: string;
  profilePicture?: string | null;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  isActive?: boolean;
  companyName?: string;
  position?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  preferences?: {
    notifications?: {
      email?: boolean;
      push?: boolean;
    };
  };
}

interface ClientsState {
  clients: Client[];
  currentClient: Client | null;
  loading: boolean;
  error: string | null;
}

const initialState: ClientsState = {
  clients: [],
  currentClient: null,
  loading: false,
  error: null,
};

// Async thunk to fetch clients
export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
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

      const clientsData = await getClientsByOrganization(organizationId);

      // Transform the data to match our interface
      const transformedClients = clientsData
        .filter((client: any) => client.role === 'client' || client.role === 'Client')
        .map((client: any) => ({
          _id: client._id,
          fullName: client.full_name || client.fullName || 'Unknown',
          email: client.email || '',
          phoneNumber: client.phone || client.phone_number || client.phoneNumber,
          role: 'client' as const,
          organizationId: client.organization_id || client.organizationId,
          profilePicture: client.profile_image || client.profilePicture,
          createdAt: client.created_at || client.createdAt || new Date().toISOString(),
          companyName: client.companyName,
          isActive: client.isActive !== false,
          emailVerified: client.emailVerified || false,
        }));

      return transformedClients;
    } catch (error: any) {
      console.error('Error in fetchClients:', error);
      return rejectWithValue(error.message || 'Failed to fetch clients');
    }
  }
);

// Async thunk to delete client (soft delete)
export const deleteClientAsync = createAsyncThunk(
  'clients/deleteClient',
  async (clientId: string, { rejectWithValue }) => {
    try {
      await deleteClient(clientId);
      return clientId;
    } catch (error: any) {
      console.error('Error in deleteClient:', error);
      return rejectWithValue(error.message || 'Failed to delete client');
    }
  }
);

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    setCurrentClient: (state, action: PayloadAction<Client | null>) => {
      state.currentClient = action.payload;
    },
    addClient: (state, action: PayloadAction<Client>) => {
      state.clients.push(action.payload);
    },
    updateClient: (state, action: PayloadAction<Client>) => {
      const index = state.clients.findIndex(client => client._id === action.payload._id);
      if (index !== -1) {
        state.clients[index] = action.payload;
      }
    },
    removeClient: (state, action: PayloadAction<string>) => {
      state.clients = state.clients.filter(client => client._id !== action.payload);
    },
    setClients: (state, action: PayloadAction<Client[]>) => {
      state.clients = action.payload;
      state.error = null;
    },
    clearClients: (state) => {
      state.clients = [];
      state.currentClient = null;
      state.error = null;
    },
    setClientsError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearClientsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false;
        state.clients = action.payload;
        state.error = null;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete client cases
      .addCase(deleteClientAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteClientAsync.fulfilled, (state, action) => {
        state.loading = false;
        // Remove the deleted client from the list
        state.clients = state.clients.filter(client => client._id !== action.payload);
      })
      .addCase(deleteClientAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  setCurrentClient,
  addClient,
  updateClient,
  removeClient,
  setClients,
  clearClients,
  setClientsError,
  clearClientsError
} = clientsSlice.actions;

export default clientsSlice.reducer;
