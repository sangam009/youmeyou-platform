import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import config from './config';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(config.firebase) : getApps()[0];
const auth = getAuth(app);

export { app, auth }; 