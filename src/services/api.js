import axios from 'axios';

// Base URL for all API modules securely fetched from Env
const API_BASE_URL = import.meta.env.VITE_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // 🛡️ Mandatory for JWT cookie sync
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0',
  }
});

export default api;
