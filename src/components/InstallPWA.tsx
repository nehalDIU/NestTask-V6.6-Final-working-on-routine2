import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    console.log('InstallPWA component mounted, waiting for beforeinstallprompt event');
    
    const handler = (e: any) => {
      console.log('beforeinstallprompt event triggered!', e);
      
      // IMPORTANT: Do NOT preventDefault here - this was causing the issue
      // The browser needs to handle the event normally first
      
      // Store the event for later use
      setDeferredPrompt(e);
      
      // Make sure the event is also available globally for other components
      (window as any).deferredPrompt = e;
      
      // Show either the banner or button based on user's previous choice
      const hasClosedBanner = localStorage.getItem('pwa-banner-closed');
      if (!hasClosedBanner) {
        console.log('Showing install banner (user has not closed it before)');
        setShowBanner(true);
      } else {
        console.log('Showing install button (user has closed banner before)');
        setShowInstallButton(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if the app is already installed
    const handleAppInstalled = (e: Event) => {
      console.log('App was installed', e);
      setShowInstallButton(false);
      setShowBanner(false);
      localStorage.setItem('pwa-installed', 'true');
      // Clear the deferred prompt
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if we already have a stored prompt (might happen if component remounts)
    if ((window as any).deferredPrompt) {
      console.log('Found existing deferredPrompt, restoring state');
      setDeferredPrompt((window as any).deferredPrompt);
      
      const hasClosedBanner = localStorage.getItem('pwa-banner-closed');
      if (!hasClosedBanner) {
        setShowBanner(true);
      } else {
        setShowInstallButton(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    console.log('Install button clicked, deferredPrompt:', deferredPrompt);
    if (!deferredPrompt) {
      console.warn('No deferred prompt available, cannot install');
      return;
    }

    try {
      console.log('Calling prompt() method');
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('Installation outcome:', outcome);
      if (outcome === 'accepted') {
        // User accepted the install prompt
        console.log('User accepted the install prompt');
        setDeferredPrompt(null);
        (window as any).deferredPrompt = null;
        setShowInstallButton(false);
        setShowBanner(false);
      } else {
        // User dismissed the install prompt
        console.log('User dismissed the install prompt');
        // Keep the button/banner visible in case they want to install later
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  };

  const handleCloseBanner = () => {
    console.log('Banner closed by user');
    setShowBanner(false);
    setShowInstallButton(true);
    localStorage.setItem('pwa-banner-closed', 'true');
  };

  if (!showBanner && !showInstallButton) return null;

  if (showBanner) {
    return (
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 animate-slide-up z-50 flex gap-3">
        <button 
          onClick={handleCloseBanner}
          className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg"
          aria-label="Close banner"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        
        <div className="flex-grow">
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">Install NestTask</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Install NestTask for quick access and a better experience
          </p>
          
          <button
            onClick={handleInstall}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Install App
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-20 right-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-colors animate-slide-up z-40"
      aria-label="Install app"
    >
      <Download className="w-5 h-5" />
      <span>Install App</span>
    </button>
  );
}