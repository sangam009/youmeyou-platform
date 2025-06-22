'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import CodalooLogo from '@/components/CodalooLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await resetPassword(email);
      setIsSuccess(true);
    } catch (error: any) {
      // handle error (toast, etc.)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-md mx-auto p-8 flex flex-col items-center">
        <CodalooLogo size={56} />
        <h1 className="mt-8 text-3xl font-bold text-gray-900 text-center">Reset your password</h1>
        {isSuccess ? (
          <div className="w-full text-center mt-8">
            <p className="text-green-600 font-medium mb-4">A password reset link has been sent to <span className="font-mono">{email}</span>.</p>
            <Link href="/login" className="text-blue-600 text-sm font-medium hover:underline">Return to login</Link>
          </div>
        ) : (
          <form className="w-full mt-8" onSubmit={handleSubmit}>
            <label className="block text-xs font-semibold text-gray-500 mb-1" htmlFor="email">EMAIL</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="mb-6 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-md bg-black text-white font-bold text-lg hover:bg-gray-900 transition disabled:opacity-60"
            >
              {isLoading ? 'Sending link...' : 'Send reset link'}
            </button>
          </form>
        )}
        <div className="w-full flex flex-col items-center mt-6 space-y-2">
          <Link href="/login" className="text-blue-600 text-sm font-medium hover:underline">Back to login</Link>
          <Link href="/signup" className="text-blue-600 text-sm font-medium hover:underline">Create account</Link>
        </div>
      </div>
    </div>
  );
} 