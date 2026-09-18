import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

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
  return config;
});

export default api;
