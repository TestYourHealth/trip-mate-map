// Standalone geocoding + routing helper so screens without a map (e.g. Bill Split)
// can compute distance/duration between two places.

import { RoutePreferences, getOsrmExclude } from "@/types/routePrefs";

export interface LatLng { lat: number; lng: number }

export interface RouteResult {
  distance: number; // km
  duration: number; // hours
  from: LatLng;
  to: LatLng;
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
    return await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
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

/** Geocode both ends and fetch a driving route from OSRM. */
export async function getRoute(origin: string, destination: string): Promise<RouteResult> {
  const [from, to] = await Promise.all([geocode(origin), geocode(destination)]);
  if (!from) throw new RouteError('From location नहीं मिली — दूसरा नाम try करें।', 'geocode', 'origin');
  if (!to) throw new RouteError('To location नहीं मिली — दूसरा नाम try करें।', 'geocode', 'destination');

  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url, 12000);
  } catch {
    throw new RouteError('Route server से connect नहीं हो पाया। दोबारा try करें।', 'routing');
  }
  if (!res.ok) throw new RouteError('Route calculate नहीं हो पाया। दोबारा try करें।', 'routing');
  const data = await res.json();
  const route = data?.routes?.[0];
  if (!route) throw new RouteError('इन दो जगहों के बीच road route नहीं मिला।', 'routing');

  return {
    distance: Math.round((route.distance / 1000) * 10) / 10,
    duration: Math.round((route.duration / 3600) * 10) / 10,
    from,
    to,
  };
}
