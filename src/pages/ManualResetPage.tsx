import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ManualResetPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [sessionVerified, setSessionVerified] = useState(false);
  const [codeFound, setCodeFound] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract code from URL considering various formats
  const extractCodeFromUrl = () => {
    // First check query parameters
    const searchParams = new URLSearchParams(window.location.search);
    const searchCode = searchParams.get('code');
    
    // Then check hash fragments
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashCode = hashParams.get('code');
    
    // Return the first found code
    const code = searchCode || hashCode || null;
    
    console.log('Extracted code from URL:', code);
    console.log('Full URL:', window.location.href);
    console.log('URL search part:', window.location.search);
    console.log('URL hash part:', window.location.hash);
    
    return code;
  };
  
  // Function to manually exchange the code for a session
  const exchangeCodeForSession = async (code: string) => {
    try {
      console.log('Manually exchanging code for session');
      console.log('Code length:', code.length);
      
      // Using Supabase's session handling for password recovery
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Error exchanging code for session:', error);
        setError('Invalid or expired recovery link. Please request a new password reset link.');
        return false;
      }
      
      console.log('Session established successfully:', !!data.session);
      setSessionVerified(true);
      return true;
    } catch (err) {
      console.error('Error during code exchange:', err);
      setError('Failed to verify your recovery code. Please request a new password reset link.');
      return false;
    }
  };
  
  useEffect(() => {
    // Set page title and log debug info
    document.title = 'Reset Password - NestTask';
    
    // Logging for debugging
    console.log('===== ManualResetPage Loaded =====');
    console.log('Current URL:', window.location.href);
    console.log('URL search:', window.location.search);
    console.log('URL hash:', window.location.hash);
    
    // Try to extract code from the URL
    const code = extractCodeFromUrl();
    setCodeFound(code);
    
    // Update debug info
    setDebugInfo({
      url: window.location.href,
      search: window.location.search,
      hash: window.location.hash,
      hasCode: !!code,
      code: code
    });
    
    // If we have a code, automatically verify it on page load
    if (code) {
      console.log('Found code in URL, attempting to exchange for session');
      exchangeCodeForSession(code);
    } else {
      console.log('No code found in URL');
      setError('No reset code found in URL. Please request a new password reset link.');
    }
  }, [location]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Get the code from URL
      const code = codeFound;
      
      if (!code) {
        throw new Error('No reset code found in URL. Please request a new password reset link.');
      }
      
      // Ensure we have a valid session before continuing
      if (!sessionVerified) {
        const verified = await exchangeCodeForSession(code);
        if (!verified) {
          throw new Error('Could not verify the recovery code. Please request a new password reset link.');
        }
      }
      
      console.log('Attempting to reset password');
      
      // With the session established, we can update the password
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        console.error('Password reset error:', error);
        throw error;
      }
      
      setSuccess(true);
      console.log('Password reset successful!');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
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
          <h1 className="text-2xl font-bold text-gray-900">Reset Your Password</h1>
          <p className="mt-2 text-gray-600">
            Please enter your new password below.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Debug Info - only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-3 bg-gray-100 rounded-md text-xs font-mono">
            <p>Debug Info:</p>
            <pre>{JSON.stringify({...debugInfo, sessionVerified}, null, 2)}</pre>
          </div>
        )}
        
        {success ? (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Password reset successful! Redirecting to login...
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="password" className="sr-only">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 