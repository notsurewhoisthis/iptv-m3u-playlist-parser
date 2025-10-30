# Stream Validation Guide

Check IPTV stream health and availability before playback with concurrent validation, retry logic, and detailed metrics.

## Quick Start

```typescript
import {
  parsePlaylist,
  validateStream,
  validatePlaylist,
  enrichWithHealth,
  filterByHealth,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// Validate single stream
const health = await validateStream(playlist.items[0].url, {
  timeout: 5000,
  method: "HEAD",
});

console.log(`Stream is ${health.alive ? "alive" : "dead"} (${health.latency}ms)`);

// Validate entire playlist
const results = await validatePlaylist(playlist, {
  timeout: 5000,
  concurrency: 20,
  onProgress: (done, total) => console.log(`${done}/${total}`),
});

// Enrich playlist with health data
const enriched = enrichWithHealth(playlist, results);

// Filter to working streams only
const working = filterByHealth(enriched, true);
console.log(`${working.items.length} working streams found`);
```

## Overview

Stream validation helps you:
- Check if streams are reachable and responding
- Measure stream latency/response time
- Remove dead streams from playlists
- Sort streams by health/performance
- Monitor playlist quality over time

**Key Features:**
- Concurrent validation with configurable limits
- Exponential backoff retry logic
- HEAD/GET request methods
- Progress callbacks for UI integration
- Never throws - returns error states
- URL-level deduplication (validates unique URLs once)

---

## When to Validate

**Before Playback:**
- User selects a channel
- App launches (validate favorites)
- Switching between providers

**Periodic Health Checks:**
- Every 1-5 minutes during playback
- Hourly background checks
- After network changes

**Playlist Quality Assurance:**
- After merging playlists
- Before generating filtered playlists
- When debugging playback issues

---

## API Reference

### validateStream()

Validate a single stream URL.

```typescript
function validateStream(
  url: string,
  options?: ValidationOptions
): Promise<StreamHealth>
```

**Parameters:**
- `url` - Stream URL to validate
- `options` - Optional validation configuration

**Returns:** `StreamHealth` object (never throws)

**Options:**

```typescript
interface ValidationOptions {
  /** Request timeout in milliseconds (default: 5000) */
  timeout?: number;

  /** HTTP method to use: 'HEAD' or 'GET' (default: 'HEAD') */
  method?: "HEAD" | "GET";

  /** Number of retry attempts on failure (default: 0) */
  retries?: number;

  /** Maximum concurrent requests (default: 10) */
  concurrency?: number;

  /** Progress callback: (completed, total) => void */
  onProgress?: (completed: number, total: number) => void;
}
```

**StreamHealth Interface:**

```typescript
interface StreamHealth {
  alive: boolean;           // True if stream is reachable and OK (200-299)
  statusCode?: number;      // HTTP status code (if response received)
  latency?: number;         // Response time in milliseconds
  error?: string;           // Error message (if validation failed)
  checkedAt: Date;          // Timestamp of validation
}
```

---

### validatePlaylist()

Validate all streams in playlist with concurrency control.

```typescript
function validatePlaylist(
  playlist: Playlist,
  options?: ValidationOptions
): Promise<Map<string, StreamHealth>>
```

**Parameters:**
- `playlist` - Playlist to validate
- `options` - Validation configuration (with concurrency and progress)

**Returns:** Map of URL to StreamHealth for all **unique URLs**

**Features:**
- Deduplicates URLs (validates each unique URL once)
- Concurrent validation with configurable limit
- Progress callbacks for UI
- Retry logic per URL

---

### enrichWithHealth()

Add health field to playlist entries.

```typescript
function enrichWithHealth(
  playlist: Playlist,
  healthResults: Map<string, StreamHealth>
): Playlist
```

**Parameters:**
- `playlist` - Original playlist
- `healthResults` - Validation results from `validatePlaylist()`

**Returns:** New playlist with `entry.health` field populated

---

### filterByHealth()

Filter playlist by health status.

```typescript
function filterByHealth(
  playlist: Playlist,
  aliveOnly: boolean
): Playlist
```

**Parameters:**
- `playlist` - Playlist with health data (from `enrichWithHealth()`)
- `aliveOnly` - `true` for alive streams, `false` for dead streams

**Returns:** Filtered playlist

---

### getHealthStatistics()

Calculate health statistics from validation results.

```typescript
function getHealthStatistics(
  healthResults: Map<string, StreamHealth>
): {
  total: number;
  alive: number;
  dead: number;
  errors: number;
  averageLatency: number;
}
```

**Returns:** Summary statistics object

---

## Usage Examples

### Validate Single Stream

```typescript
import { validateStream } from "iptv-m3u-playlist-parser";

const url = "http://example.com/stream.m3u8";

const health = await validateStream(url, {
  timeout: 3000,
  method: "HEAD",
  retries: 2,
});

if (health.alive) {
  console.log(`Stream OK (${health.latency}ms, status ${health.statusCode})`);
} else {
  console.log(`Stream failed: ${health.error}`);
}
```

---

### Batch Validate with Progress

```typescript
import {
  parsePlaylist,
  validatePlaylist,
  getHealthStatistics,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

console.log("Validating streams...");

const results = await validatePlaylist(playlist, {
  timeout: 5000,
  concurrency: 20,
  retries: 1,
  onProgress: (completed, total) => {
    const percent = Math.round((completed / total) * 100);
    console.log(`Progress: ${completed}/${total} (${percent}%)`);
  },
});

// Get statistics
const stats = getHealthStatistics(results);
console.log("\nValidation Results:");
console.log(`  Total streams: ${stats.total}`);
console.log(`  Alive: ${stats.alive} (${Math.round(stats.alive/stats.total*100)}%)`);
console.log(`  Dead: ${stats.dead}`);
console.log(`  Errors: ${stats.errors}`);
console.log(`  Average latency: ${stats.averageLatency}ms`);
```

---

### Filter Dead Streams

```typescript
import {
  parsePlaylist,
  validatePlaylist,
  enrichWithHealth,
  filterByHealth,
  generateM3U,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// Validate
const results = await validatePlaylist(playlist, {
  timeout: 5000,
  concurrency: 20,
});

// Enrich with health data
const enriched = enrichWithHealth(playlist, results);

// Filter to working streams only
const working = filterByHealth(enriched, true);

console.log(`Kept ${working.items.length}/${playlist.items.length} streams`);

// Generate clean playlist
const cleanM3U = generateM3U(working);
```

---

### Sort by Latency

```typescript
import {
  parsePlaylist,
  validatePlaylist,
  enrichWithHealth,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);
const results = await validatePlaylist(playlist);
const enriched = enrichWithHealth(playlist, results);

// Sort by latency (fastest first)
const sorted = {
  ...enriched,
  items: [...enriched.items]
    .filter(e => e.health?.alive)
    .sort((a, b) => (a.health?.latency || Infinity) - (b.health?.latency || Infinity)),
};

// Show top 10 fastest
sorted.items.slice(0, 10).forEach((entry, i) => {
  console.log(`${i+1}. ${entry.name}: ${entry.health?.latency}ms`);
});
```

---

### Periodic Health Checks

```typescript
import {
  parsePlaylist,
  validatePlaylist,
  enrichWithHealth,
} from "iptv-m3u-playlist-parser";

async function monitorPlaylist(playlist: Playlist) {
  while (true) {
    console.log("Running health check...");

    const results = await validatePlaylist(playlist, {
      timeout: 5000,
      concurrency: 10,
    });

    const stats = getHealthStatistics(results);
    console.log(`Alive: ${stats.alive}/${stats.total} (${Math.round(stats.alive/stats.total*100)}%)`);

    // Alert if health drops
    if (stats.alive / stats.total < 0.8) {
      console.warn("WARNING: Playlist health below 80%!");
    }

    // Wait 5 minutes
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
  }
}

const playlist = parsePlaylist(m3uText);
monitorPlaylist(playlist);
```

---

### Pre-Flight Check Before Playback

```typescript
import { validateStream } from "iptv-m3u-playlist-parser";

async function playStream(url: string) {
  // Quick health check before playing
  const health = await validateStream(url, {
    timeout: 3000,
    method: "HEAD",
  });

  if (!health.alive) {
    console.error(`Stream unavailable: ${health.error}`);
    // Try alternative URL or show error to user
    return;
  }

  console.log(`Stream OK (${health.latency}ms), starting playback...`);
  // Start player
}
```

---

### Compare Playlists by Health

```typescript
import {
  parsePlaylist,
  validatePlaylist,
  getHealthStatistics,
} from "iptv-m3u-playlist-parser";

async function compareProviders(
  playlist1: Playlist,
  playlist2: Playlist
): Promise<void> {
  console.log("Validating Provider 1...");
  const results1 = await validatePlaylist(playlist1);
  const stats1 = getHealthStatistics(results1);

  console.log("Validating Provider 2...");
  const results2 = await validatePlaylist(playlist2);
  const stats2 = getHealthStatistics(results2);

  console.log("\nComparison:");
  console.log(`Provider 1: ${stats1.alive}/${stats1.total} alive (${stats1.averageLatency}ms avg)`);
  console.log(`Provider 2: ${stats2.alive}/${stats2.total} alive (${stats2.averageLatency}ms avg)`);

  if (stats1.alive > stats2.alive) {
    console.log("✅ Provider 1 has more working streams");
  } else if (stats2.alive > stats1.alive) {
    console.log("✅ Provider 2 has more working streams");
  }

  if (stats1.averageLatency < stats2.averageLatency) {
    console.log("⚡ Provider 1 is faster");
  } else if (stats2.averageLatency < stats1.averageLatency) {
    console.log("⚡ Provider 2 is faster");
  }
}
```

---

### Retry Strategy with Exponential Backoff

```typescript
import { validateStream } from "iptv-m3u-playlist-parser";

// Built-in retry with exponential backoff
const health = await validateStream(url, {
  timeout: 5000,
  retries: 3, // Retry up to 3 times
});

// Retry schedule:
// - Attempt 1: Immediate
// - Attempt 2: +1 second
// - Attempt 3: +2 seconds
// - Attempt 4: +4 seconds

console.log(health.alive ? "Stream OK" : "Stream failed after retries");
```

---

### Custom Progress UI

```typescript
import {
  parsePlaylist,
  validatePlaylist,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// Progress bar for terminal
function drawProgressBar(current: number, total: number) {
  const width = 40;
  const percent = current / total;
  const filled = Math.round(width * percent);
  const empty = width - filled;

  const bar = "█".repeat(filled) + "░".repeat(empty);
  const percentText = Math.round(percent * 100);

  process.stdout.write(`\r[${bar}] ${percentText}% (${current}/${total})`);

  if (current === total) {
    console.log(); // New line when done
  }
}

// Validate with progress bar
const results = await validatePlaylist(playlist, {
  timeout: 5000,
  concurrency: 20,
  onProgress: drawProgressBar,
});

console.log("Validation complete!");
```

---

## Performance Considerations

### Concurrency Control

**Default concurrency:** 10 simultaneous requests

```typescript
// Too low = slow validation
await validatePlaylist(playlist, { concurrency: 5 });

// Optimal for most cases
await validatePlaylist(playlist, { concurrency: 20 });

// Too high = may hit rate limits or overload network
await validatePlaylist(playlist, { concurrency: 100 });
```

**Recommendation:**
- **Small playlists (<100 streams):** concurrency 10-20
- **Medium playlists (100-1000):** concurrency 20-50
- **Large playlists (1000+):** concurrency 50-100

---

### Timeout Tuning

**Default timeout:** 5000ms (5 seconds)

```typescript
// Faster validation, more false negatives
await validateStream(url, { timeout: 2000 }); // 2 seconds

// Balanced (recommended)
await validateStream(url, { timeout: 5000 }); // 5 seconds

// Conservative, catches slow streams
await validateStream(url, { timeout: 10000 }); // 10 seconds
```

**Guidance:**
- **HEAD requests:** 2-5 seconds
- **GET requests:** 5-10 seconds
- **Slow networks:** 10-15 seconds

---

### HEAD vs GET

**HEAD (default):** Faster, only checks headers

```typescript
await validateStream(url, { method: "HEAD" });
// Pros: Fast (~100-500ms), low bandwidth
// Cons: Some servers don't support HEAD
```

**GET:** Slower, downloads content

```typescript
await validateStream(url, { method: "GET" });
// Pros: More reliable, works everywhere
// Cons: Slow (~500-2000ms), higher bandwidth
```

**Recommendation:** Use HEAD by default, fallback to GET if HEAD fails.

---

### Retry Strategies

**No retries (default):** Fast but may miss temporary failures

```typescript
await validateStream(url, { retries: 0 });
```

**1-2 retries:** Good balance for production

```typescript
await validateStream(url, { retries: 1 }); // Total 2 attempts
```

**3+ retries:** Very conservative, slow

```typescript
await validateStream(url, { retries: 3 }); // Total 4 attempts
```

**Recommendation:** Use 1 retry for user-facing validation, 0 for background checks.

---

## Validation Times

**Typical validation times:**

| Playlist Size | Concurrency | Timeout | Estimated Time |
|---------------|-------------|---------|----------------|
| 100 streams | 10 | 5s | 30-50 seconds |
| 100 streams | 20 | 5s | 20-30 seconds |
| 500 streams | 20 | 5s | 2-3 minutes |
| 1000 streams | 50 | 5s | 2-4 minutes |
| 5000 streams | 100 | 5s | 5-10 minutes |

---

## Troubleshooting

### Issue: Validation is too slow

**Problem:** Validating 500 streams takes 10+ minutes.

**Solutions:**

1. Increase concurrency:
```typescript
await validatePlaylist(playlist, { concurrency: 50 });
```

2. Reduce timeout:
```typescript
await validatePlaylist(playlist, { timeout: 3000 });
```

3. Remove retries for speed:
```typescript
await validatePlaylist(playlist, { retries: 0 });
```

---

### Issue: Too many false negatives

**Problem:** Working streams marked as dead.

**Solutions:**

1. Increase timeout:
```typescript
await validateStream(url, { timeout: 10000 });
```

2. Add retries:
```typescript
await validateStream(url, { retries: 2 });
```

3. Switch to GET method:
```typescript
await validateStream(url, { method: "GET" });
```

---

### Issue: Some streams always fail validation

**Problem:** Certain streams fail validation but work in player.

**Causes:**
1. Server doesn't support HEAD requests
2. Server requires authentication headers
3. Server has strict CORS/referrer policies
4. Rate limiting

**Solutions:**

```typescript
// Try GET instead of HEAD
const health = await validateStream(url, { method: "GET" });

// Check if specific error
if (health.error?.includes("405")) {
  console.log("Server doesn't support HEAD, use GET");
}

// Some streams only work in player context
// Skip validation for these URLs
const skipValidation = ["special-provider.com"];
if (skipValidation.some(domain => url.includes(domain))) {
  // Assume alive
}
```

---

### Issue: Rate limiting from provider

**Problem:** Provider blocks validation requests.

**Solutions:**

1. Reduce concurrency:
```typescript
await validatePlaylist(playlist, { concurrency: 5 });
```

2. Add delays between requests (custom implementation):
```typescript
for (const entry of playlist.items) {
  await validateStream(entry.url);
  await new Promise(r => setTimeout(r, 1000)); // 1 second delay
}
```

3. Validate sample only:
```typescript
const sample = {
  ...playlist,
  items: playlist.items.filter((_, i) => i % 10 === 0), // Every 10th entry
};
await validatePlaylist(sample);
```

---

### Issue: Memory usage with large playlists

**Problem:** Validating 10K+ streams uses too much memory.

**Solution:** Validate in batches:

```typescript
async function validateInBatches(
  playlist: Playlist,
  batchSize = 1000
): Promise<Map<string, StreamHealth>> {
  const results = new Map<string, StreamHealth>();

  for (let i = 0; i < playlist.items.length; i += batchSize) {
    const batch = {
      ...playlist,
      items: playlist.items.slice(i, i + batchSize),
    };

    console.log(`Validating batch ${i/batchSize + 1}...`);
    const batchResults = await validatePlaylist(batch);

    // Merge results
    batchResults.forEach((health, url) => results.set(url, health));
  }

  return results;
}
```

---

### Issue: Validation results inconsistent

**Problem:** Same stream sometimes alive, sometimes dead.

**Causes:**
1. Intermittent server issues
2. Load balancing / CDN routing
3. Geographic restrictions
4. Network instability

**Solutions:**

1. Validate multiple times:
```typescript
async function validateWithConfidence(url: string, attempts = 3) {
  let aliveCount = 0;

  for (let i = 0; i < attempts; i++) {
    const health = await validateStream(url);
    if (health.alive) aliveCount++;
    await new Promise(r => setTimeout(r, 1000));
  }

  return aliveCount >= Math.ceil(attempts / 2);
}
```

2. Store historical data:
```typescript
const history = new Map<string, boolean[]>();

function updateHistory(url: string, alive: boolean) {
  if (!history.has(url)) {
    history.set(url, []);
  }
  history.get(url)!.push(alive);
  // Keep last 10 results
  if (history.get(url)!.length > 10) {
    history.get(url)!.shift();
  }
}

function getReliability(url: string): number {
  const results = history.get(url) || [];
  if (results.length === 0) return 0;
  const aliveCount = results.filter(r => r).length;
  return aliveCount / results.length;
}
```

---

## Best Practices

1. **Always validate before generating clean playlists**
2. **Use progress callbacks for user feedback**
3. **Tune concurrency based on network conditions**
4. **Store validation timestamps for caching**
5. **Don't validate too frequently** (rate limiting)
6. **Handle authentication streams separately**
7. **Combine with EPG data** (only show channels with EPG+working stream)
8. **Log failed validations** for debugging provider issues

---

## Related Documentation

- **[README.md](../README.md)** - Main library documentation
- **[GENERATOR.md](GENERATOR.md)** - Generate clean playlists from validated streams
- **[EPG.md](EPG.md)** - Validate streams before showing EPG
- **[CATCHUP.md](CATCHUP.md)** - Validate catchup URLs before playback
