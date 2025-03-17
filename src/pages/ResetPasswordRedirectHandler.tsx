import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function ResetPasswordRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const [debugInfo, setDebugInfo] = useState('');
  
  useEffect(() => {
    console.log('===== Reset Password Redirect Handler =====');
    console.log('Current URL:', window.location.href);
    console.log('URL path:', window.location.pathname);
    console.log('URL search:', window.location.search);
    console.log('URL hash:', window.location.hash);

    // Extract the code from different possible URL formats
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    
    // Alternative locations to look for the code
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashCode = hashParams.get('code');
    
    const finalCode = code || hashCode;
    
    setDebugInfo(`URL: ${window.location.href}, Code found: ${!!finalCode}, Code: ${finalCode}`);
    
    if (finalCode) {
      console.log('Found reset code, redirecting to reset password page');
      console.log('Code:', finalCode);
      
      // Use a small timeout to ensure the redirect happens after React rendering
      setTimeout(() => {
        navigate(`/reset-password?code=${finalCode}`, { replace: true });
      }, 100);
    } else {
      console.log('No reset code found, redirecting to login');
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 100);
    }
  }, [location, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to password reset...</p>
        <p className="text-xs text-gray-400 mt-2">
          If you are not redirected, <a href="/reset-password" className="text-blue-500">click here</a>.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs font-mono text-left max-w-lg mx-auto overflow-auto">
            <p>Debug info:</p>
            <pre>{debugInfo}</pre>
          </div>
        )}
      </div>
    </div>
  );
} 