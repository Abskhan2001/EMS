import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL = 'http://localhost:4001/api/v1/admin';

const getToken = () => {
  return localStorage.getItem('accessToken') || '';
};

export const addEmployee = async (employeeData: FormData) => {
  const token = getToken();
  const response = await axios.post(`${API_BASE_URL}/employees`, employeeData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};
