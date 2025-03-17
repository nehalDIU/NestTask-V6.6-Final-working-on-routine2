import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function ResetPasswordRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Debug the current URL
    console.log('Redirect handler activated');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', location.search);
    
    // Extract the code from the URL
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get('code');
    
    if (code) {
      console.log('Found reset code, redirecting to reset password page');
      
      // Redirect to our reset password page with the code preserved
      navigate(`/reset-password?code=${code}`, { replace: true });
    } else {
      console.log('No reset code found, redirecting to login');
      navigate('/auth', { replace: true });
    }
  }, [location, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to password reset...</p>
      </div>
    </div>
  );
} 