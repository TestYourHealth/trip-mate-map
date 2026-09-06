// Standalone geocoding + routing helper so screens without a map (e.g. Bill Split)
// can compute distance/duration between two places.

import { RoutePreferences, getOsrmExclude } from "@/types/routePrefs";
import { supabase } from '@/integrations/supabase/client';
import type { TollSegment } from '@/lib/tripCost';

export interface LatLng { lat: number; lng: number }

export interface RouteResult {
  distance: number; // km
  duration: number; // hours
  from: LatLng;
  to: LatLng;
  tollEstimate?: TollEstimate;
}

export interface TollEstimate {
  source: 'google-routes';
  totalCost: number;
  currencyCode: string;
  segments: TollSegment[];
  fetchedAt: number;
}

const memoryCache: Record<string, LatLng> = {};

const normalizeKey = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ,]/g, '').replace(/\s+/g, ' ').trim();

/** Reuse coordinates the user already picked in autocomplete (fuzzy match). */
function getPrePickedCoords(query: string): LatLng | null {
  try {
    const raw = sessionStorage.getItem('pickedCoords');
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, LatLng>;
    const exact = query.toLowerCase().trim();
    if (map[exact]) return map[exact];
    const norm = normalizeKey(query);
    if (map[norm]) return map[norm];
    const first = normalizeKey(query.split(',')[0] || '');
    if (first && map[first]) return map[first];
    const keys = Object.keys(map);
    const hit = keys.find(k => k.length >= 4 && (norm.includes(k) || k.includes(norm)));
    if (hit) return map[hit];
    return null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'TripMate/1.0' },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function geocode(query: string): Promise<LatLng | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const key = trimmed.toLowerCase();

  const picked = getPrePickedCoords(trimmed);
  if (picked) {
    memoryCache[key] = picked;
    return picked;
  }
  if (key in memoryCache) return memoryCache[key];

  const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
  const variants = [trimmed, ...(parts.length > 1 ? [parts.slice(0, 2).join(', ')] : []), ...(parts.length ? [parts[0]] : [])];

  const tryFetch = async (q: string, global = false): Promise<LatLng | null> => {
    const cc = global ? '' : '&countrycodes=in';
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}${cc}&limit=1`;
    try {
      const res = await fetchWithTimeout(url, 8000);
      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  for (const v of variants) {
    const r = await tryFetch(v, false);
    if (r) { memoryCache[key] = r; return r; }
  }
  for (const v of variants) {
    const r = await tryFetch(v, true);
    if (r) { memoryCache[key] = r; return r; }
  }
  return null;
}

export class RouteError extends Error {
  constructor(message: string, public kind: 'geocode' | 'routing', public field?: 'origin' | 'destination') {
    super(message);
  }
}

export async function getRouteTollEstimate(
  origin: string,
  destination: string,
  waypoints: string[] = [],
  prefs?: RoutePreferences,
): Promise<TollEstimate | null> {
  try {
    const { data, error } = await supabase.functions.invoke('route-tolls', {
      body: {
        origin,
        destination,
        waypoints: waypoints.filter(Boolean).slice(0, 5),
        avoidTolls: prefs?.avoidTolls ?? false,
      },
    });
    if (error || !data || data.source !== 'google-routes') return null;
    return data as TollEstimate;
  } catch (error) {
    console.warn('Live toll lookup unavailable:', error);
    return null;
  }
}

const OSRM_SERVERS = [
  'https://router.project-osrm.org/route/v1',
  'https://routing.openstreetmap.de/routed-car/route/v1',
];

/** Geocode both ends and fetch a driving route from OSRM with retries + fallback hosts. */
export async function getRoute(
  origin: string,
  destination: string,
  prefs?: RoutePreferences,
): Promise<RouteResult> {
  const [from, to] = await Promise.all([geocode(origin), geocode(destination)]);
  if (!from) throw new RouteError('From location नहीं मिली — दूसरा नाम try करें।', 'geocode', 'origin');
  if (!to) throw new RouteError('To location नहीं मिली — दूसरा नाम try करें।', 'geocode', 'destination');

  const exclude = getOsrmExclude(prefs ?? { avoidTolls: false, avoidHighways: false, optimize: 'fastest' });
  const baseParams = exclude ? `?overview=false&exclude=${encodeURIComponent(exclude)}` : '?overview=false';
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;

  for (const server of OSRM_SERVERS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const url = `${server}/driving/${coords}${baseParams}`;
      try {
        const res = await fetchWithTimeout(url, 12000);
        if (!res.ok) {
          // If car profile doesn't support exclude, retry without it.
          if (res.status === 400 && exclude) {
            const plainUrl = `${server}/driving/${coords}?overview=false`;
            const plainRes = await fetchWithTimeout(plainUrl, 12000);
            if (!plainRes.ok) throw new Error(`HTTP ${plainRes.status}`);
            const plainData = await plainRes.json();
            const plainRoute = plainData?.routes?.[0];
            if (!plainRoute) throw new Error('No route');
            const result: RouteResult = {
              distance: Math.round((plainRoute.distance / 1000) * 10) / 10,
              duration: Math.round((plainRoute.duration / 3600) * 10) / 10,
              from,
              to,
            };
            result.tollEstimate = await getRouteTollEstimate(origin, destination, [], prefs);
            return result;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        const route = data?.routes?.[0];
        if (!route) throw new Error('No route');
          const result: RouteResult = {
          distance: Math.round((route.distance / 1000) * 10) / 10,
          duration: Math.round((route.duration / 3600) * 10) / 10,
          from,
          to,
        };
          result.tollEstimate = await getRouteTollEstimate(origin, destination, [], prefs);
          return result;
      } catch {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
      }
    }
  }

  throw new RouteError('Route server से connect नहीं हो पाया। दोबारा try करें।', 'routing');
}
