/**
 * Persistent LRU cache for autocomplete results backed by IndexedDB.
 *
 * Why IndexedDB over localStorage:
 *   - Much larger quota (tens of MB vs ~5MB) so we don't evict on big trips.
 *   - Async, non-blocking writes — never stalls the input while typing.
 *   - Structured storage: no JSON.parse of the entire blob on every read.
 *
 * Public API stays synchronous by keeping an in-memory mirror that we
 * hydrate on module load; writes update the mirror immediately and flush
 * to IDB in the background. This preserves the existing call sites
 * (LocationAutocomplete uses the cache on the hot path of every keystroke).
 *
 * Falls back to localStorage if IndexedDB is unavailable (SSR, some
 * privacy modes) so nothing breaks.
 */
const DB_NAME = 'autocompleteCache';
const DB_VERSION = 1;
const STORE = 'entries';
const LS_FALLBACK_KEY = 'autocompleteCache.v1';
const MAX_ENTRIES = 500; // Larger than the old LS cache — IDB can afford it.
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface Entry<T> { r: T; t: number }
type Mirror = Map<string, Entry<unknown>>;

const norm = (q: string) => q.trim().toLowerCase();

const hasIDB = (): boolean =>
  typeof indexedDB !== 'undefined' && typeof indexedDB.open === 'function';

// ---- IndexedDB helpers -----------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null;
const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE); // keyPath: implicit (out-of-line keys)
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('IDB blocked'));
    } catch (e) {
      reject(e);
    }
  }).catch((err) => {
    dbPromise = null;
    throw err;
  });
  return dbPromise;
};

const idbGetAll = async (): Promise<Array<[string, Entry<unknown>]>> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const results: Array<[string, Entry<unknown>]> = [];
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        results.push([String(cursor.key), cursor.value as Entry<unknown>]);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
};

const idbPut = async (key: string, value: Entry<unknown>): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

const idbDeleteMany = async (keys: string[]): Promise<void> => {
  if (!keys.length) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    keys.forEach((k) => store.delete(k));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

const idbClear = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// ---- localStorage fallback (only used when IDB is missing) -----------------

const lsReadAll = (): Array<[string, Entry<unknown>]> => {
  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    if (!raw) return [];
    const obj = JSON.parse(raw) as Record<string, Entry<unknown>>;
    return Object.entries(obj);
  } catch {
    return [];
  }
};

const lsWriteAll = (mirror: Mirror): void => {
  try {
    const obj: Record<string, Entry<unknown>> = {};
    mirror.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(obj));
  } catch {
    // Best-effort — LS quota exhaustion just means we lose the fallback cache.
  }
};

// ---- Mirror (sync API) -----------------------------------------------------

const mirror: Mirror = new Map();
let hydrated: Promise<void> | null = null;

const hydrate = (): Promise<void> => {
  if (hydrated) return hydrated;
  hydrated = (async () => {
    try {
      const entries = hasIDB() ? await idbGetAll() : lsReadAll();
      const now = Date.now();
      // Purge expired on hydrate so we never surface stale data.
      const stale: string[] = [];
      entries.forEach(([k, v]) => {
        if (now - v.t > MAX_AGE_MS) stale.push(k);
        else mirror.set(k, v);
      });
      if (hasIDB() && stale.length) idbDeleteMany(stale).catch(() => {});
    } catch {
      // Ignore — mirror stays empty, we behave like a cold cache.
    }
  })();
  return hydrated;
};

// Kick off hydration eagerly at import time.
if (typeof window !== 'undefined') hydrate();

const enforceLimit = (): string[] => {
  if (mirror.size <= MAX_ENTRIES) return [];
  const sorted = [...mirror.entries()].sort((a, b) => a[1].t - b[1].t);
  const drop = sorted.slice(0, mirror.size - MAX_ENTRIES).map(([k]) => k);
  drop.forEach((k) => mirror.delete(k));
  return drop;
};

const flush = (key: string, value: Entry<unknown>, evicted: string[]): void => {
  if (hasIDB()) {
    idbPut(key, value).catch(() => {});
    if (evicted.length) idbDeleteMany(evicted).catch(() => {});
  } else {
    lsWriteAll(mirror);
  }
};

// ---- Public API ------------------------------------------------------------

export const getCached = <T,>(query: string): T | null => {
  const key = norm(query);
  const entry = mirror.get(key) as Entry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.t > MAX_AGE_MS) {
    mirror.delete(key);
    if (hasIDB()) idbDeleteMany([key]).catch(() => {});
    return null;
  }
  // LRU touch — bump timestamp so recently-read entries survive eviction.
  entry.t = Date.now();
  flush(key, entry, []);
  return entry.r;
};

export const setCached = <T,>(query: string, result: T): void => {
  if (!result || (Array.isArray(result) && result.length === 0)) return;
  const key = norm(query);
  const entry: Entry<T> = { r: result, t: Date.now() };
  mirror.set(key, entry);
  const evicted = enforceLimit();
  flush(key, entry, evicted);
};

/** Test-only: wipe both the mirror and the persisted store. */
export const clearCache = async (): Promise<void> => {
  mirror.clear();
  hydrated = Promise.resolve();
  if (hasIDB()) {
    try { await idbClear(); } catch { /* ignore */ }
  } else {
    try { localStorage.removeItem(LS_FALLBACK_KEY); } catch { /* ignore */ }
  }
};

/** Test-only: await initial hydration from IDB. */
export const whenReady = (): Promise<void> => hydrate();

export const isOnline = (): boolean =>
  typeof navigator === 'undefined' ? true : navigator.onLine !== false;
