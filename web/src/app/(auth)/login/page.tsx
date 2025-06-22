'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import CodalooLogo from '@/components/CodalooLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (error: any) {
      // handle error (toast, etc.)
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (error: any) {
      console.error('[Codaloo][Google Login] Error:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-md mx-auto p-8 flex flex-col items-center">
        <CodalooLogo size={56} />
        <h1 className="mt-8 text-3xl font-bold text-gray-900 text-center">Sign in to Codaloo</h1>
        <button
          onClick={handleGoogleLogin}
          className="mt-8 w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-3 font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#clip0_17_40)">
              <path d="M44.5 20H24V28.5H35.9C34.5 32.5 30.7 35.5 24 35.5C16.6 35.5 10.5 29.4 10.5 22C10.5 14.6 16.6 8.5 24 8.5C27.1 8.5 29.7 9.6 31.7 11.3L37.1 6.1C33.6 2.9 29.1 1 24 1C12.4 1 3 10.4 3 22C3 33.6 12.4 43 24 43C35.6 43 45 33.6 45 22C45 20.7 44.8 19.4 44.5 20Z" fill="#E4E4E4"/>
              <path d="M6.3 14.7L12.5 19.2C14.1 15.7 18.6 12.5 24 12.5C26.7 12.5 29.1 13.4 31 14.8L36.7 9.6C33.6 6.8 29.1 5 24 5C16.6 5 10.5 11.1 10.5 18.5C10.5 20.2 10.8 21.8 11.3 23.2L6.3 14.7Z" fill="#FBBB00"/>
              <path d="M24 43C29.1 43 33.6 41.1 37.1 37.9L31.7 32.7C29.7 34.4 27.1 35.5 24 35.5C18.6 35.5 14.1 32.3 12.5 28.8L6.3 33.3C10.8 39.2 17.1 43 24 43Z" fill="#34A853"/>
              <path d="M44.5 20H24V28.5H35.9C35.3 30.2 34.2 31.7 32.7 32.7L37.1 37.9C40.1 35.1 42.2 31.1 42.2 26.5C42.2 25.1 42 23.8 41.7 22.7L44.5 20Z" fill="#4285F4"/>
              <path d="M6.3 14.7L12.5 19.2C13.2 17.7 14.1 16.4 15.2 15.3L9.6 10.1C8.1 11.7 7 13.1 6.3 14.7Z" fill="#EA4335"/>
            </g>
            <defs>
              <clipPath id="clip0_17_40">
                <rect width="48" height="48" fill="white"/>
              </clipPath>
            </defs>
          </svg>
          Continue with Google
        </button>
        <div className="flex items-center w-full my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="mx-4 text-gray-400 text-sm">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <form className="w-full" onSubmit={handleEmailLogin}>
          <label className="block text-xs font-semibold text-gray-500 mb-1" htmlFor="email">EMAIL</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="mb-4 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <label className="block text-xs font-semibold text-gray-500 mb-1" htmlFor="password">PASSWORD</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="mb-6 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-md bg-black text-white font-bold text-lg hover:bg-gray-900 transition disabled:opacity-60"
          >
            {isLoading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <div className="w-full flex flex-col items-center mt-6 space-y-2">
          {/* <Link href="#" className="text-blue-600 text-sm font-medium hover:underline">Use single sign-on</Link> */}
          <Link href="/forgot-password" className="text-blue-600 text-sm font-medium hover:underline">Reset password</Link>
        </div>
        <div className="w-full text-center mt-4 text-gray-500 text-sm">
          No account?{' '}
          <Link href="/signup" className="text-blue-600 font-medium hover:underline">Create one</Link>
        </div>
      </div>
    </div>
  );
} 