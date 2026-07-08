// @vitest-environment jsdom
/**
 * IndexedDB-backed LRU eviction test.
 *
 * Uses fake-indexeddb to give jsdom a real IDB implementation so we exercise
 * the primary storage path (not the localStorage fallback). Verifies:
 *   1. Once capacity is exceeded, oldest entries are evicted from IDB itself.
 *   2. Touched entries survive eviction (LRU semantics).
 *   3. A fresh module import rehydrates the mirror from IDB with the bounded set.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "fake-indexeddb/auto";

// Cross-check we're actually on the IDB path (not the LS fallback).
beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  localStorage.clear();
});

const load = async () => {
  const mod = await import("@/lib/autocompleteCache");
  await mod.clearCache();
  await mod.whenReady();
  return mod;
};

const row = (name: string) => [
  { display_name: name, lat: "0", lon: "0", place_id: name },
];

// Read every key currently in the IDB store to independently verify eviction.
const readAllIDBKeys = (): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open("autocompleteCache", 1);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("entries", "readonly");
      const store = tx.objectStore("entries");
      const keysReq = store.getAllKeys();
      keysReq.onsuccess = () => {
        resolve((keysReq.result as IDBValidKey[]).map(String));
        db.close();
      };
      keysReq.onerror = () => reject(keysReq.error);
    };
    req.onerror = () => reject(req.error);
  });

describe("autocompleteCache LRU eviction (IndexedDB)", () => {
  it("evicts oldest entries from IDB once capacity is exceeded", async () => {
    const { getCached, setCached } = await load();

    const TOTAL = 600; // MAX_ENTRIES is 500 today; 600 guarantees eviction.
    for (let i = 0; i < TOTAL; i++) {
      setCached(`q-${i}`, row(`city-${i}`));
      if (i % 50 === 0) await new Promise((r) => setTimeout(r, 2));
    }

    // Allow queued IDB writes/deletes to drain.
    await new Promise((r) => setTimeout(r, 50));

    // Confirm the LS fallback was NOT used (we're on the real IDB path).
    expect(localStorage.getItem("autocompleteCache.v1")).toBeNull();

    // In-memory mirror reflects eviction.
    expect(getCached("q-0")).toBeNull();
    expect(getCached("q-1")).toBeNull();
    expect(getCached(`q-${TOTAL - 1}`)).not.toBeNull();

    // IDB store itself is bounded.
    const idbKeys = await readAllIDBKeys();
    expect(idbKeys.length).toBeLessThan(TOTAL);
    expect(idbKeys.length).toBeLessThanOrEqual(500);
    expect(idbKeys).not.toContain("q-0");
    expect(idbKeys).toContain(`q-${TOTAL - 1}`);
  });

  it("keeps recently-accessed entries alive across an IDB eviction wave", async () => {
    const { getCached, setCached } = await load();

    setCached("warm", row("Warm City"));
    await new Promise((r) => setTimeout(r, 2));

    for (let i = 0; i < 700; i++) {
      setCached(`flood-${i}`, row(`f-${i}`));
      if (i % 25 === 0) {
        // Touch bumps timestamp so LRU protects `warm`.
        expect(getCached("warm")).not.toBeNull();
        await new Promise((r) => setTimeout(r, 1));
      }
    }

    await new Promise((r) => setTimeout(r, 50));

    const idbKeys = await readAllIDBKeys();
    expect(idbKeys).toContain("warm");
    expect(idbKeys).not.toContain("flood-0");
  });

  it("rehydrates the bounded set from IDB on a simulated reload", async () => {
    const first = await load();
    for (let i = 0; i < 600; i++) {
      first.setCached(`k-${i}`, row(`n-${i}`));
    }
    // Let background IDB flush complete.
    await new Promise((r) => setTimeout(r, 80));

    // Simulate reload: re-import module so the mirror rebuilds from IDB.
    vi.resetModules();
    const { getCached, whenReady } = await import("@/lib/autocompleteCache");
    await whenReady();

    // Confirm we're still on the IDB path (no LS blob written).
    expect(localStorage.getItem("autocompleteCache.v1")).toBeNull();

    expect(getCached("k-0")).toBeNull();
    expect(getCached("k-599")).not.toBeNull();
  });
});
