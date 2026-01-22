import React, { useEffect, useState } from 'react';
import { useNativeBridge } from '@/hooks/useNativeBridge';
import { toast } from 'sonner';

interface NativeAppWrapperProps {
  children: React.ReactNode;
}

const NativeAppWrapper: React.FC<NativeAppWrapperProps> = ({ children }) => {
  const { isNativeApp, checkConnectivity } = useNativeBridge({
    statusBarColor: '#0f9488',
    statusBarStyle: 'light',
  });
  const [isOnline, setIsOnline] = useState(true);

  // Handle back button for Android
  useEffect(() => {
    const handleBackButton = (e: PopStateEvent) => {
      // Let React Router handle navigation
      // This prevents the app from closing on back button
    };

    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, []);

  // Monitor connectivity
  useEffect(() => {
    const checkConnection = async () => {
      const status = await checkConnectivity();
      setIsOnline(status.connected);
    };

    checkConnection();

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('इंटरनेट कनेक्शन वापस आ गया!');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('ऑफलाइन मोड - कुछ features काम नहीं करेंगे');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnectivity]);

  // Prevent context menu on long press (native feel)
  useEffect(() => {
    const preventContextMenu = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', preventContextMenu);
    return () => document.removeEventListener('contextmenu', preventContextMenu);
  }, []);

  // Handle keyboard visibility for better UX - debounced to prevent forced reflows
  useEffect(() => {
    let rafId: number | null = null;
    let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const vh = window.innerHeight * 0.01;
          document.documentElement.style.setProperty('--vh', `${vh}px`);
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.visualViewport?.addEventListener('resize', handleResize, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (debounceTimeout) clearTimeout(debounceTimeout);
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="native-app-container h-full w-full">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-center py-1 text-xs z-[9999] safe-area-top">
          ऑफलाइन मोड
        </div>
      )}
      {children}
    </div>
  );
};

export default NativeAppWrapper;
