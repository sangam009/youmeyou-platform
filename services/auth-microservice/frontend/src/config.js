// Configuration for auth microservice frontend
const getApiBaseUrl = () => {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Treat both staging and production as same (both use youmeyou.ai domain)
    const isProduction = hostname.includes('youmeyou.ai');
    
    // For production/staging: use nginx proxy routes (same domain)
    if (isProduction) {
      return '/api/auth';
    }
  }
  
  // For development: direct service access to auth service
  return 'http://localhost:3001';
};

export const config = {
  apiBaseUrl: getApiBaseUrl(),
  
  // Environment detection (staging and production treated as same)
  isProduction: typeof window !== 'undefined' && window.location.hostname.includes('youmeyou.ai'),
  
  // Debug info
  debug: {
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    apiBaseUrl: getApiBaseUrl()
  }
}; 