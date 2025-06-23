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
      // For production: use nginx proxy routes (secure, goes through HTTPS)
      if (isProduction) return "/api/auth";
      // For local development: direct service access
      return "http://localhost:3001";
    })()
  },
  api: {
    designService: (() => {
      // For production: use nginx proxy routes (secure, goes through HTTPS)  
      if (isProduction) return "/api/design";
      // For local development: direct service access
      return "http://localhost:4000";
    })()
  }
}; 