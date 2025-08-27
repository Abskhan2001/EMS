import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux.CustomHooks';
import { fetchOrganizationLocation } from '../slices/organizationLocationSlice';
import { fetchClients } from '../slices/clientsSlice';
import { fetchEmployees } from '../slices/employeeSlice';

/**
 * Custom hook to manage organization data (location, clients, employees)
 * This hook provides a centralized way to fetch and access organization-related data
 */
export const useOrganizationData = () => {
  const dispatch = useAppDispatch();

  // Organization Location State
  const {
    location: organizationLocation,
    loading: locationLoading,
    error: locationError,
  } = useAppSelector((state) => state.organizationLocation);

  // Clients State
  const {
    clients,
    currentClient,
    loading: clientsLoading,
    error: clientsError,
  } = useAppSelector((state) => state.clients);

  // Employees State
  const {
    employees,
    currentEmployee,
    loading: employeesLoading,
    error: employeesError,
  } = useAppSelector((state) => state.employee);

  // Auth State
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  // Fetch all organization data
  const fetchAllOrganizationData = () => {
    if (isAuthenticated && user) {
      dispatch(fetchOrganizationLocation());
      dispatch(fetchClients());
      dispatch(fetchEmployees());
    }
  };

  // Fetch individual data sets
  const refetchLocation = () => {
    if (isAuthenticated && user) {
      dispatch(fetchOrganizationLocation());
    }
  };

  const refetchClients = () => {
    if (isAuthenticated && user) {
      dispatch(fetchClients());
    }
  };

  const refetchEmployees = () => {
    if (isAuthenticated && user) {
      dispatch(fetchEmployees());
    }
  };

  // Auto-fetch data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAllOrganizationData();
    }
  }, [isAuthenticated, user]);

  // Computed values
  const isLoading = locationLoading || clientsLoading || employeesLoading;
  const hasErrors = !!(locationError || clientsError || employeesError);
  const errors = {
    location: locationError,
    clients: clientsError,
    employees: employeesError,
  };

  // Statistics
  const stats = {
    totalEmployees: employees.length,
    totalClients: clients.length,
    activeEmployees: employees.filter(emp => emp.status === 'active').length,
    activeClients: clients.filter(client => client.isActive !== false).length,
  };

  return {
    // Data
    organizationLocation,
    clients,
    employees,
    currentClient,
    currentEmployee,
    user,
    
    // Loading states
    isLoading,
    locationLoading,
    clientsLoading,
    employeesLoading,
    
    // Error states
    hasErrors,
    errors,
    locationError,
    clientsError,
    employeesError,
    
    // Actions
    fetchAllOrganizationData,
    refetchLocation,
    refetchClients,
    refetchEmployees,
    
    // Computed values
    stats,
    isAuthenticated,
  };
};

export default useOrganizationData;
