import type {
  Playlist,
  Entry,
  StreamHealth,
  ValidationOptions,
} from "./types.js";

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: Required<Omit<ValidationOptions, "onProgress">> = {
  timeout: 5000,
  method: "HEAD",
  retries: 0,
  concurrency: 10,
};

/**
 * Sleep utility for retry backoff
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout using AbortController
 * @param url - URL to fetch
 * @param method - HTTP method (HEAD or GET)
 * @param timeout - Timeout in milliseconds
 * @returns Response object
 * @throws Error if request times out or fails
 */
async function fetchWithTimeout(
  url: string,
  method: "HEAD" | "GET",
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Convert AbortError to timeout
    if (error.name === "AbortError") {
      throw new Error("Request timeout");
    }

    throw error;
  }
}

/**
 * Validate stream once (no retry)
 * Measures latency and handles timeout
 * @param url - Stream URL to validate
 * @param options - Validation options
 * @returns StreamHealth object with validation results
 */
async function validateStreamOnce(
  url: string,
  options: ValidationOptions
): Promise<StreamHealth> {
  const startTime = performance.now();

  try {
    const response = await fetchWithTimeout(
      url,
      options.method!,
      options.timeout!
    );
    const latency = Math.round(performance.now() - startTime);

    return {
      alive: response.ok, // 200-299
      statusCode: response.status,
      latency,
      checkedAt: new Date(),
    };
  } catch (error: any) {
    const latency = Math.round(performance.now() - startTime);

    return {
      alive: false,
      latency,
      error: error.message || String(error),
      checkedAt: new Date(),
    };
  }
}

/**
 * Validate with retry logic and exponential backoff
 * @param url - Stream URL to validate
 * @param options - Validation options
 * @param attempt - Current attempt number (internal)
 * @returns StreamHealth object with validation results
 */
async function validateWithRetry(
  url: string,
  options: ValidationOptions,
  attempt: number = 0
): Promise<StreamHealth> {
  const result = await validateStreamOnce(url, options);

  // If alive or no retries left, return result
  if (result.alive || attempt >= options.retries!) {
    return result;
  }

  // Exponential backoff: 2^attempt * 1000ms (1s, 2s, 4s, ...)
  await sleep(Math.pow(2, attempt) * 1000);

  // Retry
  return validateWithRetry(url, options, attempt + 1);
}

/**
 * Validate multiple URLs with concurrency control
 * Uses promise pool pattern to limit concurrent requests
 * @param urls - Array of URLs to validate
 * @param concurrency - Maximum concurrent requests
 * @param validator - Validator function to use
 * @param onProgress - Optional progress callback
 * @returns Map of URL to StreamHealth
 */
async function validateWithConcurrency(
  urls: string[],
  concurrency: number,
  validator: (url: string) => Promise<StreamHealth>,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, StreamHealth>> {
  const results = new Map<string, StreamHealth>();
  const queue = [...urls];
  const total = urls.length;
  let completed = 0;

  // Worker function that processes URLs from the queue
  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift()!;
      const result = await validator(url);
      results.set(url, result);

      completed++;
      if (onProgress) {
        onProgress(completed, total);
      }
    }
  }

  // Spawn N workers (up to queue size)
  const workers = Array.from(
    { length: Math.min(concurrency, urls.length) },
    () => worker()
  );
  await Promise.all(workers);

  return results;
}

/**
 * Validate a single stream URL
 * Returns health status with statusCode, latency, error
 * Never throws - returns error state on failure
 *
 * @param url - Stream URL to validate
 * @param options - Validation options
 * @returns StreamHealth object with validation results
 *
 * @example
 * ```typescript
 * const health = await validateStream('http://example.com/stream.m3u8', {
 *   timeout: 3000,
 *   method: 'HEAD',
 *   retries: 2
 * });
 *
 * if (health.alive) {
 *   console.log(`Stream is alive (${health.latency}ms)`);
 * } else {
 *   console.log(`Stream is dead: ${health.error}`);
 * }
 * ```
 */
export async function validateStream(
  url: string,
  options: ValidationOptions = {}
): Promise<StreamHealth> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return {
      alive: false,
      error: "Invalid URL",
      checkedAt: new Date(),
    };
  }

  return validateWithRetry(url, opts);
}

/**
 * Validate all streams in playlist with concurrency control
 * Returns Map of URL → StreamHealth
 * Progress callback invoked after each validation
 *
 * @param playlist - Playlist object containing entries to validate
 * @param options - Validation options
 * @returns Map of URL to StreamHealth for all unique URLs
 *
 * @example
 * ```typescript
 * const results = await validatePlaylist(playlist, {
 *   timeout: 5000,
 *   concurrency: 20,
 *   onProgress: (completed, total) => {
 *     console.log(`Progress: ${completed}/${total}`);
 *   }
 * });
 *
 * console.log(`Validated ${results.size} unique streams`);
 * ```
 */
export async function validatePlaylist(
  playlist: Playlist,
  options: ValidationOptions = {}
): Promise<Map<string, StreamHealth>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Extract unique URLs
  const urls = Array.from(new Set(playlist.items.map((item) => item.url)));

  // Handle empty playlist
  if (urls.length === 0) {
    return new Map();
  }

  // Create validator with options
  const validator = (url: string) => validateWithRetry(url, opts);

  // Validate with concurrency
  return validateWithConcurrency(urls, opts.concurrency, validator, opts.onProgress);
}

/**
 * Enrich playlist entries with health field
 * Matches by entry.url and adds health data from validation results
 *
 * @param playlist - Original playlist
 * @param healthResults - Map of URL to StreamHealth from validatePlaylist()
 * @returns New playlist with health field populated for matching entries
 *
 * @example
 * ```typescript
 * const healthResults = await validatePlaylist(playlist);
 * const enrichedPlaylist = enrichWithHealth(playlist, healthResults);
 *
 * // Now each entry has a health field
 * enrichedPlaylist.items.forEach(entry => {
 *   if (entry.health?.alive) {
 *     console.log(`${entry.name}: alive (${entry.health.latency}ms)`);
 *   }
 * });
 * ```
 */
export function enrichWithHealth(
  playlist: Playlist,
  healthResults: Map<string, StreamHealth>
): Playlist {
  const enrichedItems = playlist.items.map((entry) => {
    const health = healthResults.get(entry.url);
    if (!health) return entry;

    return { ...entry, health };
  });

  return { ...playlist, items: enrichedItems };
}

/**
 * Filter playlist by health status
 * Returns only entries with health data that match the specified status
 *
 * @param playlist - Playlist with health data (from enrichWithHealth)
 * @param aliveOnly - If true, return only alive streams; if false, return only dead streams
 * @returns Filtered playlist containing only matching entries
 *
 * @example
 * ```typescript
 * const healthResults = await validatePlaylist(playlist);
 * const enriched = enrichWithHealth(playlist, healthResults);
 *
 * // Get only working streams
 * const alivePlaylist = filterByHealth(enriched, true);
 * console.log(`${alivePlaylist.items.length} working streams`);
 *
 * // Get only broken streams
 * const deadPlaylist = filterByHealth(enriched, false);
 * console.log(`${deadPlaylist.items.length} broken streams`);
 * ```
 */
export function filterByHealth(
  playlist: Playlist,
  aliveOnly: boolean
): Playlist {
  const filteredItems = playlist.items.filter((entry) => {
    if (!entry.health) return false;
    return aliveOnly ? entry.health.alive : !entry.health.alive;
  });

  return { ...playlist, items: filteredItems };
}

/**
 * Calculate health statistics from validation results
 * Provides summary metrics for playlist health analysis
 *
 * @param healthResults - Map of URL to StreamHealth from validatePlaylist()
 * @returns Statistics object with counts and average latency
 *
 * @example
 * ```typescript
 * const healthResults = await validatePlaylist(playlist);
 * const stats = getHealthStatistics(healthResults);
 *
 * console.log(`Total streams: ${stats.total}`);
 * console.log(`Alive: ${stats.alive} (${(stats.alive/stats.total*100).toFixed(1)}%)`);
 * console.log(`Dead: ${stats.dead}`);
 * console.log(`Errors: ${stats.errors}`);
 * console.log(`Average latency: ${stats.averageLatency}ms`);
 * ```
 */
export function getHealthStatistics(
  healthResults: Map<string, StreamHealth>
): {
  total: number;
  alive: number;
  dead: number;
  errors: number;
  averageLatency: number;
} {
  let alive = 0;
  let dead = 0;
  let errors = 0;
  let totalLatency = 0;
  let latencyCount = 0;

  for (const health of healthResults.values()) {
    if (health.alive) {
      alive++;
    } else {
      dead++;
      if (health.error) errors++;
    }

    if (health.latency != null) {
      totalLatency += health.latency;
      latencyCount++;
    }
  }

  return {
    total: healthResults.size,
    alive,
    dead,
    errors,
    averageLatency:
      latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
  };
}
