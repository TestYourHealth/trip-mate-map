const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SegmentRequest = { from: string; to: string };

interface TollSegment {
  from: string;
  to: string;
  cost: number;
  currencyCode: string;
  tollCount: number;
}

const MAX_SEGMENTS = 6;
const cache = new Map<string, { expiresAt: number; value: unknown }>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const moneyToNumber = (money: { units?: string | number; nanos?: number } | undefined) =>
  Number(money?.units ?? 0) + Number(money?.nanos ?? 0) / 1_000_000_000;

const getSegmentTolls = async (
  segment: SegmentRequest,
  avoidTolls: boolean,
): Promise<TollSegment> => {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!lovableApiKey || !googleMapsApiKey) throw new Error('Google Maps connection is not configured');

  const response = await fetch('https://connector-gateway.lovable.dev/google_maps/routes/v2:computeRoutes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      'X-Connection-Api-Key': googleMapsApiKey,
      'Content-Type': 'application/json',
      'X-Goog-FieldMask': 'routes.travelAdvisory.tollInfo',
    },
    body: JSON.stringify({
      origin: { address: segment.from },
      destination: { address: segment.to },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      extraComputations: ['TOLLS'],
      ...(avoidTolls ? { routeModifiers: { avoidTolls: true } } : {}),
      languageCode: 'en-IN',
      units: 'METRIC',
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error(`Google Routes toll request failed [${response.status}]: ${details}`);
    throw new Error(`Google Routes returned ${response.status}`);
  }

  const data = await response.json();
  const estimatedPrice = data?.routes?.[0]?.travelAdvisory?.tollInfo?.estimatedPrice;
  const prices = Array.isArray(estimatedPrice) ? estimatedPrice : [];
  const currencyCode = prices.find((price) => price?.currencyCode)?.currencyCode || 'INR';

  return {
    from: segment.from,
    to: segment.to,
    cost: Math.round(prices.reduce((sum, price) => sum + moneyToNumber(price), 0)),
    currencyCode,
    tollCount: prices.length,
  };
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Only POST is supported' }, 405);

  try {
    const body = await request.json();
    const origin = typeof body?.origin === 'string' ? body.origin.trim() : '';
    const destination = typeof body?.destination === 'string' ? body.destination.trim() : '';
    const waypoints = Array.isArray(body?.waypoints)
      ? body.waypoints.filter((value: unknown): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean)
      : [];
    const avoidTolls = body?.avoidTolls === true;

    if (!origin || !destination) return json({ error: 'Origin and destination are required' }, 400);
    if (waypoints.length > MAX_SEGMENTS - 1) return json({ error: `A maximum of ${MAX_SEGMENTS - 1} waypoints is supported` }, 400);

    const points = [origin, ...waypoints, destination];
    const segments = points.slice(0, -1).map((from, index) => ({ from, to: points[index + 1] }));
    const cacheKey = JSON.stringify({ segments, avoidTolls });
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return json(cached.value);

    const tollSegments = await Promise.all(segments.map((segment) => getSegmentTolls(segment, avoidTolls)));
    const result = {
      source: 'google-routes',
      currencyCode: tollSegments[0]?.currencyCode || 'INR',
      totalCost: tollSegments.reduce((sum, segment) => sum + segment.cost, 0),
      segments: tollSegments,
      fetchedAt: Date.now(),
    };
    cache.set(cacheKey, { expiresAt: Date.now() + 10 * 60 * 1000, value: result });
    return json(result);
  } catch (error) {
    console.error('route-tolls failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Unable to fetch live toll prices' }, 502);
  }
});