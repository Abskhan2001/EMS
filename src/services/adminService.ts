import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const getToken = () => {
  return localStorage.getItem('accessToken') || '';
};

export const addEmployee = async (employeeData: FormData) => {
  const token = getToken();
  const response = await axios.post(`${API_BASE_URL}/admin/employees`, employeeData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  });
  
  return response.data;
};

export const setPassword = async (password: string, token: string | undefined) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/employee/set-password`, {
      token,
      password,
    });
    return response.data;
  } catch (error) {
    console.error('Failed to set password:', error);
    throw error;
  }
};

export const getEmployeesByOrganization = async (organizationId: string) => {
  const token = getToken();
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/employees/org/${organizationId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // Ensure the response is always an array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Failed to fetch employees:', error);
    return []; // Return an empty array on error
  }
};
