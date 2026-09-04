import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapTheme, getTileUrl } from '@/hooks/useMapTheme';

export interface ClassifiedFix {
  /** Sequential index across the whole run. */
  index: number;
  /** Which smoke-test step produced this fix. */
  step: 'fix' | 'live';
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
  /** Milliseconds since the first fix. */
  offsetMs: number;
  accepted: boolean;
  /** Why it was rejected, or notes when accepted. */
  reasons: string[];
  /** Implied speed from the previous fix, km/h. */
  impliedKmh: number | null;
  /** True for the fix used as routing origin. */
  isBest: boolean;
}

interface GpsFixMapProps {
  fixes: ClassifiedFix[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

/**
 * Leaflet overlay that plots every GPS sample collected during the smoke test:
 * accepted fixes in success green, rejected fixes in destructive red, with the
 * accuracy radius drawn around each one and the sample path connecting them.
 */
const GpsFixMap: React.FC<GpsFixMapProps> = ({ fixes, selectedIndex, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<number, L.CircleMarker>>(new Map());
  const theme = useMapTheme();
  const tileRef = useRef<L.TileLayer | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([20.5937, 78.9629], 5);
    tileRef.current = L.tileLayer(getTileUrl(theme), { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors', className: theme === 'dark' ? 'map-tiles-dark' : undefined }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      tileRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (tileRef.current) tileRef.current.setUrl(getTileUrl(theme));
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    if (fixes.length === 0) return;

    const path: L.LatLngExpression[] = fixes.map((f) => [f.lat, f.lng]);
    L.polyline(path, {
      color: 'hsl(var(--muted-foreground))',
      weight: 1.5,
      opacity: 0.6,
      dashArray: '4 4',
    }).addTo(layer);

    fixes.forEach((f) => {
      const color = f.accepted ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
      L.circle([f.lat, f.lng], {
        radius: f.accuracy,
        color,
        weight: 1,
        opacity: 0.35,
        fillOpacity: 0.08,
      }).addTo(layer);

      const marker = L.circleMarker([f.lat, f.lng], {
        radius: f.isBest ? 8 : 5,
        color,
        weight: f.isBest ? 3 : 2,
        fillColor: color,
        fillOpacity: f.accepted ? 0.9 : 0.35,
      })
        .addTo(layer)
        .bindTooltip(
          `#${f.index + 1} · ±${Math.round(f.accuracy)}m${f.isBest ? ' · routing origin' : ''}`,
          { direction: 'top' }
        )
        .on('click', () => onSelectRef.current(f.index));
      markersRef.current.set(f.index, marker);
    });

    map.fitBounds(L.latLngBounds(path).pad(0.35), { animate: false, maxZoom: 17 });
  }, [fixes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedIndex == null) return;
    const fix = fixes.find((f) => f.index === selectedIndex);
    if (!fix) return;
    map.panTo([fix.lat, fix.lng], { animate: true });
    markersRef.current.forEach((m, idx) => {
      m.setStyle({ weight: idx === selectedIndex ? 4 : 2 });
    });
    markersRef.current.get(selectedIndex)?.openTooltip();
  }, [selectedIndex, fixes]);

  return (
    <div
      ref={containerRef}
      className="h-56 w-full rounded-xl overflow-hidden ring-1 ring-border/60"
      role="img"
      aria-label={`Map of ${fixes.length} GPS samples, accepted points in green and rejected points in red`}
    />
  );
};

export default GpsFixMap;
