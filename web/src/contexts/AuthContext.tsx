'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  onAuthStateChanged,
  getIdToken
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { authApi, UserProfile } from '@/lib/api';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const createOrUpdateUserProfile = async (firebaseUser: FirebaseUser, provider: string) => {
    try {
      const token = await getIdToken(firebaseUser);
      const response = await authApi.createUser(provider, {
        token,
        refresh_token: firebaseUser.refreshToken,
        user: {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          phoneNumber: firebaseUser.phoneNumber,
        },
      });
      setUserProfile(response.user);
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Check if we have a valid session
          const sessionResponse = await authApi.checkSession();
          if (sessionResponse.status === 'success') {
            setUserProfile(sessionResponse.user);
          } else {
            // If no valid session, create/update user profile
            const provider = firebaseUser.providerData[0]?.providerId || 'email';
            await createOrUpdateUserProfile(firebaseUser, provider);
          }
        } catch (error) {
          console.error('Error checking session:', error);
          // If session check fails, create/update user profile
          const provider = firebaseUser.providerData[0]?.providerId || 'email';
          await createOrUpdateUserProfile(firebaseUser, provider);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await createOrUpdateUserProfile(result.user, 'email');
  };

  const signUp = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await createOrUpdateUserProfile(result.user, 'email');
  };

  const logout = async () => {
    await authApi.logout();
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('[Codaloo][Google SignIn] Firebase user:', result.user);
      const token = await getIdToken(result.user);
      console.log('[Codaloo][Google SignIn] Google ID token:', token);
      console.log('[Codaloo][Google SignIn] Calling authApi.createUser...');
      const response = await authApi.createUser('google', {
        token,
        refresh_token: result.user.refreshToken,
        user: {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          phoneNumber: result.user.phoneNumber,
        },
      });
      console.log('[Codaloo][Google SignIn] Auth microservice response:', response);
      console.log('[Codaloo][Google SignIn] Refetching user profile from auth service...');
       
      const fetchedProfile = await authApi.getUser(response.user);
      setUserProfile(fetchedProfile.user); 
    } catch (error) {
      console.error('[Codaloo][Google SignIn] Error:', error);
      throw error;
    }
  };

  const signInWithGithub = async () => {
    const provider = new GithubAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await createOrUpdateUserProfile(result.user, 'github');
  };

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    logout,
    resetPassword,
    signInWithGoogle,
    signInWithGithub,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 