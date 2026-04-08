import { useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useTheme } from './useTheme';
import { getSunTimes } from './useSunCalc';

type ThemeMode = 'light' | 'dark' | 'auto';

export function useAutoTheme() {
  const { setTheme, isDark } = useTheme();
  const [themeMode, setThemeMode] = useLocalStorage<ThemeMode>('themeMode', 'light');

  const checkTimeAndSetTheme = useCallback(() => {
    if (themeMode !== 'auto') return;

    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    
    // Use real sun calculation for user's approximate location
    // Try to get cached position, fallback to India center
    let lat = 20.5937, lng = 78.9629;
    try {
      const lastPos = sessionStorage.getItem('lastKnownPos');
      if (lastPos) {
        const parsed = JSON.parse(lastPos);
        lat = parsed.lat;
        lng = parsed.lng;
      }
    } catch { /* use defaults */ }

    const { sunrise, sunset } = getSunTimes(lat, lng);
    const shouldBeDark = hour >= sunset || hour < sunrise;
    
    if (shouldBeDark && !isDark) {
      setTheme('dark');
    } else if (!shouldBeDark && isDark) {
      setTheme('light');
    }
  }, [themeMode, isDark, setTheme]);

  useEffect(() => {
    if (themeMode !== 'auto') return;

    checkTimeAndSetTheme();

    // Check every 5 minutes
    const interval = setInterval(checkTimeAndSetTheme, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [themeMode, checkTimeAndSetTheme]);

  const setMode = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    
    if (mode === 'light') {
      setTheme('light');
    } else if (mode === 'dark') {
      setTheme('dark');
    }
  }, [setTheme, setThemeMode]);

  return { themeMode, setMode, isDark };
}
