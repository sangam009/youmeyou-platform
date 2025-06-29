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
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor for logging and cookie handling
api.interceptors.request.use((config) => {
  // Log the request for debugging
  console.log('🚀 API Request:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    withCredentials: config.withCredentials
  });
  
  // Ensure credentials are always sent
  config.withCredentials = true;
  
  return config;
}, (error) => {
  console.error('❌ Request Error:', error);
  return Promise.reject(error);
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
      hasSetCookie: !!response.headers['set-cookie']
    });
    
    return response;
  },
  async (error) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message || error.message
    });
    
    if (error.response?.status === 401) {
      // Handle unauthorized access - redirect to login
      if (typeof window !== 'undefined') {
        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes('/login')) {
          console.log('🔄 Redirecting to login due to 401');
          window.location.href = '/login';
        }
      }
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
  getUser: async (uuid: string) => {
    const endpoint = typeof window !== 'undefined' && window.location.hostname.includes('localhost') 
      ? `/user/${uuid}` 
      : `/api/auth/user/${uuid}`;
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