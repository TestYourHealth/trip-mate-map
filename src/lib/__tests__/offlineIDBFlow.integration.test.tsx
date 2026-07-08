// @vitest-environment jsdom
/**
 * End-to-end offline flow with IndexedDB-backed cache.
 *
 * This test exercises the real IDB path (via fake-indexeddb), not the
 * localStorage fallback used by the sibling offline test. It verifies:
 *   1. A prior online search persists into IDB.
 *   2. After a simulated reload + going offline, the autocomplete serves
 *      those IDB-cached results without touching the network.
 *   3. Both the inline input "Offline" badge and the dropdown chip render,
 *      giving users a clear offline signal at all times.
 */
import "fake-indexeddb/auto";
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
  cleanup,
} from "@testing-library/react";
import "@testing-library/jest-dom";

// Silence geolocation prompts.
Object.defineProperty(global.navigator, "geolocation", {
  configurable: true,
  value: { getCurrentPosition: (_ok: any, err: any) => err && err({ code: 1 }) },
});

const setOnline = (online: boolean) => {
  Object.defineProperty(global.navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
};

beforeEach(() => {
  localStorage.clear();
  setOnline(true);
  vi.resetModules();
  vi.restoreAllMocks();
});

afterEach(() => cleanup());

describe("Offline autocomplete flow (IndexedDB-backed)", () => {
  it("persists an online search to IDB and serves it offline after reload", async () => {
    // ---- Session 1: online — seed IDB by writing directly through the API.
    const first = await import("@/lib/autocompleteCache");
    await first.clearCache();
    await first.whenReady();

    first.setCached("delhi", [
      {
        display_name: "Delhi, India",
        lat: "28.6139",
        lon: "77.2090",
        place_id: 4242,
        type: "city",
        class: "place",
        importance: 0.9,
      },
    ]);

    // Give the background IDB write a tick to land.
    await new Promise((r) => setTimeout(r, 40));

    // ---- Simulate reload: fresh module graph, then go offline.
    vi.resetModules();
    setOnline(false);

    // Network must NOT be used once we go offline.
    const fetchSpy = vi.fn(() =>
      Promise.reject(new Error("network must not be called while offline")),
    );
    // @ts-ignore jsdom fetch override
    global.fetch = fetchSpy;

    const { default: LocationAutocomplete } = await import(
      "@/components/LocationAutocomplete"
    );
    // Ensure the freshly-imported cache module finishes rehydrating from IDB
    // before the component queries it.
    const cache = await import("@/lib/autocompleteCache");
    await cache.whenReady();

    render(
      <LocationAutocomplete
        value=""
        onChange={() => {}}
        placeholder="Search"
      />,
    );

    // (a) The inline "Offline" badge shows immediately on the input.
    expect(screen.getByTestId("offline-input-badge")).toBeInTheDocument();

    const input = screen.getByPlaceholderText("Search") as HTMLInputElement;
    await act(async () => {
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "delhi" } });
      await new Promise((r) => setTimeout(r, 200)); // past 120ms debounce
    });

    // (b) The dropdown offline chip is visible.
    await waitFor(() => {
      expect(screen.getByTestId("offline-dropdown-chip")).toBeInTheDocument();
    });

    // (c) The IDB-cached row surfaces in the dropdown.
    await waitFor(() => {
      expect(screen.getAllByText(/Delhi/i).length).toBeGreaterThan(0);
    });

    // (d) Not a single network request was issued.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("hides the inline offline badge once connectivity is restored", async () => {
    const cache = await import("@/lib/autocompleteCache");
    await cache.clearCache();
    await cache.whenReady();

    setOnline(false);
    // @ts-ignore
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );

    const { default: LocationAutocomplete } = await import(
      "@/components/LocationAutocomplete"
    );
    render(
      <LocationAutocomplete
        value=""
        onChange={() => {}}
        placeholder="Search"
      />,
    );

    expect(screen.getByTestId("offline-input-badge")).toBeInTheDocument();

    await act(async () => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(screen.queryByTestId("offline-input-badge")).not.toBeInTheDocument();
    });
  });
});
