/// <reference types="google.maps" />
// Google Places (New) browser integration via Maps JS API.
// Uses the public, referrer-restricted browser key. Safe for client.

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

let loadPromise: Promise<typeof google> | null = null;

export const isGoogleMapsAvailable = (): boolean => Boolean(BROWSER_KEY);

export const loadGoogleMaps = (): Promise<typeof google> => {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (!BROWSER_KEY) return Promise.reject(new Error('Google Maps browser key missing'));
  if ((window as any).google?.maps?.importLibrary) return Promise.resolve((window as any).google);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    (window as any).__initGmaps = () => resolve((window as any).google);
    const script = document.createElement('script');
    const params = new URLSearchParams({
      key: BROWSER_KEY,
      loading: 'async',
      callback: '__initGmaps',
      v: 'weekly',
      libraries: 'places',
    });
    if (TRACKING_ID) params.set('channel', TRACKING_ID);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Maps JS'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
};

export interface MatchRange { start: number; end: number }

export interface GooglePlaceResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
  type?: string;
  class?: string;
  importance?: number;
  placeId?: string;
  primaryText?: string;
  secondaryText?: string;
  primaryMatches?: MatchRange[];
  secondaryMatches?: MatchRange[];
  source?: 'google';
  rank?: number;
}

let sessionToken: any = null;
const getSessionToken = async () => {
  const g = await loadGoogleMaps();
  const { AutocompleteSessionToken } = (await g.maps.importLibrary('places')) as any;
  if (!sessionToken) sessionToken = new AutocompleteSessionToken();
  return sessionToken;
};

export const searchGooglePlaces = async (
  query: string,
  userPos: { lat: number; lng: number } | null,
  signal?: AbortSignal,
): Promise<GooglePlaceResult[]> => {
  if (!query || query.trim().length < 2) return [];
  const g = await loadGoogleMaps();
  if (signal?.aborted) throw new Error('Aborted');

  const places = (await g.maps.importLibrary('places')) as any;
  const { AutocompleteSuggestion, Place } = places;
  const token = await getSessionToken();

  const request: any = {
    input: query.trim(),
    sessionToken: token,
    includedRegionCodes: ['in'],
    language: 'en',
  };
  if (userPos) {
    request.locationBias = {
      center: { lat: userPos.lat, lng: userPos.lng },
      radius: 50000,
    };
  }

  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
  if (signal?.aborted) throw new Error('Aborted');

  const top = (suggestions || []).slice(0, 8);
  const detailed = await Promise.all(
    top.map(async (s: any, idx: number) => {
      const pred = s.placePrediction;
      if (!pred) return null;
      try {
        const place: any = pred.toPlace();
        await place.fetchFields({
          fields: ['location', 'displayName', 'formattedAddress', 'types'],
        });
        const loc = place.location;
        if (!loc) return null;
        const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
        const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
        const primary = pred.mainText?.text || place.displayName || '';
        const secondary = pred.secondaryText?.text || place.formattedAddress || '';
        const display = [primary, secondary].filter(Boolean).join(', ');
        const types: string[] = place.types || [];
        const cls = types[0]?.split('_')[0] || 'place';
        return {
          display_name: display,
          lat: String(lat),
          lon: String(lng),
          place_id: -8000 - idx,
          type: types[0],
          class: cls,
          importance: 0.9 - idx * 0.02,
          placeId: pred.placeId,
          primaryText: primary,
          secondaryText: secondary,
        } as GooglePlaceResult;
      } catch {
        return null;
      }
    })
  );

  // New session after results are consumed
  sessionToken = null;
  return detailed.filter((x): x is GooglePlaceResult => x !== null);
};
