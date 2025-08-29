import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';
import projectName from './slices/AdminProjectName';
import sideBar from './slices/SideBar';

import absenteeCountReducer from './slices/userAbsenteesSlice';
import authReducer from './slices/authSlice';
import employeeReducer from './slices/employeeSlice';
import organizationLocationReducer from './slices/organizationLocationSlice';
import clientsReducer from './slices/clientsSlice';
import projectsReducer from './slices/projectsSlice';
import attendanceReducer from './slices/attendanceSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'employee', 'organizationLocation', 'clients', 'projects', 'attendance'], // Persist auth, employee, location, clients, projects, and attendance slices
};

// Combine reducers
const rootReducer = combineReducers({
  sideBar,
  projectName,
  absenteeCount: absenteeCountReducer,
  auth: authReducer,
  employee: employeeReducer,
  organizationLocation: organizationLocationReducer,
  clients: clientsReducer,
  projects: projectsReducer,
  attendance: attendanceReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

const globalStore = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(globalStore);
export default globalStore;
export type RootState = ReturnType<typeof globalStore.getState>;
export type AppDispatch = typeof globalStore.dispatch;
