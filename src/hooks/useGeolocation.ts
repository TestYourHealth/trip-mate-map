import { useState, useEffect, useCallback, useRef } from 'react';

export interface GeolocationPosition {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface GeolocationState {
  position: GeolocationPosition | null;
  error: string | null;
  isTracking: boolean;
  isSupported: boolean;
  compassHeading: number | null;
}

// Calculate heading from two positions
const calculateHeading = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const x = Math.sin(dLng) * Math.cos(lat2Rad);
  const y = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  let heading = Math.atan2(x, y) * 180 / Math.PI;
  return (heading + 360) % 360;
};

export const useGeolocation = (options?: PositionOptions) => {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isTracking: false,
    isSupported: 'geolocation' in navigator,
    compassHeading: null
  });

  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const calculatedHeadingRef = useRef<number | null>(null);
  const compassHeadingRef = useRef<number | null>(null);

  // Handle compass/device orientation
  useEffect(() => {
    let isMounted = true;
    
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!isMounted) return;
      
      // webkitCompassHeading for iOS, alpha for Android
      let heading: number | null = null;
      
      if ('webkitCompassHeading' in event && typeof (event as any).webkitCompassHeading === 'number') {
        // iOS - webkitCompassHeading is already calibrated to north
        heading = (event as any).webkitCompassHeading;
      } else if (event.alpha !== null && event.absolute) {
        // Android with absolute orientation - alpha is the compass heading
        heading = (360 - event.alpha) % 360;
      } else if (event.alpha !== null) {
        // Fallback for non-absolute orientation
        heading = (360 - event.alpha) % 360;
      }
      
      if (heading !== null && !isNaN(heading) && isFinite(heading)) {
        compassHeadingRef.current = heading;
        setState(prev => ({ ...prev, compassHeading: heading }));
      }
    };

    // Request permission for iOS 13+
    const requestPermission = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true);
          }
        } catch (error) {
          console.warn('Compass permission denied:', error);
        }
      } else {
        // No permission needed (Android or older iOS)
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    };

    requestPermission();

    return () => {
      isMounted = false;
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  const startTracking = useCallback(() => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported' }));
      return;
    }

    setState(prev => ({ ...prev, isTracking: true, error: null }));

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 1000,
      ...options
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        const speed = position.coords.speed;
        
        // Determine best heading source
        let heading = position.coords.heading;
        
        // If moving fast, use GPS heading
        if (speed !== null && speed > 1) {
          // GPS heading is reliable when moving
          heading = position.coords.heading;
        } else if (compassHeadingRef.current !== null) {
          // When stationary or slow, use compass
          heading = compassHeadingRef.current;
        } else if (lastPositionRef.current) {
          // Fallback: calculate from movement
          const distance = Math.sqrt(
            Math.pow(newLat - lastPositionRef.current.lat, 2) + 
            Math.pow(newLng - lastPositionRef.current.lng, 2)
          );
          
          if (distance > 0.00005) {
            heading = calculateHeading(
              lastPositionRef.current.lat,
              lastPositionRef.current.lng,
              newLat,
              newLng
            );
            calculatedHeadingRef.current = heading;
          } else {
            heading = calculatedHeadingRef.current;
          }
        }
        
        lastPositionRef.current = { lat: newLat, lng: newLng };
        
        setState(prev => ({
          ...prev,
          position: {
            lat: newLat,
            lng: newLng,
            accuracy: position.coords.accuracy,
            heading: heading,
            speed: speed,
            timestamp: position.timestamp
          },
          error: null
        }));
      },
      (error) => {
        let errorMessage = 'Unknown error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable. Check GPS settings.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Retrying...';
            break;
        }
        setState(prev => ({ ...prev, error: errorMessage }));
      },
      geoOptions
    );
  }, [state.isSupported, options]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    lastPositionRef.current = null;
    calculatedHeadingRef.current = null;
    setState(prev => ({ ...prev, isTracking: false }));
  }, []);

  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!state.isSupported) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Use compass heading if available
          const heading = compassHeadingRef.current ?? position.coords.heading;
          
          const geoPosition: GeolocationPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          };
          setState(prev => ({ ...prev, position: geoPosition, error: null }));
          resolve(geoPosition);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000
        }
      );
    });
  }, [state.isSupported]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
    getCurrentPosition
  };
};
