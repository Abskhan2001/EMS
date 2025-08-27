import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';
import projectName from './slices/AdminProjectName';
import sideBar from './slices/SideBar';
import { AttendenceAPI } from './services/AttendanceAPI';
import absenteeCountReducer from './slices/userAbsenteesSlice';
import authReducer from './slices/authSlice';
import employeeReducer from './slices/employeeSlice';
import organizationLocationReducer from './slices/organizationLocationSlice';
import clientsReducer from './slices/clientsSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'employee', 'organizationLocation', 'clients'], // Persist auth, employee, location, and clients slices
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
  [AttendenceAPI.reducerPath]: AttendenceAPI.reducer,
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
    }).concat(AttendenceAPI.middleware),
});

export const persistor = persistStore(globalStore);
export default globalStore;
export type RootState = ReturnType<typeof globalStore.getState>;
export type AppDispatch = typeof globalStore.dispatch;
