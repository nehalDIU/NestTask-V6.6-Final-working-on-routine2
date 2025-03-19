/**
 * Image Optimization Utilities
 * 
 * This module provides tools for optimizing images on the client-side:
 * - Converting images to WebP format when supported
 * - Creating responsive image srcsets
 * - Implementing lazy loading
 * - Applying blur-up technique for progressive loading
 */

/**
 * Check if the browser supports WebP
 */
let webpSupported: boolean | null = null;

export async function checkWebPSupport(): Promise<boolean> {
  if (webpSupported !== null) return webpSupported;
  
  return new Promise((resolve) => {
    const webpImage = new Image();
    
    webpImage.onload = function() {
      webpSupported = true;
      resolve(true);
    };
    
    webpImage.onerror = function() {
      webpSupported = false;
      resolve(false);
    };
    
    webpImage.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  });
}

/**
 * Convert an image to WebP format using Canvas
 */
export async function convertToWebP(
  imageUrl: string, 
  quality = 0.8
): Promise<string> {
  // Check WebP support first
  const isWebPSupported = await checkWebPSupport();
  if (!isWebPSupported) return imageUrl;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image to canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageUrl); // Fallback to original if canvas context fails
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        // Convert to WebP
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        resolve(webpDataUrl);
      } catch (error) {
        console.error('Error converting image to WebP:', error);
        resolve(imageUrl); // Fallback to original on error
      }
    };
    
    img.onerror = () => {
      console.error('Error loading image for WebP conversion');
      resolve(imageUrl); // Fallback to original on error
    };
    
    img.src = imageUrl;
  });
}

/**
 * Create a responsive image srcset with multiple sizes
 */
export function createResponsiveSrcSet(
  baseUrl: string,
  widths: number[] = [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  format = 'webp'
): string {
  // This function assumes your server can generate resized images
  // e.g., "image.jpg?width=640" or "image_640.jpg"
  
  // Parse the URL to separate path and extension
  const urlParts = baseUrl.split('.');
  const extension = urlParts.pop() || '';
  const basePath = urlParts.join('.');
  
  // Generate srcset entries
  return widths
    .map(width => {
      // Use either of these patterns based on your server's URL structure
      // Option 1: Query parameter (image.jpg?width=640)
      const resizedUrl = `${baseUrl}?width=${width}&format=${format}`;
      
      // Option 2: Path-based (image_640.webp)
      // const resizedUrl = `${basePath}_${width}.${format}`;
      
      return `${resizedUrl} ${width}w`;
    })
    .join(', ');
}

/**
 * Create a tiny preview image for blur-up effect
 */
export async function createTinyPreview(
  imageUrl: string,
  size = 20
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Create tiny canvas
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = Math.floor((size * img.height) / img.width);
        
        // Draw downsized image
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(''); // Return empty string if canvas context fails
          return;
        }
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Get tiny image
        const tinyDataUrl = canvas.toDataURL('image/jpeg', 0.1);
        resolve(tinyDataUrl);
      } catch (error) {
        console.error('Error creating tiny preview:', error);
        resolve(''); // Return empty string on error
      }
    };
    
    img.onerror = () => {
      console.error('Error loading image for tiny preview');
      resolve(''); // Return empty string on error
    };
    
    img.src = imageUrl;
  });
}

/**
 * Lazy load images using IntersectionObserver
 */
export function setupLazyLoading(rootMargin = '200px 0px'): void {
  // Only run in browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  // Check if IntersectionObserver is supported
  if (!('IntersectionObserver' in window)) {
    // Fallback for older browsers - load all images immediately
    document.querySelectorAll('img[data-src]').forEach(img => {
      const element = img as HTMLImageElement;
      if (element.dataset.src) {
        element.src = element.dataset.src;
      }
      if (element.dataset.srcset) {
        element.srcset = element.dataset.srcset;
      }
    });
    return;
  }
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        
        const img = entry.target as HTMLImageElement;
        
        // Set the src from data-src
        if (img.dataset.src) {
          img.src = img.dataset.src;
        }
        
        // Set the srcset from data-srcset
        if (img.dataset.srcset) {
          img.srcset = img.dataset.srcset;
        }
        
        // Remove the placeholder blur
        img.classList.remove('blur-up');
        
        // Stop observing the image
        observer.unobserve(img);
      });
    },
    { rootMargin }
  );
  
  // Start observing all images with data-src attribute
  document.querySelectorAll('img[data-src]').forEach(img => {
    observer.observe(img);
  });
}

/**
 * Initialize all image optimization features
 */
export function initImageOptimizations(): void {
  // Check WebP support on startup
  checkWebPSupport().then(supported => {
    console.log(`WebP support: ${supported ? 'Yes' : 'No'}`);
  });
  
  // Setup lazy loading
  setupLazyLoading();
  
  // Pre-load critical images
  document.querySelectorAll('img[data-critical="true"]').forEach(async (img) => {
    const element = img as HTMLImageElement;
    if (element.dataset.src) {
      element.src = element.dataset.src;
    }
  });
}

/**
 * React hook for optimized images
 */
export function useOptimizedImage(
  src: string,
  options: {
    quality?: number;
    lazyLoad?: boolean;
    createSrcSet?: boolean;
    blurUp?: boolean;
    widths?: number[];
  } = {}
): {
  src: string;
  srcSet: string;
  placeholder: string;
  onLoad: () => void;
} {
  const defaultOptions = {
    quality: 0.8,
    lazyLoad: true,
    createSrcSet: true,
    blurUp: true,
    widths: [640, 750, 1080, 1920]
  };
  
  const opts = { ...defaultOptions, ...options };
  
  // In a real implementation, this would use React useState and useEffect
  // This is a simplified version for demonstration
  let optimizedSrc = src;
  let srcSet = '';
  let placeholder = '';
  
  // Placeholder loading function
  const onLoad = () => {
    const img = document.querySelector(`img[src="${optimizedSrc}"]`);
    if (img) {
      img.classList.remove('blur-up');
    }
  };
  
  // WebP conversion would happen in useEffect
  // For brevity, this example returns the original values
  // In a real implementation, these would be state variables updated after async operations
  
  if (opts.createSrcSet) {
    srcSet = createResponsiveSrcSet(src, opts.widths);
  }
  
  return {
    src: optimizedSrc,
    srcSet,
    placeholder,
    onLoad
  };
} 