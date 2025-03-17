/**
 * Environment detection and URL utilities
 */

// Production domain
export const PRODUCTION_URL = 'https://nesttask.vercel.app';

/**
 * Checks if the app is running in a production environment
 */
export function isProduction(): boolean {
  if (typeof window === 'undefined') return true; // Default to production for SSR
  
  const hostname = window.location.hostname;
  return hostname.includes('vercel.app') || 
         hostname === 'nesttask.vercel.app' ||
         !hostname.includes('localhost');
}

/**
 * Gets the base URL for the current environment
 */
export function getBaseUrl(): string {
  // Force production URL for auth redirects even in development
  // This ensures reset password links always point to production
  return PRODUCTION_URL;
}

/**
 * Gets the appropriate URL for auth redirects
 */
export function getAuthRedirectUrl(path: string): string {
  const baseUrl = getBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  console.log('Generated auth redirect URL:', `${baseUrl}${normalizedPath}`);
  return `${baseUrl}${normalizedPath}`;
} 