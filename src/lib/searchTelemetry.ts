/**
 * Lightweight in-memory telemetry for autocomplete providers.
 * Records latency and outcome per provider, exposes rolling stats,
 * and emits a DOM event so debug UIs can refresh.
 */

export type SearchProvider = 'google' | 'nominatim' | 'photon';
export type SearchOutcome = 'success' | 'empty' | 'error' | 'timeout' | 'aborted';

interface Sample {
  ts: number;
  ms: number;
  outcome: SearchOutcome;
  resultCount: number;
  errorMessage?: string;
}

export interface ProviderStats {
  provider: SearchProvider;
  total: number;
  successes: number;
  empties: number;
  errors: number;
  timeouts: number;
  avgMs: number;
  p95Ms: number;
  errorRate: number;
  lastError?: string;
  lastOutcome?: SearchOutcome;
  lastMs?: number;
}

const MAX_SAMPLES = 50;
const EVENT_NAME = 'search-telemetry-update';

const samples: Record<SearchProvider, Sample[]> = {
  google: [],
  nominatim: [],
  photon: [],
};

const percentile = (arr: number[], p: number): number => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
};

export const recordSample = (
  provider: SearchProvider,
  sample: Omit<Sample, 'ts'>,
): void => {
  const bucket = samples[provider];
  bucket.push({ ...sample, ts: Date.now() });
  if (bucket.length > MAX_SAMPLES) bucket.splice(0, bucket.length - MAX_SAMPLES);
  try { window.dispatchEvent(new CustomEvent(EVENT_NAME)); } catch { /* SSR */ }
};

const emptyStats = (provider: SearchProvider): ProviderStats => ({
  provider,
  total: 0,
  successes: 0,
  empties: 0,
  errors: 0,
  timeouts: 0,
  avgMs: 0,
  p95Ms: 0,
  errorRate: 0,
});

export const getProviderStats = (provider: SearchProvider): ProviderStats => {
  const bucket = samples[provider];
  if (bucket.length === 0) return emptyStats(provider);
  const durations = bucket.map((s) => s.ms);
  const successes = bucket.filter((s) => s.outcome === 'success').length;
  const empties = bucket.filter((s) => s.outcome === 'empty').length;
  const timeouts = bucket.filter((s) => s.outcome === 'timeout').length;
  const errors = bucket.filter((s) => s.outcome === 'error' || s.outcome === 'timeout').length;
  const last = bucket[bucket.length - 1];
  const lastErr = [...bucket].reverse().find((s) => s.errorMessage);
  return {
    provider,
    total: bucket.length,
    successes,
    empties,
    errors,
    timeouts,
    avgMs: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    p95Ms: Math.round(percentile(durations, 95)),
    errorRate: +(errors / bucket.length).toFixed(2),
    lastError: lastErr?.errorMessage,
    lastOutcome: last.outcome,
    lastMs: Math.round(last.ms),
  };
};

export const getAllStats = (): ProviderStats[] =>
  (Object.keys(samples) as SearchProvider[]).map(getProviderStats);

export const subscribeTelemetry = (cb: () => void): (() => void) => {
  window.addEventListener(EVENT_NAME, cb);
  return () => window.removeEventListener(EVENT_NAME, cb);
};

export const clearTelemetry = (): void => {
  (Object.keys(samples) as SearchProvider[]).forEach((p) => (samples[p].length = 0));
  try { window.dispatchEvent(new CustomEvent(EVENT_NAME)); } catch { /* SSR */ }
};

/**
 * Wrap a provider call: times it, classifies the outcome, records a sample.
 * Rethrows the original error so caller flow is unchanged.
 */
export const instrumentProvider = async <T>(
  provider: SearchProvider,
  run: () => Promise<T>,
  getCount: (result: T) => number,
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await run();
    const ms = performance.now() - start;
    const count = getCount(result);
    recordSample(provider, {
      ms,
      outcome: count > 0 ? 'success' : 'empty',
      resultCount: count,
    });
    return result;
  } catch (err: any) {
    const ms = performance.now() - start;
    const name = err?.name || '';
    const message = err?.message || String(err);
    let outcome: SearchOutcome = 'error';
    if (name === 'AbortError' || message === 'Aborted') outcome = 'aborted';
    else if (name === 'TimeoutError') outcome = 'timeout';
    recordSample(provider, {
      ms,
      outcome,
      resultCount: 0,
      errorMessage: outcome === 'aborted' ? undefined : message,
    });
    throw err;
  }
};

if (typeof window !== 'undefined') {
  (window as any).__searchTelemetry = { getAllStats, clearTelemetry };
}
