'use client';

import CodalooLogo from '@/components/CodalooLogo';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { userProfile } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <CodalooLogo size={72} />
      <h1 className="mt-8 text-4xl font-bold text-gray-900 text-center">Welcome to Codaloo!</h1>
      <p className="mt-4 text-lg text-gray-600 text-center">You are successfully logged in.</p>
      <div className="mt-8 bg-gray-50 rounded-xl shadow p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Profile</h2>
        {userProfile ? (
          <div className="space-y-2">
            <div><span className="font-medium">Name:</span> {userProfile.display_name || 'N/A'}</div>
            <div><span className="font-medium">Email:</span> {userProfile.email}</div>
            <div><span className="font-medium">Provider:</span> {userProfile.provider}</div>
            <div><span className="font-medium">Roles:</span> {userProfile.roles?.map(r => r.name).join(', ') || 'N/A'}</div>
          </div>
        ) : (
          <div className="text-gray-500">Loading profile...</div>
        )}
        </div>
    </div>
  );
}
