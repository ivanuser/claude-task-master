'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { ChartBarIcon } from '@heroicons/react/24/outline';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');

  let errorMessage = 'An authentication error occurred.';
  let errorDescription = 'Please try again.';

  switch (error) {
    case 'Configuration':
      errorMessage = 'Server configuration error';
      errorDescription = 'Please contact support.';
      break;
    case 'AccessDenied':
      errorMessage = 'Access denied';
      errorDescription = 'You do not have permission to sign in.';
      break;
    case 'Verification':
      errorMessage = 'Verification failed';
      errorDescription = 'The verification link may have expired.';
      break;
    case 'Default':
    default:
      errorMessage = 'Authentication failed';
      errorDescription = 'Unable to sign in. Please try again.';
      break;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center items-center mb-6">
            <ChartBarIcon className="h-12 w-12 text-blue-600" />
            <span className="ml-3 text-2xl font-bold text-gray-900">Task Master</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            Authentication Error
          </h2>
        </div>

        {/* Error Message */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">
            {errorMessage}
          </h3>
          <p className="text-red-700 mb-4">
            {errorDescription}
          </p>
          {error && (
            <p className="text-sm text-red-600 font-mono bg-red-100 p-2 rounded">
              Error code: {error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/auth/signin')}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}