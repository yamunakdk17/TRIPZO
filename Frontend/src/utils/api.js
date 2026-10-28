import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, ''),
  headers: {
    'Content-Type': 'application/json',
  },
});

function getStoredToken() {
  try {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('tripzoCustomerToken') ||
      sessionStorage.getItem('tripzoCustomerToken') ||
      sessionStorage.getItem('tripzo_admin_token') ||
      ''
    );
  } catch {
    return '';
  }
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('tripzoCustomerToken');
        sessionStorage.removeItem('tripzoCustomerToken');
        sessionStorage.removeItem('tripzo_admin_token');
      } catch {
        // Ignore storage limitations.
      }
    }

    return Promise.reject(error);
  },
);

export default api;
