import { useEffect, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { findCityFromLocation, defaultFuelPrices, CityFuelPrices } from '@/data/cityFuelPrices';
import { toast } from 'sonner';

export function useAutoDetectLocation() {
  const [, setFuelPrices] = useLocalStorage<CityFuelPrices>('fuelPrices', defaultFuelPrices);
  const [, setCurrentCity] = useLocalStorage('currentCity', '');
  const [, setLastUpdated] = useLocalStorage('fuelPricesLastUpdated', '');
  const [hasAutoDetected, setHasAutoDetected] = useLocalStorage('hasAutoDetectedLocation', false);
  const attemptedRef = useRef(false);

  useEffect(() => {
    // Only auto-detect once per session and device
    if (hasAutoDetected || attemptedRef.current) return;
    attemptedRef.current = true;

    const detectLocation = async () => {
      if (!navigator.geolocation) {
        setHasAutoDetected(true);
        return;
      }

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false, // Faster with lower accuracy
            timeout: 8000,
            maximumAge: 600000 // Cache for 10 minutes
          });
        });

        const { latitude, longitude } = position.coords;
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
          { 
            headers: { 
              'User-Agent': 'TripMate/1.0',
              'Accept': 'application/json'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Geocoding failed');
        }
        
        const data = await response.json();
        const address = data.address || {};
        
        // Build location string from all possible fields
        const locationParts = [
          address.city,
          address.town,
          address.village,
          address.municipality,
          address.county,
          address.state_district,
          address.state
        ].filter(Boolean);
        
        const locationString = locationParts.join(' ');
        const cityData = findCityFromLocation(locationString);
        
        if (cityData) {
          setFuelPrices(cityData.prices);
          setCurrentCity(`${cityData.name}, ${cityData.state}`);
          setLastUpdated(new Date().toISOString());
          toast.success(`📍 ${cityData.name} की fuel prices set हो गई!`);
        } else {
          // Set city name even if no price data found
          const cityName = address.city || address.town || address.village || 'Unknown';
          setCurrentCity(cityName);
        }
        
        setHasAutoDetected(true);
      } catch (error) {
        console.warn('Auto-detect location failed:', error);
        setHasAutoDetected(true);
      }
    };

    // Small delay to not block initial render
    const timeoutId = setTimeout(detectLocation, 500);
    return () => clearTimeout(timeoutId);
  }, [hasAutoDetected, setFuelPrices, setCurrentCity, setLastUpdated, setHasAutoDetected]);
}
