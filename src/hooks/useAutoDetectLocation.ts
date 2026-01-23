import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { cityFuelPrices, findCityFromLocation, defaultFuelPrices, CityFuelPrices } from '@/data/cityFuelPrices';

export function useAutoDetectLocation() {
  const [, setFuelPrices] = useLocalStorage<CityFuelPrices>('fuelPrices', defaultFuelPrices);
  const [, setCurrentCity] = useLocalStorage('currentCity', '');
  const [, setLastUpdated] = useLocalStorage('fuelPricesLastUpdated', '');
  const [hasAutoDetected, setHasAutoDetected] = useLocalStorage('hasAutoDetectedLocation', false);

  useEffect(() => {
    // Only auto-detect once per device
    if (hasAutoDetected) return;

    const detectLocation = async () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
              { headers: { 'User-Agent': 'TripMate/1.0' } }
            );
            const data = await response.json();
            
            const address = data.address || {};
            const locationString = [
              address.city,
              address.town,
              address.village,
              address.municipality,
              address.county,
              address.state_district,
              address.state
            ].filter(Boolean).join(' ');
            
            const cityData = findCityFromLocation(locationString);
            
            if (cityData) {
              setFuelPrices(cityData.prices);
              setCurrentCity(cityData.name);
              setLastUpdated(new Date().toISOString());
              console.log(`Auto-detected location: ${cityData.name}`);
            }
            
            setHasAutoDetected(true);
          } catch (error) {
            console.warn('Auto-detect location failed:', error);
            setHasAutoDetected(true);
          }
        },
        () => {
          // User denied or error - mark as attempted
          setHasAutoDetected(true);
        },
        { timeout: 10000, maximumAge: 300000 }
      );
    };

    detectLocation();
  }, [hasAutoDetected, setFuelPrices, setCurrentCity, setLastUpdated, setHasAutoDetected]);
}
