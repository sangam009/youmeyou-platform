import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Replace with your own Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC8aNECZ373-VSaO6rnGNJXM3Dexf49YhE",
  authDomain: "sangam-21934.firebaseapp.com",
  databaseURL: "https://sangam-21934.firebaseio.com",
  projectId: "sangam-21934",
  storageBucket: "sangam-21934.appspot.com",
  messagingSenderId: "1086616413297",
  appId: "1:1086616413297:web:6a21ff0deb8c3b43ec67d0",
  measurementId: "G-ZP8GZ0XPF9",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider }; 