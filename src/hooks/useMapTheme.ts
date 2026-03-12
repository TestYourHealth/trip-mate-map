import { useEffect, useState } from 'react';

export type MapTileTheme = 'light' | 'dark';

export function useMapTheme(): MapTileTheme {
  const [mapTheme, setMapTheme] = useState<MapTileTheme>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setMapTheme(isDark ? 'dark' : 'light');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return mapTheme;
}

export function getTileUrl(theme: MapTileTheme): string {
  const isRetina = window.devicePixelRatio > 1;
  const suffix = isRetina ? '@2x' : '';

  if (theme === 'dark') {
    return `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}${suffix}.png`;
  }
  return `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}${suffix}.png`;
}
