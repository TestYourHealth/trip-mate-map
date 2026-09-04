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

/** OpenStreetMap standard tiles — no API key required. Dark theme is applied via the `map-tiles-dark` CSS class. */
export function getTileUrl(_theme: MapTileTheme): string {
  return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
}
