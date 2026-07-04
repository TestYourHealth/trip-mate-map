/**
 * Persistent LRU cache for autocomplete results so previously-fetched
 * queries keep working when the device loses connectivity.
 *
 * Storage: localStorage under a single key holding a { [query]: { r, t } } map.
 * Capacity: keeps the N most-recently used entries, evicts the oldest.
 */
const KEY = 'autocompleteCache.v1';
const MAX_ENTRIES = 200;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface Entry<T> { r: T; t: number }
type Store<T> = Record<string, Entry<T>>;

const readStore = <T,>(): Store<T> => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Store<T>;
  } catch {
    return {};
  }
};

const writeStore = <T,>(store: Store<T>): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded — drop oldest half and retry once.
    try {
      const entries = Object.entries(store).sort((a, b) => a[1].t - b[1].t);
      const trimmed = Object.fromEntries(entries.slice(Math.floor(entries.length / 2)));
      localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch { /* give up silently */ }
  }
};

const norm = (q: string) => q.trim().toLowerCase();

export const getCached = <T,>(query: string): T | null => {
  const store = readStore<T>();
  const entry = store[norm(query)];
  if (!entry) return null;
  if (Date.now() - entry.t > MAX_AGE_MS) return null;
  // Touch timestamp so LRU reflects reads.
  entry.t = Date.now();
  writeStore(store);
  return entry.r;
};

export const setCached = <T,>(query: string, result: T): void => {
  if (!result || (Array.isArray(result) && result.length === 0)) return;
  const store = readStore<T>();
  store[norm(query)] = { r: result, t: Date.now() };
  const keys = Object.keys(store);
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys
      .map((k) => [k, store[k].t] as const)
      .sort((a, b) => a[1] - b[1]);
    const toDrop = sorted.slice(0, keys.length - MAX_ENTRIES);
    toDrop.forEach(([k]) => delete store[k]);
  }
  writeStore(store);
};

export const isOnline = (): boolean =>
  typeof navigator === 'undefined' ? true : navigator.onLine !== false;
