/**
 * Race a promise-returning function against a timeout, with optional retries.
 * On timeout the internal AbortController fires so the underlying fetch is cancelled.
 * The parent signal (if provided) still short-circuits everything.
 */
export class TimeoutError extends Error {
  constructor(public provider: string, public ms: number) {
    super(`${provider} timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export interface WithTimeoutOptions {
  timeoutMs: number;
  retries?: number;         // extra attempts after the first (default 0)
  retryDelayMs?: number;    // backoff between attempts (default 250)
  parentSignal?: AbortSignal;
  provider: string;         // label for errors
}

export async function withTimeoutAndRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  opts: WithTimeoutOptions,
): Promise<T> {
  const { timeoutMs, retries = 0, retryDelayMs = 250, parentSignal, provider } = opts;
  let lastErr: unknown;
  const totalAttempts = retries + 1;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    if (parentSignal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const ctrl = new AbortController();
    const onParentAbort = () => ctrl.abort();
    parentSignal?.addEventListener('abort', onParentAbort);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        ctrl.abort();
        reject(new TimeoutError(provider, timeoutMs));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([fn(ctrl.signal), timeoutPromise]);
      return result;
    } catch (err) {
      lastErr = err;
      // Do not retry aborts triggered by the parent
      if (parentSignal?.aborted) throw err;
      const isTimeout = err instanceof TimeoutError;
      const isNetwork = err instanceof TypeError; // fetch network failure
      if (attempt < totalAttempts - 1 && (isTimeout || isNetwork)) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
      parentSignal?.removeEventListener('abort', onParentAbort);
    }
  }
  throw lastErr ?? new Error(`${provider} failed`);
}
