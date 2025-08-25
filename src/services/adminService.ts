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
    const response = await axios.post(`${API_BASE_URL}/admin/employe/set-password`, {
      token,
      password,
    });
    return response.data;
  } catch (error) {
    console.error('Failed to set password:', error);
    throw error;
  }
};
