import test from "node:test";
import assert from "node:assert/strict";
import {
  extractCatchupInfo,
  hasCatchup,
  buildCatchupUrl,
  getCatchupWindow,
  enrichWithCatchup,
  filterCatchupEntries,
} from "../dist/catchup.js";

// Helper to create test entry
function createEntry(attrs = {}) {
  return {
    name: "Test Channel",
    url: "http://example.com/stream.m3u8",
    duration: -1,
    attrs,
    group: [],
  };
}

// Helper to create test playlist
function createPlaylist(headerAttrs = {}, items = []) {
  return {
    header: {
      tvgUrls: [],
      rawAttrs: {},
      ...headerAttrs,
    },
    items,
    warnings: [],
  };
}

test("extractCatchupInfo - from entry-level attrs", () => {
  const entry = createEntry({
    catchup: "default",
    "catchup-source": "?utc={utc}&duration={duration}",
    "catchup-days": "7",
    "catchup-hours": "48",
  });

  const info = extractCatchupInfo(entry);

  assert.equal(info.type, "default");
  assert.equal(info.source, "?utc={utc}&duration={duration}");
  assert.equal(info.days, 7);
  assert.equal(info.hours, 48);
});

test("extractCatchupInfo - from playlist-level attrs (fallback)", () => {
  const entry = createEntry({});
  const playlist = createPlaylist({
    catchup: "append",
    catchupSource: "&start={start}&end={end}",
    catchupDays: 3,
  });

  const info = extractCatchupInfo(entry, playlist);

  assert.equal(info.type, "append");
  assert.equal(info.source, "&start={start}&end={end}");
  assert.equal(info.days, 3);
});

test("extractCatchupInfo - entry overrides playlist", () => {
  const entry = createEntry({
    catchup: "shift",
    "catchup-source": "http://archive.com/{start}",
  });
  const playlist = createPlaylist({
    catchup: "default",
    catchupSource: "?utc={utc}",
  });

  const info = extractCatchupInfo(entry, playlist);

  // Entry attrs should take precedence
  assert.equal(info.type, "shift");
  assert.equal(info.source, "http://archive.com/{start}");
});

test("extractCatchupInfo - tvg-catchup alias support", () => {
  const entry = createEntry({
    "tvg-catchup": "flussonic",
    "tvg-catchup-source": "custom-{utc}-{duration}.m3u8",
  });

  const info = extractCatchupInfo(entry);

  assert.equal(info.type, "flussonic");
  assert.equal(info.source, "custom-{utc}-{duration}.m3u8");
});

test("extractCatchupInfo - no catchup configured", () => {
  const entry = createEntry({});
  const info = extractCatchupInfo(entry);

  assert.equal(info, undefined);
});

test("hasCatchup - returns true when configured", () => {
  const entry = createEntry({ catchup: "default" });
  assert.equal(hasCatchup(entry), true);
});

test("hasCatchup - returns false when not configured", () => {
  const entry = createEntry({});
  assert.equal(hasCatchup(entry), false);
});

test("buildCatchupUrl - default type with default template", () => {
  const entry = createEntry({ catchup: "default" });
  const start = new Date("2025-01-01T10:00:00Z");
  const end = new Date("2025-01-01T11:00:00Z");

  const url = buildCatchupUrl(entry, start, end);

  // Default template: ?utc={utc}&duration={duration}
  const startUnix = Math.floor(start.getTime() / 1000);
  const duration = 3600; // 1 hour in seconds

  assert.ok(url.includes(`?utc=${startUnix}`));
  assert.ok(url.includes(`duration=${duration}`));
});

test("buildCatchupUrl - default type with custom source", () => {
  const entry = createEntry({
    catchup: "default",
    "catchup-source": "?start={start}&end={end}",
  });
  const start = new Date("2025-01-01T10:00:00Z");
  const end = new Date("2025-01-01T11:00:00Z");

  const url = buildCatchupUrl(entry, start, end);

  const startUnix = Math.floor(start.getTime() / 1000);
  const endUnix = Math.floor(end.getTime() / 1000);

  assert.ok(url.includes(`start=${startUnix}`));
  assert.ok(url.includes(`end=${endUnix}`));
});

test("buildCatchupUrl - append type with all variables", () => {
  const entry = createEntry({
    catchup: "append",
    "catchup-source": "&utc={utc}&start={start}&end={end}&duration={duration}",
  });
  entry.url = "http://example.com/stream.m3u8?token=abc";

  const start = new Date("2025-01-01T10:00:00Z");
  const end = new Date("2025-01-01T11:00:00Z");

  const url = buildCatchupUrl(entry, start, end);

  // Should append to existing URL
  assert.ok(url.startsWith("http://example.com/stream.m3u8?token=abc&"));
  assert.ok(url.includes("utc="));
  assert.ok(url.includes("start="));
  assert.ok(url.includes("end="));
  assert.ok(url.includes("duration=3600"));
});

test("buildCatchupUrl - shift type with ${} variables", () => {
  const entry = createEntry({
    catchup: "shift",
    "catchup-source":
      "http://archive.com/stream?start=${start}&end=${end}&offset=${offset}",
  });
  const start = new Date("2025-01-01T10:00:00Z");
  const end = new Date("2025-01-01T11:00:00Z");

  const url = buildCatchupUrl(entry, start, end);

  const startUnix = Math.floor(start.getTime() / 1000);
  const endUnix = Math.floor(end.getTime() / 1000);

  assert.ok(url, "URL should be generated");
  assert.ok(url.startsWith("http://archive.com/stream?"));
  // Both ${} and {} formats should be replaced
  assert.ok(url.includes(`${startUnix}`) && url.includes("start="));
  assert.ok(url.includes(`${endUnix}`) && url.includes("end="));
  assert.ok(url.includes("offset="));
});

test("buildCatchupUrl - flussonic type auto-generation", () => {
  const entry = createEntry({ catchup: "flussonic" });
  entry.url = "http://example.com/channel/index.m3u8";

  const start = new Date("2025-01-01T10:00:00Z");
  const end = new Date("2025-01-01T11:00:00Z");

  const url = buildCatchupUrl(entry, start, end);

  const startUnix = Math.floor(start.getTime() / 1000);
  const duration = 3600;

  // Flussonic format: {baseUrl}/archive-{utc}-{duration}.m3u8
  assert.equal(
    url,
    `http://example.com/channel/archive-${startUnix}-${duration}.m3u8`
  );
});

test("buildCatchupUrl - flussonic type with custom template", () => {
  const entry = createEntry({
    catchup: "flussonic",
    "catchup-source": "http://custom.com/archive/{utc}/{duration}.m3u8",
  });
  const start = new Date("2025-01-01T10:00:00Z");
  const end = new Date("2025-01-01T11:00:00Z");

  const url = buildCatchupUrl(entry, start, end);

  const startUnix = Math.floor(start.getTime() / 1000);

  assert.ok(url.includes(`archive/${startUnix}/3600.m3u8`));
});

test("buildCatchupUrl - xtream type from live stream", () => {
  const entry = createEntry({ catchup: "xc" });
  entry.url = "http://provider.com/live/username/password/12345.m3u8";

  const start = new Date("2025-01-01T10:00:00Z");
  const end = new Date("2025-01-01T11:00:00Z");

  const url = buildCatchupUrl(entry, start, end);

  const startUnix = Math.floor(start.getTime() / 1000);
  const duration = 3600;

  // Xtream format: {host}/timeshift/{username}/{password}/{duration}/{start}/{streamId}.m3u8
  assert.equal(
    url,
    `http://provider.com/timeshift/username/password/${duration}/${startUnix}/12345.m3u8`
  );
});

test("buildCatchupUrl - xtream type with category prefix", () => {
  const entry = createEntry({ catchup: "xtream" });
  entry.url = "http://provider.com/live/username/password/12345.m3u8";

  const start = new Date("2025-01-01T10:00:00Z");
  const end = new Date("2025-01-01T11:00:00Z");

  const url = buildCatchupUrl(entry, start, end);

  const startUnix = Math.floor(start.getTime() / 1000);
  const duration = 3600;

  assert.equal(
    url,
    `http://provider.com/timeshift/username/password/${duration}/${startUnix}/12345.m3u8`
  );
});

test("buildCatchupUrl - date component variables {Y}, {m}, {d}, {H}, {M}, {S}", () => {
  const entry = createEntry({
    catchup: "shift",
    "catchup-source":
      "http://archive.com/{Y}/{m}/{d}/{H}/{M}/{S}/stream.m3u8",
  });
  const start = new Date("2025-03-15T09:05:03Z");
  const end = new Date("2025-03-15T10:05:03Z");

  const url = buildCatchupUrl(entry, start, end);

  assert.equal(url, "http://archive.com/2025/03/15/09/05/03/stream.m3u8");
});

test("buildCatchupUrl - timestamp normalization from milliseconds", () => {
  const entry = createEntry({
    catchup: "default",
    "catchup-source": "?start={start}",
  });

  // Pass timestamp in milliseconds
  const startMs = new Date("2025-01-01T10:00:00Z").getTime();
  const endMs = new Date("2025-01-01T11:00:00Z").getTime();

  const url = buildCatchupUrl(entry, startMs, endMs);

  const startUnix = Math.floor(startMs / 1000);
  assert.ok(url.includes(`start=${startUnix}`));
});

test("buildCatchupUrl - timestamp normalization from seconds", () => {
  const entry = createEntry({
    catchup: "default",
    "catchup-source": "?start={start}",
  });

  // Pass timestamp in seconds (< 10 billion)
  const startSec = Math.floor(new Date("2025-01-01T10:00:00Z").getTime() / 1000);
  const endSec = Math.floor(new Date("2025-01-01T11:00:00Z").getTime() / 1000);

  const url = buildCatchupUrl(entry, startSec, endSec);

  assert.ok(url.includes(`start=${startSec}`));
});

test("buildCatchupUrl - missing catchup-source for append type", () => {
  const entry = createEntry({ catchup: "append" });
  const start = new Date("2025-01-01T10:00:00Z");
  const end = new Date("2025-01-01T11:00:00Z");

  const url = buildCatchupUrl(entry, start, end);

  // Should return undefined (append requires source)
  assert.equal(url, undefined);
});

test("buildCatchupUrl - missing catchup-source for shift type", () => {
  const entry = createEntry({ catchup: "shift" });
  const start = new Date("2025-01-01T10:00:00Z");
  const end = new Date("2025-01-01T11:00:00Z");

  const url = buildCatchupUrl(entry, start, end);

  // Should return undefined (shift requires source)
  assert.equal(url, undefined);
});

test("buildCatchupUrl - invalid catchup type falls back to default", () => {
  const entry = createEntry({
    catchup: "unknown-type",
    "catchup-source": "?utc={utc}",
  });
  const start = new Date("2025-01-01T10:00:00Z");
  const end = new Date("2025-01-01T11:00:00Z");

  const url = buildCatchupUrl(entry, start, end);

  // Should fallback to default behavior
  const startUnix = Math.floor(start.getTime() / 1000);
  assert.ok(url.includes(`utc=${startUnix}`));
});

test("buildCatchupUrl - no catchup configured", () => {
  const entry = createEntry({});
  const start = new Date("2025-01-01T10:00:00Z");
  const end = new Date("2025-01-01T11:00:00Z");

  const url = buildCatchupUrl(entry, start, end);

  assert.equal(url, undefined);
});

test("buildCatchupUrl - invalid date range (start >= end)", () => {
  const entry = createEntry({ catchup: "default" });
  const start = new Date("2025-01-01T11:00:00Z");
  const end = new Date("2025-01-01T10:00:00Z"); // Before start

  const url = buildCatchupUrl(entry, start, end);

  assert.equal(url, undefined);
});

test("getCatchupWindow - from days", () => {
  const entry = createEntry({
    catchup: "default",
    "catchup-days": "7",
  });

  const window = getCatchupWindow(entry);

  assert.ok(window);
  assert.ok(window.start instanceof Date);
  assert.ok(window.end instanceof Date);

  const diffMs = window.end.getTime() - window.start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  assert.ok(Math.abs(diffDays - 7) < 0.1); // Within tolerance
});

test("getCatchupWindow - from hours", () => {
  const entry = createEntry({
    catchup: "default",
    "catchup-hours": "48",
  });

  const window = getCatchupWindow(entry);

  assert.ok(window);

  const diffMs = window.end.getTime() - window.start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  assert.ok(Math.abs(diffHours - 48) < 0.1);
});

test("getCatchupWindow - no window configured", () => {
  const entry = createEntry({ catchup: "default" });

  const window = getCatchupWindow(entry);

  assert.equal(window, undefined);
});

test("getCatchupWindow - from playlist header", () => {
  const entry = createEntry({ catchup: "default" });
  const playlist = createPlaylist({ catchup: "default", catchupDays: 3 });

  const window = getCatchupWindow(entry, playlist);

  assert.ok(window);

  const diffMs = window.end.getTime() - window.start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  assert.ok(Math.abs(diffDays - 3) < 0.1);
});

test("enrichWithCatchup - populates catchup field", () => {
  const playlist = createPlaylist(
    {},
    [
      createEntry({ catchup: "default", "catchup-days": "7" }),
      createEntry({ catchup: "append", "catchup-source": "&start={start}" }),
      createEntry({}), // No catchup
    ]
  );

  const enriched = enrichWithCatchup(playlist);

  assert.ok(enriched.items[0].catchup);
  assert.equal(enriched.items[0].catchup.type, "default");
  assert.equal(enriched.items[0].catchup.days, 7);

  assert.ok(enriched.items[1].catchup);
  assert.equal(enriched.items[1].catchup.type, "append");
  assert.equal(enriched.items[1].catchup.source, "&start={start}");

  assert.ok(!enriched.items[2].catchup);
});

test("filterCatchupEntries - returns only entries with catchup", () => {
  const playlist = createPlaylist(
    {},
    [
      createEntry({ catchup: "default" }),
      createEntry({}), // No catchup
      createEntry({ catchup: "flussonic" }),
    ]
  );

  const filtered = filterCatchupEntries(playlist);

  assert.equal(filtered.length, 2);
  assert.ok(hasCatchup(filtered[0], playlist));
  assert.ok(hasCatchup(filtered[1], playlist));
});

test("filterCatchupEntries - empty result when no catchup entries", () => {
  const playlist = createPlaylist({}, [createEntry({}), createEntry({})]);

  const filtered = filterCatchupEntries(playlist);

  assert.equal(filtered.length, 0);
});

test("buildCatchupUrl - offset variable calculation", () => {
  const entry = createEntry({
    catchup: "shift",
    "catchup-source": "http://archive.com?offset={offset}",
  });

  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

  const url = buildCatchupUrl(entry, twoHoursAgo, oneHourAgo);

  // Offset should be negative (in the past)
  assert.ok(url.includes("offset=-"));
});
