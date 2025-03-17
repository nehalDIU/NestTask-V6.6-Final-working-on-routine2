import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function ResetPasswordRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    console.log('Reset Password Redirect Handler Activated');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', location.search);
    
    // Extract the code from the URL
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get('code');
    
    if (code) {
      // We found a reset code, handle it
      console.log('Found reset code in URL:', code);
      console.log('Reset code length:', code.length);
      console.log('Reset code format valid:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(code));
      
      // Redirect to the reset password page with the code
      // This works regardless of whether we're on localhost or production
      navigate(`/reset-password?code=${code}`, { replace: true });
    } else {
      console.log('No reset code found in URL, redirecting to login');
      navigate('/auth', { replace: true });
    }
  }, [location, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing password reset link...</p>
        <p className="text-sm text-gray-500 mt-2">Please wait while we validate your reset code</p>
      </div>
    </div>
  );
} 