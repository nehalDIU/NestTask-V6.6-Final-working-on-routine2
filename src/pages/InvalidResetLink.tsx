import { useNavigate } from 'react-router-dom';
import { Layout } from 'lucide-react';

export function InvalidResetLink() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="flex justify-center items-center mb-8">
        <Layout className="w-10 h-10 text-blue-600" />
        <h1 className="text-center text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 ml-2">
          NestTask
        </h1>
      </div>
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Invalid Reset Link</h1>
          <p className="mt-2 text-gray-600">
            This password reset link is invalid or has expired.
          </p>
          <p className="mt-2 text-gray-500">
            Please request a new password reset link from the login page.
          </p>
        </div>
        <div className="mt-6">
          <button
            onClick={() => navigate('/auth')}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to Login
          </button>
        </div>
      </div>
    </div>
  );
} 