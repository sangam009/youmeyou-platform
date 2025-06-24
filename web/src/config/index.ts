// Environment detection
const isClient = typeof window !== 'undefined';
const hostname = isClient ? window.location.hostname : '';
const isProduction = hostname.includes('youmeyou.ai');

export const config = {
  firebase: {
    apiKey: "AIzaSyC8aNECZ373-VSaO6rnGNJXM3Dexf49YhE",
    authDomain: "sangam-21934.firebaseapp.com",
    databaseURL: "https://sangam-21934.firebaseio.com",
    projectId: "sangam-21934",
    storageBucket: "sangam-21934.appspot.com",
    messagingSenderId: "1086616413297",
    appId: "1:1086616413297:web:6a21ff0deb8c3b43ec67d0",
    measurementId: "G-ZP8GZ0XPF9"
  },
  auth: {
    serviceUrl: (() => {
      // Check for explicit environment variable first
      if (process.env.NEXT_PUBLIC_AUTH_SERVICE_URL) {
        return process.env.NEXT_PUBLIC_AUTH_SERVICE_URL;
      }
      
      // For production: use nginx proxy routes (secure, goes through HTTPS)
      if (isProduction) return "/api/auth";
      
      // For local development: direct service access
      return "http://localhost:3001";
    })()
  },
  api: {
    designService: (() => {
      // Check for explicit environment variable first
      if (process.env.NEXT_PUBLIC_DESIGN_SERVICE_URL) {
        return process.env.NEXT_PUBLIC_DESIGN_SERVICE_URL;
      }
      
      // For production: use nginx proxy routes (secure, goes through HTTPS)  
      if (isProduction) return "/api/design";
      
      // For local development: direct service access
      return "http://localhost:4000";
    })(),
    
    paymentService: (() => {
      // Check for explicit environment variable first
      if (process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL) {
        return process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL;
      }
      
      // For production: use nginx proxy routes (secure, goes through HTTPS)  
      if (isProduction) return "/api/payment";
      
      // For local development: direct service access
      return "http://localhost:6000";
    })()
  },
  
  // Environment info for debugging
  environment: {
    isProduction,
    hostname,
    nodeEnv: process.env.NODE_ENV,
    // Debug info
    authServiceUrl: (() => {
      if (process.env.NEXT_PUBLIC_AUTH_SERVICE_URL) {
        return process.env.NEXT_PUBLIC_AUTH_SERVICE_URL;
      }
      if (isProduction) return "/api/auth";
      return "http://localhost:3001";
    })(),
    designServiceUrl: (() => {
      if (process.env.NEXT_PUBLIC_DESIGN_SERVICE_URL) {
        return process.env.NEXT_PUBLIC_DESIGN_SERVICE_URL;
      }
      if (isProduction) return "/api/design";
      return "http://localhost:4000";
    })()
  }
}; 