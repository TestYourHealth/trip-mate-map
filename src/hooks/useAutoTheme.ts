import { useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useTheme } from './useTheme';

type ThemeMode = 'light' | 'dark' | 'auto';

// Approximate sunrise/sunset times for India (6 AM - 6:30 PM average)
const SUNRISE_HOUR = 6;
const SUNSET_HOUR = 18.5; // 6:30 PM

export function useAutoTheme() {
  const { setTheme, isDark } = useTheme();
  const [themeMode, setThemeMode] = useLocalStorage<ThemeMode>('themeMode', 'light');

  const checkTimeAndSetTheme = useCallback(() => {
    if (themeMode !== 'auto') return;

    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    
    // Dark mode between sunset and sunrise
    const shouldBeDark = hour >= SUNSET_HOUR || hour < SUNRISE_HOUR;
    
    if (shouldBeDark && !isDark) {
      setTheme('dark');
    } else if (!shouldBeDark && isDark) {
      setTheme('light');
    }
  }, [themeMode, isDark, setTheme]);

  useEffect(() => {
    if (themeMode !== 'auto') return;

    // Check immediately
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
    // Auto mode will trigger useEffect above
  }, [setTheme, setThemeMode]);

  return { themeMode, setMode, isDark };
}
