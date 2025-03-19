import React, { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { checkWebPSupport, convertToWebP, createTinyPreview, createResponsiveSrcSet } from '../utils/imageOptimizer';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  lazyLoad?: boolean;
  useWebP?: boolean;
  useSrcSet?: boolean;
  useBlurUp?: boolean;
  sizes?: string;
  widths?: number[];
  placeholder?: string;
  critical?: boolean;
  fallback?: string;
  onLoadingComplete?: () => void;
  className?: string;
  imgClassName?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  quality = 0.8,
  lazyLoad = true,
  useWebP = true,
  useSrcSet = true,
  useBlurUp = true,
  sizes = '100vw',
  widths = [640, 750, 828, 1080, 1200, 1920],
  placeholder,
  critical = false,
  fallback,
  onLoadingComplete,
  className = '',
  imgClassName = '',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [imgSrc, setImgSrc] = useState<string>(critical ? src : (placeholder || ''));
  const [imgSrcSet, setImgSrcSet] = useState<string>('');
  const [blurPlaceholder, setBlurPlaceholder] = useState<string>('');
  const [useNativeLoading, setUseNativeLoading] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Detect if browser supports native lazy loading
    if ('loading' in HTMLImageElement.prototype) {
      setUseNativeLoading(true);
    }
    
    // Initialize image
    initializeImage();
    
    // Set up intersection observer if needed
    if (lazyLoad && !critical && !useNativeLoading) {
      setupLazyLoading();
    }
    
    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current);
        observerRef.current.disconnect();
      }
    };
  }, [src, critical, lazyLoad, useWebP, useSrcSet, useBlurUp]);

  const initializeImage = async () => {
    try {
      // Generate blur placeholder if needed
      if (useBlurUp && !placeholder && !isLoaded) {
        const tinyPreview = await createTinyPreview(src);
        setBlurPlaceholder(tinyPreview);
      }
      
      // Convert to WebP if supported and requested
      let optimizedSrc = src;
      if (useWebP) {
        const isWebPSupported = await checkWebPSupport();
        if (isWebPSupported) {
          if (critical) {
            // For critical images, convert immediately
            optimizedSrc = await convertToWebP(src, quality);
            setImgSrc(optimizedSrc);
          } else {
            // For non-critical, set flag to convert when loaded
            optimizedSrc = src;
          }
        }
      }
      
      // Generate srcset if requested
      if (useSrcSet) {
        const srcSet = createResponsiveSrcSet(optimizedSrc, widths, useWebP ? 'webp' : 'jpg');
        setImgSrcSet(srcSet);
      }
      
      // Set src if critical (eager loading) or if using native lazy loading
      if (critical || useNativeLoading) {
        setImgSrc(optimizedSrc);
      }
    } catch (error) {
      console.error('Error initializing optimized image:', error);
      // Fallback to original image
      setImgSrc(src);
    }
  };

  const setupLazyLoading = () => {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver
      setImgSrc(src);
      return;
    }
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Load actual image
          setImgSrc(src);
          
          // Stop observing
          if (observerRef.current && imgRef.current) {
            observerRef.current.unobserve(imgRef.current);
          }
        }
      },
      {
        rootMargin: '200px 0px',
        threshold: 0.01
      }
    );
    
    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }
  };

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoadingComplete) {
      onLoadingComplete();
    }
  };

  const handleError = () => {
    console.error(`Failed to load image: ${src}`);
    if (fallback) {
      setImgSrc(fallback);
    }
  };

  // Determine loading attribute
  const loadingAttr = lazyLoad && useNativeLoading && !critical ? 'lazy' : undefined;
  
  // Determine placeholder style for blur-up effect
  const placeholderStyle = useBlurUp && !isLoaded && (blurPlaceholder || placeholder) ? {
    filter: 'blur(20px)',
    transition: 'filter 0.3s ease-out'
  } : {};

  return (
    <div className={`optimized-image-container ${className}`} style={{ position: 'relative', overflow: 'hidden' }}>
      <img
        ref={imgRef}
        src={imgSrc}
        srcSet={imgSrcSet}
        sizes={useSrcSet ? sizes : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={loadingAttr}
        onLoad={handleLoad}
        onError={handleError}
        className={`optimized-image ${isLoaded ? 'loaded' : ''} ${imgClassName}`}
        style={{
          ...placeholderStyle,
          width: '100%',
          height: 'auto',
          display: 'block'
        }}
        data-critical={critical}
        data-testid="optimized-image"
        {...props}
      />
      
      {/* Transparent placeholder for maintaining aspect ratio if height/width provided */}
      {width && height && (
        <div 
          className="aspect-ratio-placeholder"
          style={{
            paddingBottom: `${(height / width) * 100}%`,
            position: 'relative',
          }}
        />
      )}
    </div>
  );
};

export default OptimizedImage; 