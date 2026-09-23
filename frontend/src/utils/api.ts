import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://xtremecrm.onrender.com/api' : 'http://localhost:3000/api');
export const BACKEND_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const storedCountry = localStorage.getItem('xtreme_country') || 'CA';
  config.headers['x-country-code'] = storedCountry;
  const token = localStorage.getItem('xtreme_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data) {
      const data = error.response.data;
      if (data.errors && typeof data.errors === 'object') {
        const errorList = Object.entries(data.errors)
          .map(([field, msgs]) => Array.isArray(msgs) ? `${field}: ${msgs.join(', ')}` : `${field}: ${msgs}`)
          .join(' | ');
        if (errorList) {
          data.formattedError = errorList;
          // Replace vague "Validation failed" with human-readable specifics
          data.message = errorList;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
