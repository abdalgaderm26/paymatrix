import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || '5047634413';

const api = axios.create({
  baseURL: `${API_BASE}/api/admin`,
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Key': ADMIN_KEY,
  },
});

export default api;
