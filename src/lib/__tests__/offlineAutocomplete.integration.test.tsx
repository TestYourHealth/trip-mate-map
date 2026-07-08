// @vitest-environment jsdom
/**
 * Integration tests: offline mode for autocomplete.
 *
 * Verifies:
 *   1. The persistent cache round-trips results across "reloads" (fresh imports).
 *   2. When navigator.onLine=false, the component serves cached results and
 *      does NOT hit the network (fetch is asserted un-called).
 *   3. The "Offline" chip renders in the dropdown when offline.
 *   4. Going back online after being offline resumes network fetches.
 */
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getCached, setCached, isOnline, clearCache } from "@/lib/autocompleteCache";
import LocationAutocomplete from "@/components/LocationAutocomplete";

// Mock geolocation so getUserPos resolves fast without prompting.
Object.defineProperty(global.navigator, "geolocation", {
  configurable: true,
  value: {
    getCurrentPosition: (_ok: any, err: any) => err && err({ code: 1 }),
  },
});

const setOnline = (online: boolean) => {
  Object.defineProperty(global.navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
};

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  await clearCache();
  setOnline(true);
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("autocompleteCache persistence", () => {
  it("round-trips results through localStorage", () => {
    const results = [
      { display_name: "Delhi, India", lat: "28.6", lon: "77.2", place_id: 1 },
    ];
    setCached("delhi", results);
    expect(getCached("delhi")).toEqual(results);
    // Case-insensitive + whitespace-insensitive lookups.
    expect(getCached(" DELHI ")).toEqual(results);
  });

  it("does not store empty arrays (avoids poisoning offline mode)", () => {
    setCached("nowhere", []);
    expect(getCached("nowhere")).toBeNull();
  });

  it("isOnline reflects navigator.onLine", () => {
    setOnline(true);
    expect(isOnline()).toBe(true);
    setOnline(false);
    expect(isOnline()).toBe(false);
  });
});

describe("LocationAutocomplete offline behaviour", () => {
  const primeCache = () => {
    setCached("delhi", [
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
  };

  it("short-circuits network when offline and serves cached results", async () => {
    primeCache();
    setOnline(false);

    const fetchSpy = vi.fn(() =>
      Promise.reject(new Error("network must not be called while offline")),
    );
    // @ts-ignore jsdom fetch override
    global.fetch = fetchSpy;

    const onChange = vi.fn();
    render(
      <LocationAutocomplete value="" onChange={onChange} placeholder="Search" />,
    );

    const input = screen.getByPlaceholderText("Search") as HTMLInputElement;
    await act(async () => {
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "delhi" } });
    });

    // Wait past the 120ms debounce.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });

    // Cached row is visible.
    await waitFor(() => {
      expect(screen.getAllByText(/Delhi/i).length).toBeGreaterThan(0);
    });

    // Absolutely no network attempts while offline.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders the offline chip in the dropdown when navigator is offline", async () => {
    primeCache();
    setOnline(false);

    // @ts-ignore jsdom fetch override
    global.fetch = vi.fn(() => Promise.reject(new Error("offline")));

    render(<LocationAutocomplete value="" onChange={() => {}} placeholder="Search" />);
    const input = screen.getByPlaceholderText("Search");

    await act(async () => {
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "delhi" } });
      await new Promise((r) => setTimeout(r, 200));
    });

    await waitFor(() => {
      // Offline chip text (dropdown surface).
      expect(
        screen.getAllByText(/offline/i).length,
      ).toBeGreaterThan(0);
    });
  });

  it("falls back to the built-in city list when offline with no persisted cache", async () => {
    // No primeCache — cache is empty. Offline should still yield built-in cities.
    setOnline(false);
    const fetchSpy = vi.fn(() => Promise.reject(new Error("offline")));
    // @ts-ignore jsdom fetch override
    global.fetch = fetchSpy;

    render(<LocationAutocomplete value="" onChange={() => {}} placeholder="Search" />);
    const input = screen.getByPlaceholderText("Search");

    await act(async () => {
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "mumbai" } });
      await new Promise((r) => setTimeout(r, 200));
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Mumbai/i).length).toBeGreaterThan(0);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("resumes network fetches after going back online", async () => {
    primeCache();
    setOnline(false);

    const fetchSpy = vi.fn(async (url: string) => {
      // Return an empty Nominatim/Photon-shaped response.
      return new Response(
        JSON.stringify(url.includes("photon") ? { features: [] } : []),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    // @ts-ignore jsdom fetch override
    global.fetch = fetchSpy;

    render(<LocationAutocomplete value="" onChange={() => {}} placeholder="Search" />);
    const input = screen.getByPlaceholderText("Search");

    // Offline: no fetch.
    await act(async () => {
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "delhi" } });
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    // Flip online + fire the browser event the component listens for.
    setOnline(true);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      // A new query (bypasses in-memory + persistent cache) must hit the network.
      fireEvent.change(input, { target: { value: "chennai" } });
      await new Promise((r) => setTimeout(r, 250));
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
  });
});
