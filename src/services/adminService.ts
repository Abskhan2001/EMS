import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const getToken = () => {
  const token = localStorage.getItem('accessToken') || '';
  console.log('Getting token from localStorage:', token ? 'Token found' : 'No token found');
  return token;
};

export const addEmployee = async (employeeData: FormData) => {
  const token = getToken();
  const organizationId = localStorage.getItem('organizationId');
  if (organizationId) {
    employeeData.append('organization_id', organizationId);
  }
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

    // The API returns an object with an "employees" property
    if (response.data && Array.isArray(response.data.employees)) {
      return response.data.employees;
    }
    return [];
  } catch (error: any) {
    console.error('Failed to fetch employees:', error);
    return []; // Return an empty array on error
  }
};

export const deleteEmployee = async (employeeId: string) => {
  const token = getToken();
  try {
    const response = await axios.delete(`${API_BASE_URL}/admin/employees/${employeeId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to delete employee:', error);
    throw error;
  }
};

export const getLocation = async () => {
    const token = getToken();
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/location`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error: any) {
        // Don't show error alert for getting location as it might not exist
        console.error('Failed to get location:', error);
        return null;
    }
};

export const setLocation = async (locationData: { 
    coordinates: {
        latitude: number; 
        longitude: number;
    };
    radius: number;
}) => {
    const token = getToken();
    try {
        const response = await axios.post(`${API_BASE_URL}/admin/location`, locationData, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error: any) {
        // Let the component handle the error display
        console.error('Failed to set location:', error);
        throw error;
    }
};

export const updateLocation = async (locationId: string, locationData: { 
    coordinates: {
        latitude: number; 
        longitude: number;
    };
    radius: number;
}) => {
    const token = getToken();
    try {
        const response = await axios.put(`${API_BASE_URL}/admin/location/${locationId}`, locationData, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error: any) {
        // Let the component handle the error display
        console.error('Failed to update location:', error);
        throw error;
    }
};


export const addClient = async (clientData: any) => {
  const token = getToken();
  const organizationId = localStorage.getItem('organizationId');
  
  // Create FormData properly
  const formData = new FormData();
  console.log("clientData",clientData);
  // Add all client data fields
  Object.keys(clientData).forEach(key => {
    if (clientData[key] !== null && clientData[key] !== undefined) {
      formData.append(key, clientData[key]);
    }
  });
  
  // Add required fields
  if (organizationId) {
    formData.append('organization_id', organizationId);
  }
  formData.append('role', 'client');
  
  // Debug: Log FormData contents
  console.log('FormData contents:');
  for (let pair of formData.entries()) {
    console.log(pair[0] + ': ' + pair[1]);
  }
  
  const response = await axios.post(`${API_BASE_URL}/admin/clients`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  });
  
  return response.data;
};
export const getClientsByOrganization = async (organizationId:any) => {
  const token = getToken();

  try {
    const response = await axios.get(`${API_BASE_URL}/admin/clients/org/${organizationId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // The API should return an object with a "clients" property
    if (response.data && Array.isArray(response.data.clients)) {
      return response.data.clients;
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    return []; // Return an empty array on error
  }
};

export const getClientById = async (clientId: any) => {
  const token = getToken();
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/clients/${clientId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.client;
  } catch (error) {
    console.error('Failed to fetch client:', error);
    throw error;
  }
};

export const deleteClient = async (clientId: any) => {
  const token = getToken();
  try {
    const response = await axios.delete(`${API_BASE_URL}/admin/clients/${clientId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to delete client:', error);
    throw error;
  }
};

export const getProjectById = async (projectId: any) => {
  const token = getToken();
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/projects/${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.project;
  } catch (error) {
    console.error('Failed to fetch project:', error);
    throw error;
  }
};
//   const token = getToken();
//   try {
//     const response = await axios.get(`${API_BASE_URL}/admin/clients/${clientId}`, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     return response.data.client;
//   } catch (error) {
//     console.error('Failed to fetch client:', error);
//     throw error;
//   }
// };

// export const deleteClient = async (clientId) => {
//   const token = getToken();
//   try {
//     const response = await axios.delete(`${API_BASE_URL}/admin/clients/${clientId}`, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     return response.data;
//   } catch (error) {
//     console.error('Failed to delete client:', error);
//     throw error;
//   }
// };

