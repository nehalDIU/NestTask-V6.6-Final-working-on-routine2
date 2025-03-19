import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';
// Import workbox config with type casting
// @ts-ignore
import * as workboxConfigModule from './workbox-config.js';
const workboxConfig = workboxConfigModule.default as Record<string, any>;

// Define algorithm type to avoid type errors
type CompressionAlgorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'service-worker.js',
      registerType: 'prompt',
      injectManifest: {
        ...workboxConfig,
        injectionPoint: 'self.__WB_MANIFEST'
      },
      includeAssets: [
        'favicon.ico', 
        'robots.txt', 
        'icons/*.png',
        'manifest.json',
        'offline.html'
      ],
      manifest: {
        name: 'NestTask',
        short_name: 'NestTask',
        description: 'A modern task management application for teams and individuals',
        theme_color: '#0284c7',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/?source=pwa',
        categories: ['productivity', 'education', 'utilities'],
        screenshots: [
          {
            src: '/screenshots/desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            platform: 'wide',
            label: 'NestTask Desktop View'
          },
          {
            src: '/screenshots/mobile.png',
            sizes: '750x1334',
            type: 'image/png',
            platform: 'narrow',
            label: 'NestTask Mobile View'
          }
        ],
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/maskable-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Add Task',
            short_name: 'Add',
            description: 'Create a new task',
            url: '/add-task?source=pwa',
            icons: [{ src: '/icons/add-task.png', sizes: '192x192' }]
          },
          {
            name: 'View Tasks',
            short_name: 'Tasks',
            description: 'View your tasks',
            url: '/tasks?source=pwa',
            icons: [{ src: '/icons/view-tasks.png', sizes: '192x192' }]
          }
        ],
        related_applications: [
          {
            platform: 'web',
            url: 'https://nesttask.app'
          }
        ],
        prefer_related_applications: false
      },
      devOptions: {
        enabled: true,
        type: 'classic',
        navigateFallback: 'index.html'
      }
    }),
    compression({
      algorithm: 'brotliCompress' as CompressionAlgorithm,
      ext: '.br'
    }),
    compression({
      algorithm: 'gzip' as CompressionAlgorithm,
      ext: '.gz'
    }),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ],
  build: {
    // Enable minification and tree shaking
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    cssMinify: true,
    target: 'es2018',
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React dependencies
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          
          // Date handling
          if (id.includes('node_modules/date-fns/')) {
            return 'date-utils';
          }
          
          // UI component libraries
          if (id.includes('node_modules/@radix-ui/') || 
              id.includes('node_modules/framer-motion/')) {
            return 'ui-components';
          }
          
          // Supabase
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase';
          }
          
          // Icons
          if (id.includes('node_modules/lucide-react/')) {
            return 'icons';
          }
          
          // Charts
          if (id.includes('node_modules/recharts/') || 
              id.includes('node_modules/d3/')) {
            return 'charts';
          }
          
          // Workbox (for service worker)
          if (id.includes('node_modules/workbox-')) {
            return 'workbox';
          }
        },
        // Ensure proper file types and names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || '';
          if (info.endsWith('.css')) {
            return 'assets/css/[name].[hash][extname]';
          }
          if (info.endsWith('.png') || info.endsWith('.jpg') || 
              info.endsWith('.jpeg') || info.endsWith('.svg') || 
              info.endsWith('.gif') || info.endsWith('.webp') || 
              info.endsWith('.avif')) {
            return 'assets/images/[name].[hash][extname]';
          }
          if (info.endsWith('.woff') || info.endsWith('.woff2') || 
              info.endsWith('.ttf') || info.endsWith('.otf') || 
              info.endsWith('.eot')) {
            return 'assets/fonts/[name].[hash][extname]';
          }
          return 'assets/[name].[hash][extname]';
        },
        // Optimize chunk names
        chunkFileNames: 'assets/js/[name].[hash].js',
        entryFileNames: 'assets/js/[name].[hash].js',
      }
    },
    // Enable source map optimization
    sourcemap: process.env.NODE_ENV !== 'production',
    // Enable chunk size optimization
    chunkSizeWarningLimit: 1000,
    // Add asset optimization
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    modulePreload: true
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'date-fns',
      '@radix-ui/react-dialog',
      'framer-motion',
      'react-router-dom',
      'recharts',
      'workbox-window'
    ],
    exclude: ['@vercel/analytics']
  },
  // Improve dev server performance
  server: {
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: false
    },
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "cross-origin"
    }
  },
  // Improve preview server performance
  preview: {
    port: 4173,
    strictPort: true,
    headers: {
      "Cache-Control": "public, max-age=31536000",
      "Content-Security-Policy": "default-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src 'none';",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block"
    }
  },
  // Speed up first dev startup by caching
  cacheDir: 'node_modules/.vite'
});