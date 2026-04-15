import axios from 'axios';

// In production, dashboard is served from same origin as API
// In development, Vite proxy handles /api forwarding
const API_BASE = import.meta.env.VITE_API_URL || '';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || '';

const api = axios.create({
  baseURL: `${API_BASE}/api/admin`,
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Key': ADMIN_KEY,
  },
});

export default api;
