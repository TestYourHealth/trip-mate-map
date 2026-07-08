// @vitest-environment jsdom
/**
 * LRU eviction test for the persistent autocomplete cache.
 *
 * The cache enforces a max entry count (MAX_ENTRIES in autocompleteCache.ts).
 * When that ceiling is exceeded, the least-recently-used entries must be
 * evicted first, and recently-touched entries (via getCached) must survive.
 *
 * We drive the cache past its ceiling and assert:
 *   1. Oldest untouched entries are evicted.
 *   2. Entries "touched" via getCached() are preserved (LRU bump).
 *   3. The most recent inserts are preserved.
 *   4. Eviction persists through a simulated reload (fresh module import
 *      re-hydrating from IndexedDB / localStorage fallback).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// jsdom doesn't ship IndexedDB — force the localStorage fallback path,
// which is what the user's phrasing ("localStorage reaches N entries")
// implies and what runs in constrained/private-mode browsers.
beforeEach(() => {
  // @ts-ignore
  delete (globalThis as any).indexedDB;
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  localStorage.clear();
});

const load = async () => {
  const mod = await import("@/lib/autocompleteCache");
  await mod.clearCache();
  return mod;
};

const row = (name: string) => [
  { display_name: name, lat: "0", lon: "0", place_id: name },
];

describe("autocompleteCache LRU eviction", () => {
  it("evicts the oldest entries once capacity is exceeded", async () => {
    const { getCached, setCached } = await load();

    // Fill well past the ceiling. MAX_ENTRIES is 500 today; use 600 to
    // guarantee eviction regardless of the exact configured ceiling.
    const TOTAL = 600;
    for (let i = 0; i < TOTAL; i++) {
      setCached(`q-${i}`, row(`city-${i}`));
      // Space timestamps so LRU ordering is unambiguous across fast loops.
      if (i % 50 === 0) await new Promise((r) => setTimeout(r, 2));
    }

    // Oldest entries must be gone.
    expect(getCached("q-0")).toBeNull();
    expect(getCached("q-1")).toBeNull();

    // Newest entries must survive.
    expect(getCached(`q-${TOTAL - 1}`)).not.toBeNull();
    expect(getCached(`q-${TOTAL - 2}`)).not.toBeNull();
  });

  it("preserves recently-accessed entries (LRU touch bumps timestamp)", async () => {
    const { getCached, setCached } = await load();

    // Seed an entry, then keep it "warm" by reading it before the flood.
    setCached("warm", row("Warm City"));
    await new Promise((r) => setTimeout(r, 2));

    // Flood with new inserts, touching `warm` periodically to keep it alive.
    for (let i = 0; i < 700; i++) {
      setCached(`flood-${i}`, row(`f-${i}`));
      if (i % 25 === 0) {
        expect(getCached("warm")).not.toBeNull(); // touch keeps it fresh
        await new Promise((r) => setTimeout(r, 1));
      }
    }

    // The warm key survived despite far more inserts than the ceiling.
    expect(getCached("warm")).not.toBeNull();
    // An early, untouched flood entry did not.
    expect(getCached("flood-0")).toBeNull();
  });

  it("persists eviction across a simulated reload via the localStorage fallback", async () => {
    const first = await load();
    for (let i = 0; i < 600; i++) {
      first.setCached(`k-${i}`, row(`n-${i}`));
    }

    // Confirm the LS fallback blob exists and is bounded (not 600 entries).
    const raw = localStorage.getItem("autocompleteCache.v1");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    const persistedCount = Object.keys(parsed).length;
    expect(persistedCount).toBeLessThan(600);
    expect(persistedCount).toBeGreaterThan(0);

    // Reload the module — mirror rebuilds from localStorage.
    vi.resetModules();
    const { getCached } = await import("@/lib/autocompleteCache");
    // Give hydration a tick.
    await new Promise((r) => setTimeout(r, 0));

    // Oldest evicted, newest retained after "reload".
    expect(getCached("k-0")).toBeNull();
    expect(getCached("k-599")).not.toBeNull();
  });
});
