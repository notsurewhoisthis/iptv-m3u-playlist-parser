import test from "node:test";
import assert from "node:assert/strict";
import {
  validateStream,
  validatePlaylist,
  enrichWithHealth,
  filterByHealth,
  getHealthStatistics,
} from "../dist/validate.js";

// Store original fetch
const originalFetch = global.fetch;

// Mock fetch for testing
function setupMockFetch() {
  global.fetch = async (url, options) => {
    const urlStr = url.toString();

    // Simulate different response types based on URL
    if (urlStr.includes("alive")) {
      return {
        ok: true,
        status: 200,
      };
    }

    if (urlStr.includes("redirect")) {
      return {
        ok: true,
        status: 301,
      };
    }

    if (urlStr.includes("dead")) {
      throw new Error("Connection refused");
    }

    if (urlStr.includes("timeout")) {
      // Simulate timeout - wait longer than test timeout
      await new Promise((resolve) => setTimeout(resolve, 10000));
      return { ok: false, status: 408 };
    }

    if (urlStr.includes("404")) {
      return {
        ok: false,
        status: 404,
      };
    }

    if (urlStr.includes("500")) {
      return {
        ok: false,
        status: 500,
      };
    }

    // Default: alive
    return {
      ok: true,
      status: 200,
    };
  };
}

// Restore original fetch
function teardownMockFetch() {
  global.fetch = originalFetch;
}

// Helper to create test entry
function createEntry(url) {
  return {
    name: "Test Channel",
    url,
    duration: -1,
    attrs: {},
    group: [],
  };
}

// Helper to create test playlist
function createPlaylist(urls) {
  return {
    header: {
      tvgUrls: [],
      rawAttrs: {},
    },
    items: urls.map((url) => createEntry(url)),
    warnings: [],
  };
}

test("validateStream - alive stream returns success", async () => {
  setupMockFetch();

  const health = await validateStream("http://alive.com/stream.m3u8");

  assert.equal(health.alive, true);
  assert.equal(health.statusCode, 200);
  assert.ok(typeof health.latency === "number");
  assert.ok(health.latency >= 0);
  assert.ok(health.checkedAt instanceof Date);

  teardownMockFetch();
});

test("validateStream - dead stream returns failure", async () => {
  setupMockFetch();

  const health = await validateStream("http://dead.com/stream.m3u8");

  assert.equal(health.alive, false);
  assert.ok(health.error);
  assert.ok(health.error.includes("Connection refused"));
  assert.ok(health.checkedAt instanceof Date);

  teardownMockFetch();
});

test("validateStream - 404 response", async () => {
  setupMockFetch();

  const health = await validateStream("http://404.com/stream.m3u8");

  assert.equal(health.alive, false);
  assert.equal(health.statusCode, 404);
  assert.ok(typeof health.latency === "number");

  teardownMockFetch();
});

test("validateStream - 500 server error", async () => {
  setupMockFetch();

  const health = await validateStream("http://500.com/stream.m3u8");

  assert.equal(health.alive, false);
  assert.equal(health.statusCode, 500);

  teardownMockFetch();
});

test("validateStream - invalid URL", async () => {
  setupMockFetch();

  const health = await validateStream("not-a-valid-url");

  assert.equal(health.alive, false);
  assert.equal(health.error, "Invalid URL");
  assert.ok(!health.statusCode);
  assert.ok(!health.latency);

  teardownMockFetch();
});

test("validateStream - with custom timeout", async () => {
  setupMockFetch();

  // This test verifies timeout option is accepted
  const health = await validateStream("http://alive.com/stream.m3u8", {
    timeout: 5000,
  });

  // Should succeed with alive URL
  assert.equal(health.alive, true);

  teardownMockFetch();
});

test("validateStream - with GET method", async () => {
  setupMockFetch();

  const health = await validateStream("http://alive.com/stream.m3u8", {
    method: "GET",
  });

  assert.equal(health.alive, true);
  assert.equal(health.statusCode, 200);

  teardownMockFetch();
});

test("validateStream - with retry on failure", async () => {
  setupMockFetch();

  let attempts = 0;
  const originalMock = global.fetch;
  global.fetch = async (url, options) => {
    attempts++;
    if (attempts < 3) {
      throw new Error("Connection refused");
    }
    return { ok: true, status: 200 };
  };

  const health = await validateStream("http://flaky.com/stream.m3u8", {
    retries: 2,
  });

  assert.equal(health.alive, true);
  assert.equal(attempts, 3); // Initial + 2 retries

  global.fetch = originalMock;
  teardownMockFetch();
});

test("validateStream - retry exhausted returns failure", async () => {
  setupMockFetch();

  let attempts = 0;
  const originalMock = global.fetch;
  global.fetch = async () => {
    attempts++;
    throw new Error("Always fails");
  };

  const health = await validateStream("http://dead.com/stream.m3u8", {
    retries: 2,
  });

  assert.equal(health.alive, false);
  assert.equal(attempts, 3); // Initial + 2 retries

  global.fetch = originalMock;
  teardownMockFetch();
});

test("validatePlaylist - validates all unique URLs", async () => {
  setupMockFetch();

  const playlist = createPlaylist([
    "http://alive.com/stream1.m3u8",
    "http://alive.com/stream2.m3u8",
    "http://dead.com/stream3.m3u8",
  ]);

  const results = await validatePlaylist(playlist);

  assert.equal(results.size, 3);
  assert.ok(results.get("http://alive.com/stream1.m3u8")?.alive);
  assert.ok(results.get("http://alive.com/stream2.m3u8")?.alive);
  assert.ok(!results.get("http://dead.com/stream3.m3u8")?.alive);

  teardownMockFetch();
});

test("validatePlaylist - deduplicates URLs", async () => {
  setupMockFetch();

  const playlist = createPlaylist([
    "http://alive.com/stream.m3u8",
    "http://alive.com/stream.m3u8", // Duplicate
    "http://alive.com/stream.m3u8", // Another duplicate
  ]);

  const results = await validatePlaylist(playlist);

  // Should only validate once
  assert.equal(results.size, 1);
  assert.ok(results.get("http://alive.com/stream.m3u8")?.alive);

  teardownMockFetch();
});

test("validatePlaylist - empty playlist returns empty results", async () => {
  setupMockFetch();

  const playlist = createPlaylist([]);
  const results = await validatePlaylist(playlist);

  assert.equal(results.size, 0);

  teardownMockFetch();
});

test("validatePlaylist - with progress callback", async () => {
  setupMockFetch();

  const playlist = createPlaylist([
    "http://alive.com/stream1.m3u8",
    "http://alive.com/stream2.m3u8",
    "http://alive.com/stream3.m3u8",
  ]);

  const progressUpdates = [];
  const results = await validatePlaylist(playlist, {
    concurrency: 1, // Sequential to ensure predictable progress
    onProgress: (completed, total) => {
      progressUpdates.push({ completed, total });
    },
  });

  assert.equal(progressUpdates.length, 3);
  assert.equal(progressUpdates[0].completed, 1);
  assert.equal(progressUpdates[0].total, 3);
  assert.equal(progressUpdates[2].completed, 3);
  assert.equal(progressUpdates[2].total, 3);

  teardownMockFetch();
});

test("validatePlaylist - with concurrency control", async () => {
  setupMockFetch();

  let concurrentRequests = 0;
  let maxConcurrent = 0;

  const originalMock = global.fetch;
  global.fetch = async (url) => {
    concurrentRequests++;
    maxConcurrent = Math.max(maxConcurrent, concurrentRequests);

    await new Promise((resolve) => setTimeout(resolve, 10));

    concurrentRequests--;
    return { ok: true, status: 200 };
  };

  const playlist = createPlaylist([
    "http://stream1.com/s.m3u8",
    "http://stream2.com/s.m3u8",
    "http://stream3.com/s.m3u8",
    "http://stream4.com/s.m3u8",
    "http://stream5.com/s.m3u8",
  ]);

  await validatePlaylist(playlist, { concurrency: 2 });

  // Should never exceed concurrency limit
  assert.ok(maxConcurrent <= 2);

  global.fetch = originalMock;
  teardownMockFetch();
});

test("enrichWithHealth - adds health to entries", async () => {
  setupMockFetch();

  const playlist = createPlaylist([
    "http://alive.com/stream.m3u8",
    "http://dead.com/stream.m3u8",
  ]);

  const healthResults = await validatePlaylist(playlist);
  const enriched = enrichWithHealth(playlist, healthResults);

  assert.ok(enriched.items[0].health);
  assert.equal(enriched.items[0].health.alive, true);

  assert.ok(enriched.items[1].health);
  assert.equal(enriched.items[1].health.alive, false);

  teardownMockFetch();
});

test("enrichWithHealth - entries without health remain unchanged", async () => {
  const playlist = createPlaylist(["http://example.com/stream.m3u8"]);
  const healthResults = new Map(); // Empty results

  const enriched = enrichWithHealth(playlist, healthResults);

  assert.ok(!enriched.items[0].health);
});

test("filterByHealth - alive only", async () => {
  setupMockFetch();

  const playlist = createPlaylist([
    "http://alive.com/stream1.m3u8",
    "http://dead.com/stream2.m3u8",
    "http://alive.com/stream3.m3u8",
  ]);

  const healthResults = await validatePlaylist(playlist);
  const enriched = enrichWithHealth(playlist, healthResults);
  const aliveOnly = filterByHealth(enriched, true);

  assert.equal(aliveOnly.items.length, 2);
  assert.ok(aliveOnly.items.every((item) => item.health?.alive));

  teardownMockFetch();
});

test("filterByHealth - dead only", async () => {
  setupMockFetch();

  const playlist = createPlaylist([
    "http://alive.com/stream1.m3u8",
    "http://dead.com/stream2.m3u8",
    "http://dead.com/stream3.m3u8",
  ]);

  const healthResults = await validatePlaylist(playlist);
  const enriched = enrichWithHealth(playlist, healthResults);
  const deadOnly = filterByHealth(enriched, false);

  assert.equal(deadOnly.items.length, 2);
  assert.ok(deadOnly.items.every((item) => !item.health?.alive));

  teardownMockFetch();
});

test("filterByHealth - excludes entries without health", () => {
  const entry1 = createEntry("http://example.com/s1.m3u8");
  const entry2 = createEntry("http://example.com/s2.m3u8");
  entry1.health = { alive: true, checkedAt: new Date() };
  // entry2 has no health

  const playlist = {
    header: { tvgUrls: [], rawAttrs: {} },
    items: [entry1, entry2],
    warnings: [],
  };

  const filtered = filterByHealth(playlist, true);

  assert.equal(filtered.items.length, 1);
  assert.equal(filtered.items[0].url, "http://example.com/s1.m3u8");
});

test("getHealthStatistics - calculates correct stats", async () => {
  setupMockFetch();

  const playlist = createPlaylist([
    "http://alive.com/stream1.m3u8",
    "http://alive.com/stream2.m3u8",
    "http://dead.com/stream3.m3u8",
    "http://404.com/stream4.m3u8",
  ]);

  const healthResults = await validatePlaylist(playlist);
  const stats = getHealthStatistics(healthResults);

  assert.equal(stats.total, 4);
  assert.equal(stats.alive, 2);
  assert.equal(stats.dead, 2);
  // Only dead has error (404 has statusCode but no error message)
  assert.ok(stats.errors >= 1); // At least the dead stream
  assert.ok(stats.averageLatency >= 0);

  teardownMockFetch();
});

test("getHealthStatistics - handles empty results", () => {
  const healthResults = new Map();
  const stats = getHealthStatistics(healthResults);

  assert.equal(stats.total, 0);
  assert.equal(stats.alive, 0);
  assert.equal(stats.dead, 0);
  assert.equal(stats.errors, 0);
  assert.equal(stats.averageLatency, 0);
});

test("getHealthStatistics - calculates average latency correctly", async () => {
  setupMockFetch();

  const healthResults = new Map();
  healthResults.set("url1", {
    alive: true,
    latency: 100,
    checkedAt: new Date(),
  });
  healthResults.set("url2", {
    alive: true,
    latency: 200,
    checkedAt: new Date(),
  });
  healthResults.set("url3", {
    alive: false,
    latency: 300,
    checkedAt: new Date(),
  });

  const stats = getHealthStatistics(healthResults);

  // Average: (100 + 200 + 300) / 3 = 200
  assert.equal(stats.averageLatency, 200);

  teardownMockFetch();
});

test("validateStream - measures latency", async () => {
  setupMockFetch();

  const originalMock = global.fetch;
  global.fetch = async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { ok: true, status: 200 };
  };

  const health = await validateStream("http://example.com/stream.m3u8");

  assert.ok(health.latency >= 50);
  assert.ok(health.latency < 200); // Should complete reasonably fast

  global.fetch = originalMock;
  teardownMockFetch();
});

test("validatePlaylist - with custom options", async () => {
  setupMockFetch();

  const playlist = createPlaylist(["http://alive.com/stream.m3u8"]);

  const results = await validatePlaylist(playlist, {
    timeout: 3000,
    method: "GET",
    retries: 1,
    concurrency: 5,
  });

  assert.equal(results.size, 1);
  assert.ok(results.get("http://alive.com/stream.m3u8")?.alive);

  teardownMockFetch();
});

test("validateStream - timeout aborts request", async () => {
  setupMockFetch();

  const originalMock = global.fetch;

  // Need to track if abort was called
  global.fetch = async (url, options) => {
    const signal = options?.signal;

    // If signal is aborted during wait, throw
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (signal?.aborted) {
          reject(new Error("Request timeout"));
        } else {
          resolve({ ok: true, status: 200 });
        }
      }, 200);

      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error("Request timeout"));
        });
      }
    });
  };

  const health = await validateStream("http://slow.com/stream.m3u8", {
    timeout: 50, // Very short timeout
  });

  assert.equal(health.alive, false);
  assert.ok(health.error?.includes("timeout") || health.error?.includes("Timeout"));

  global.fetch = originalMock;
  teardownMockFetch();
});

test("enrichWithHealth - preserves original playlist structure", async () => {
  const playlist = createPlaylist(["http://example.com/stream.m3u8"]);
  const healthResults = new Map();
  healthResults.set("http://example.com/stream.m3u8", {
    alive: true,
    statusCode: 200,
    latency: 100,
    checkedAt: new Date(),
  });

  const enriched = enrichWithHealth(playlist, healthResults);

  // Should not mutate original
  assert.ok(!playlist.items[0].health);
  // New playlist should have health
  assert.ok(enriched.items[0].health);
  // Other fields preserved
  assert.equal(enriched.items[0].name, "Test Channel");
  assert.equal(enriched.items[0].url, "http://example.com/stream.m3u8");
});
