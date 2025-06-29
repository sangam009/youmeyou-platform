import axios from 'axios';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
}

// Determine the base URL based on the current hostname
const getBaseUrl = () => {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_URL || 'https://youmeyou.ai';
  
  const hostname = window.location.hostname;
  if (hostname.includes('staging')) {
    return 'https://staging.youmeyou.ai';
  }
  if (hostname.includes('localhost')) {
    return 'http://localhost:3001'; // Direct auth service for local dev
  }
  return 'https://youmeyou.ai';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  createUser: async (provider: string, data: any) => {
    // For production/staging: use nginx proxy path, for local: direct service path
    const endpoint = typeof window !== 'undefined' && window.location.hostname.includes('localhost') 
      ? '/user/create' 
      : '/api/auth/user/create';
    const response = await api.post(endpoint, { provider, payload: data });
    return response.data;
  },
  getUser: async (user: UserProfile) => {
    const endpoint = typeof window !== 'undefined' && window.location.hostname.includes('localhost') 
      ? `/user/${user.uid}` 
      : `/api/auth/user/${user.uid}`;
    const response = await api.get(endpoint);
    return response.data;
  },
  checkSession: async () => {
    const endpoint = typeof window !== 'undefined' && window.location.hostname.includes('localhost') 
      ? '/session/check' 
      : '/api/auth/session/check';
    const response = await api.get(endpoint);
    return response.data;
  },
  logout: async () => {
    const endpoint = typeof window !== 'undefined' && window.location.hostname.includes('localhost') 
      ? '/session/logout' 
      : '/api/auth/session/logout';
    const response = await api.post(endpoint);
    return response.data;
  }
};

export default api;