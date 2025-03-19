// Workbox configuration for service worker generation
export default {
  // Directory with built assets to be cached
  globDirectory: 'dist/',
  
  // Patterns to match for precaching
  globPatterns: [
    '**/*.{js,css,html}',
    '**/assets/*.{js,css,woff2}',
    'icons/*.{png,svg}',
    'manifest.json',
    'offline.html'
  ],
  
  // Ignore patterns
  globIgnores: ['**/node_modules/**/*', '**/*.map', '**/*.txt'],
  
  // Where to output the generated service worker
  swDest: 'dist/service-worker.js',
  
  // Increase the limit for assets that can be precached
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB
  
  // Don't allow the service worker to try to cache the URL that triggered its installation
  skipWaiting: true,
  
  // Take control of all open clients once installed
  clientsClaim: true,
  
  // Don't precache URLs containing these parameters
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
  
  // Define runtime caching rules for network requests
  runtimeCaching: [
    {
      // Match all font requests from Google Fonts
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    {
      // Match all API requests
      urlPattern: /\/api\//,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      // Match all image requests
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      // Default handler for everything else
      urlPattern: /.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'default-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
}; 