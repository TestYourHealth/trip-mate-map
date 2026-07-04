/**
 * Integration tests: parallel providers respect per-provider timeouts,
 * retries, and AbortController cancellation.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { withTimeoutAndRetry, TimeoutError } from "@/lib/withTimeout";
import {
  instrumentProvider,
  clearTelemetry,
  getProviderStats,
  getAllStats,
} from "@/lib/searchTelemetry";

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

beforeEach(() => clearTelemetry());

describe("withTimeoutAndRetry", () => {
  it("resolves fast calls under budget without retrying", async () => {
    const fn = vi.fn(async () => "ok");
    const result = await withTimeoutAndRetry(fn, {
      timeoutMs: 200,
      retries: 2,
      provider: "google",
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws TimeoutError when provider exceeds per-provider budget", async () => {
    const fn = vi.fn((signal: AbortSignal) => wait(500, signal).then(() => "late"));
    await expect(
      withTimeoutAndRetry(fn, { timeoutMs: 50, retries: 0, provider: "nominatim" }),
    ).rejects.toBeInstanceOf(TimeoutError);
  });

  it("aborts the underlying fetch signal on timeout", async () => {
    let capturedSignal: AbortSignal | undefined;
    const fn = (signal: AbortSignal) => {
      capturedSignal = signal;
      return wait(500, signal).then(() => "late");
    };
    await expect(
      withTimeoutAndRetry(fn, { timeoutMs: 30, retries: 0, provider: "photon" }),
    ).rejects.toBeInstanceOf(TimeoutError);
    expect(capturedSignal?.aborted).toBe(true);
  });

  it("retries after a timeout and succeeds on a later attempt", async () => {
    let attempts = 0;
    const fn = vi.fn((signal: AbortSignal) => {
      attempts++;
      // First attempt hangs beyond budget, second returns immediately.
      return attempts === 1 ? wait(200, signal).then(() => "late") : Promise.resolve("ok");
    });
    const result = await withTimeoutAndRetry(fn, {
      timeoutMs: 40,
      retries: 1,
      retryDelayMs: 10,
      provider: "nominatim",
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("stops retrying and surfaces the last error after exhausting attempts", async () => {
    const fn = vi.fn((signal: AbortSignal) => wait(200, signal).then(() => "late"));
    await expect(
      withTimeoutAndRetry(fn, {
        timeoutMs: 20,
        retries: 2,
        retryDelayMs: 5,
        provider: "photon",
      }),
    ).rejects.toBeInstanceOf(TimeoutError);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry when parent AbortController fires", async () => {
    const parent = new AbortController();
    const fn = vi.fn((signal: AbortSignal) => wait(500, signal).then(() => "late"));
    const promise = withTimeoutAndRetry(fn, {
      timeoutMs: 500,
      retries: 3,
      retryDelayMs: 5,
      parentSignal: parent.signal,
      provider: "google",
    });
    setTimeout(() => parent.abort(), 20);
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("propagates parent abort to the provider signal", async () => {
    const parent = new AbortController();
    let capturedSignal: AbortSignal | undefined;
    const fn = (signal: AbortSignal) => {
      capturedSignal = signal;
      return wait(500, signal).then(() => "late");
    };
    const promise = withTimeoutAndRetry(fn, {
      timeoutMs: 500,
      retries: 0,
      parentSignal: parent.signal,
      provider: "nominatim",
    });
    setTimeout(() => parent.abort(), 10);
    await expect(promise).rejects.toBeTruthy();
    expect(capturedSignal?.aborted).toBe(true);
  });
});

describe("parallel providers", () => {
  it("fast providers resolve even when a slow one times out", async () => {
    const google = withTimeoutAndRetry(async () => ["g1", "g2"], {
      timeoutMs: 1800,
      provider: "google",
    });
    const nominatim = withTimeoutAndRetry(
      (signal) => wait(400, signal).then(() => [] as string[]),
      { timeoutMs: 50, retries: 0, provider: "nominatim" },
    );
    const photon = withTimeoutAndRetry(async () => ["p1"], {
      timeoutMs: 2500,
      provider: "photon",
    });

    const results = await Promise.allSettled([google, nominatim, photon]);
    expect(results[0].status).toBe("fulfilled");
    expect(results[1].status).toBe("rejected");
    expect(results[2].status).toBe("fulfilled");
    if (results[1].status === "rejected") {
      expect(results[1].reason).toBeInstanceOf(TimeoutError);
    }
  });

  it("parent abort cancels every in-flight provider", async () => {
    const parent = new AbortController();
    const signals: AbortSignal[] = [];
    const makeSlow = (provider: "google" | "nominatim" | "photon") =>
      withTimeoutAndRetry(
        (signal) => {
          signals.push(signal);
          return wait(1000, signal);
        },
        { timeoutMs: 1000, retries: 0, parentSignal: parent.signal, provider },
      );

    const all = Promise.allSettled([makeSlow("google"), makeSlow("nominatim"), makeSlow("photon")]);
    setTimeout(() => parent.abort(), 20);
    const results = await all;
    expect(results.every((r) => r.status === "rejected")).toBe(true);
    expect(signals.length).toBe(3);
    expect(signals.every((s) => s.aborted)).toBe(true);
  });
});

describe("telemetry instrumentation", () => {
  it("records success + latency and updates rolling stats", async () => {
    await instrumentProvider(
      "google",
      () => new Promise((r) => setTimeout(() => r(["a", "b"]), 15)),
      (r) => (r as string[]).length,
    );
    const stats = getProviderStats("google");
    expect(stats.total).toBe(1);
    expect(stats.successes).toBe(1);
    expect(stats.lastOutcome).toBe("success");
    expect(stats.avgMs).toBeGreaterThanOrEqual(0);
  });

  it("classifies empty results distinctly from successes", async () => {
    await instrumentProvider("photon", async () => [], (r) => (r as unknown[]).length);
    const stats = getProviderStats("photon");
    expect(stats.empties).toBe(1);
    expect(stats.lastOutcome).toBe("empty");
  });

  it("records TimeoutError as a timeout outcome and rethrows", async () => {
    await expect(
      instrumentProvider(
        "nominatim",
        () =>
          withTimeoutAndRetry(
            (signal) => wait(200, signal).then(() => [] as string[]),
            { timeoutMs: 20, retries: 0, provider: "nominatim" },
          ),
        (r) => r.length,
      ),
    ).rejects.toBeInstanceOf(TimeoutError);
    const stats = getProviderStats("nominatim");
    expect(stats.timeouts).toBe(1);
    expect(stats.errors).toBe(1);
    expect(stats.lastOutcome).toBe("timeout");
    expect(stats.errorRate).toBeGreaterThan(0);
  });

  it("records error outcomes with message but not aborts", async () => {
    await expect(
      instrumentProvider(
        "google",
        async () => {
          throw new Error("boom");
        },
        () => 0,
      ),
    ).rejects.toThrow("boom");
    let stats = getProviderStats("google");
    expect(stats.errors).toBe(1);
    expect(stats.lastError).toBe("boom");

    await expect(
      instrumentProvider(
        "google",
        async () => {
          throw new DOMException("Aborted", "AbortError");
        },
        () => 0,
      ),
    ).rejects.toBeTruthy();
    stats = getProviderStats("google");
    expect(stats.lastOutcome).toBe("aborted");
  });

  it("keeps per-provider stats isolated across parallel runs", async () => {
    await Promise.allSettled([
      instrumentProvider("google", async () => ["ok"], (r) => r.length),
      instrumentProvider(
        "nominatim",
        () =>
          withTimeoutAndRetry(
            (signal) => wait(200, signal).then(() => [] as string[]),
            { timeoutMs: 10, retries: 0, provider: "nominatim" },
          ),
        (r) => r.length,
      ),
      instrumentProvider("photon", async () => [], (r) => (r as unknown[]).length),
    ]);
    const all = Object.fromEntries(getAllStats().map((s) => [s.provider, s]));
    expect(all.google.successes).toBe(1);
    expect(all.nominatim.timeouts).toBe(1);
    expect(all.photon.empties).toBe(1);
  });
});
