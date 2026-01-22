import { useEffect, useCallback } from 'react';

// Median.co / GoNative bridge interface
declare global {
  interface Window {
    gonative?: {
      statusbar?: {
        set: (options: { style?: 'dark' | 'light'; color?: string; overlay?: boolean }) => void;
      };
      share?: {
        sharePage: (options: { url?: string; text?: string }) => void;
        downloadFile: (options: { url: string; filename?: string; open?: boolean }) => void;
      };
      clipboard?: {
        set: (options: { data: string }) => void;
        get: (callback: (data: string) => void) => void;
      };
      connectivity?: {
        get: (callback: (status: { connected: boolean; type?: string }) => void) => void;
        subscribe: (callback: (status: { connected: boolean; type?: string }) => void) => void;
      };
      deviceInfo?: {
        get: (callback: (info: { platform: string; appVersion: string; model?: string }) => void) => void;
      };
      geolocation?: {
        requestLocation: (callback: (location: { latitude: number; longitude: number }) => void) => void;
      };
      keyboard?: {
        info: (callback: (info: { visible: boolean; height: number }) => void) => void;
      };
    };
    median?: typeof window.gonative; // Alias for median.co
  }
}

interface NativeBridgeOptions {
  statusBarColor?: string;
  statusBarStyle?: 'dark' | 'light';
}

export const useNativeBridge = (options?: NativeBridgeOptions) => {
  const isNativeApp = typeof window !== 'undefined' && (!!window.gonative || !!window.median);
  const bridge = window.gonative || window.median;

  // Set status bar on mount
  useEffect(() => {
    if (bridge?.statusbar) {
      bridge.statusbar.set({
        style: options?.statusBarStyle || 'light',
        color: options?.statusBarColor || '#0f9488',
        overlay: false,
      });
    }
  }, [bridge, options?.statusBarColor, options?.statusBarStyle]);

  // Share content using native share sheet
  const shareContent = useCallback((text: string, url?: string) => {
    if (bridge?.share) {
      bridge.share.sharePage({ text, url });
    } else if (navigator.share) {
      navigator.share({ text, url }).catch(() => {});
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard?.writeText(url || text);
    }
  }, [bridge]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string) => {
    if (bridge?.clipboard) {
      bridge.clipboard.set({ data: text });
    } else {
      navigator.clipboard?.writeText(text);
    }
  }, [bridge]);

  // Get device info
  const getDeviceInfo = useCallback(() => {
    return new Promise<{ platform: string; appVersion: string; model?: string }>((resolve) => {
      if (bridge?.deviceInfo) {
        bridge.deviceInfo.get(resolve);
      } else {
        resolve({
          platform: /android/i.test(navigator.userAgent) ? 'android' : 
                   /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : 'web',
          appVersion: '1.0.0',
        });
      }
    });
  }, [bridge]);

  // Check connectivity
  const checkConnectivity = useCallback(() => {
    return new Promise<{ connected: boolean; type?: string }>((resolve) => {
      if (bridge?.connectivity) {
        bridge.connectivity.get(resolve);
      } else {
        resolve({ connected: navigator.onLine });
      }
    });
  }, [bridge]);

  // Request native location (more accurate than web API)
  const requestNativeLocation = useCallback(() => {
    return new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      if (bridge?.geolocation) {
        bridge.geolocation.requestLocation(resolve);
      } else {
        resolve(null); // Fall back to web geolocation
      }
    });
  }, [bridge]);

  return {
    isNativeApp,
    shareContent,
    copyToClipboard,
    getDeviceInfo,
    checkConnectivity,
    requestNativeLocation,
  };
};

export default useNativeBridge;
