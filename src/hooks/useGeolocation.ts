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
    isSupported: 'geolocation' in navigator
  });

  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const calculatedHeadingRef = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported' }));
      return;
    }

    setState(prev => ({ ...prev, isTracking: true, error: null }));

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 1000, // Allow 1 second cache for smoother updates
      ...options
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        
        // Calculate heading from movement if device doesn't provide it
        let heading = position.coords.heading;
        
        if (lastPositionRef.current && (heading === null || heading === undefined)) {
          const distance = Math.sqrt(
            Math.pow(newLat - lastPositionRef.current.lat, 2) + 
            Math.pow(newLng - lastPositionRef.current.lng, 2)
          );
          
          // Only calculate heading if moved enough (about 5 meters)
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
            speed: position.coords.speed,
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
          const geoPosition: GeolocationPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
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
