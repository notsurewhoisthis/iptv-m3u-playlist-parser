import test from "node:test";
import assert from "node:assert/strict";
import {
  extractEpgIds,
  linkEpgData,
  validateEpgCoverage,
  getChannelEpg,
  findCurrentProgram,
  findProgramAtTime,
} from "../dist/epg.js";

// Helper to create test entry
function createEntry(tvgId, name = "Test Channel") {
  return {
    name,
    url: "http://example.com/stream.m3u8",
    duration: -1,
    tvg: tvgId ? { id: tvgId } : undefined,
    attrs: {},
    group: [],
  };
}

// Helper to create test playlist
function createPlaylist(items = []) {
  return {
    header: {
      tvgUrls: [],
      rawAttrs: {},
    },
    items,
    warnings: [],
  };
}

// Helper to create EPG program
function createProgram(channel, title, start, stop) {
  return {
    channel,
    title,
    start: new Date(start),
    stop: new Date(stop),
  };
}

test("extractEpgIds - extract from entries with tvg-id", () => {
  const playlist = createPlaylist([
    createEntry("channel1"),
    createEntry("channel2"),
    createEntry("channel3"),
  ]);

  const ids = extractEpgIds(playlist);

  assert.equal(ids.length, 3);
  assert.ok(ids.includes("channel1"));
  assert.ok(ids.includes("channel2"));
  assert.ok(ids.includes("channel3"));
});

test("extractEpgIds - skip entries without tvg-id", () => {
  const playlist = createPlaylist([
    createEntry("channel1"),
    createEntry(null), // No tvg-id
    createEntry("channel2"),
  ]);

  const ids = extractEpgIds(playlist);

  assert.equal(ids.length, 2);
  assert.ok(ids.includes("channel1"));
  assert.ok(ids.includes("channel2"));
});

test("extractEpgIds - deduplicate IDs", () => {
  const playlist = createPlaylist([
    createEntry("channel1"),
    createEntry("channel1"), // Duplicate
    createEntry("channel2"),
    createEntry("channel1"), // Another duplicate
  ]);

  const ids = extractEpgIds(playlist);

  assert.equal(ids.length, 2);
  assert.ok(ids.includes("channel1"));
  assert.ok(ids.includes("channel2"));
});

test("extractEpgIds - handle empty playlist", () => {
  const playlist = createPlaylist([]);

  const ids = extractEpgIds(playlist);

  assert.equal(ids.length, 0);
});

test("extractEpgIds - extract from attrs fallback", () => {
  const entry = {
    name: "Test",
    url: "http://example.com/stream.m3u8",
    duration: -1,
    attrs: { "tvg-id": "channel-from-attrs" },
    group: [],
  };
  const playlist = createPlaylist([entry]);

  const ids = extractEpgIds(playlist);

  assert.equal(ids.length, 1);
  assert.ok(ids.includes("channel-from-attrs"));
});

test("linkEpgData - with Record format", () => {
  const playlist = createPlaylist([
    createEntry("channel1"),
    createEntry("channel2"),
  ]);

  const epgData = {
    channel1: [
      createProgram("channel1", "News", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z"),
      createProgram("channel1", "Sports", "2025-01-01T11:00:00Z", "2025-01-01T12:00:00Z"),
    ],
    channel2: [
      createProgram("channel2", "Movie", "2025-01-01T10:00:00Z", "2025-01-01T12:00:00Z"),
    ],
  };

  const enriched = linkEpgData(playlist, epgData);

  assert.equal(enriched.items[0].epg.length, 2);
  assert.equal(enriched.items[0].epg[0].title, "News");
  assert.equal(enriched.items[0].epg[1].title, "Sports");

  assert.equal(enriched.items[1].epg.length, 1);
  assert.equal(enriched.items[1].epg[0].title, "Movie");
});

test("linkEpgData - with TvgData format", () => {
  const playlist = createPlaylist([createEntry("channel1")]);

  const epgData = {
    channels: [],
    programmes: [
      {
        channel: "channel1",
        title: "Show 1",
        start: Math.floor(new Date("2025-01-01T10:00:00Z").getTime() / 1000),
        stop: Math.floor(new Date("2025-01-01T11:00:00Z").getTime() / 1000),
      },
    ],
  };

  const enriched = linkEpgData(playlist, epgData);

  assert.equal(enriched.items[0].epg.length, 1);
  assert.equal(enriched.items[0].epg[0].title, "Show 1");
  assert.ok(enriched.items[0].epg[0].start instanceof Date);
  assert.ok(enriched.items[0].epg[0].stop instanceof Date);
});

test("linkEpgData - entries without tvg-id remain unchanged", () => {
  const playlist = createPlaylist([createEntry(null)]);

  const epgData = {
    channel1: [createProgram("channel1", "News", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z")],
  };

  const enriched = linkEpgData(playlist, epgData);

  assert.ok(!enriched.items[0].epg);
});

test("linkEpgData - entries without matching EPG remain unchanged", () => {
  const playlist = createPlaylist([createEntry("channel999")]);

  const epgData = {
    channel1: [createProgram("channel1", "News", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z")],
  };

  const enriched = linkEpgData(playlist, epgData);

  assert.ok(!enriched.items[0].epg);
});

test("linkEpgData - programmes are sorted by start time", () => {
  const playlist = createPlaylist([createEntry("channel1")]);

  const epgData = {
    channel1: [
      createProgram("channel1", "Show C", "2025-01-01T15:00:00Z", "2025-01-01T16:00:00Z"),
      createProgram("channel1", "Show A", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z"),
      createProgram("channel1", "Show B", "2025-01-01T12:00:00Z", "2025-01-01T13:00:00Z"),
    ],
  };

  const enriched = linkEpgData(playlist, epgData);

  assert.equal(enriched.items[0].epg[0].title, "Show A");
  assert.equal(enriched.items[0].epg[1].title, "Show B");
  assert.equal(enriched.items[0].epg[2].title, "Show C");
});

test("validateEpgCoverage - 100% coverage", () => {
  const playlist = createPlaylist([
    createEntry("channel1"),
    createEntry("channel2"),
  ]);

  const epgData = {
    channel1: [createProgram("channel1", "News", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z")],
    channel2: [createProgram("channel2", "Sports", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z")],
  };

  const coverage = validateEpgCoverage(playlist, epgData);

  assert.equal(coverage.totalEntries, 2);
  assert.equal(coverage.withEpgId, 2);
  assert.equal(coverage.withEpgData, 2);
  assert.equal(coverage.coveragePercent, 100);
  assert.equal(coverage.missingEpgIds.length, 0);
});

test("validateEpgCoverage - 50% coverage", () => {
  const playlist = createPlaylist([
    createEntry("channel1"),
    createEntry("channel2"),
  ]);

  const epgData = {
    channel1: [createProgram("channel1", "News", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z")],
    // channel2 missing
  };

  const coverage = validateEpgCoverage(playlist, epgData);

  assert.equal(coverage.totalEntries, 2);
  assert.equal(coverage.withEpgId, 2);
  assert.equal(coverage.withEpgData, 1);
  assert.equal(coverage.coveragePercent, 50);
  assert.equal(coverage.missingEpgIds.length, 1);
  assert.ok(coverage.missingEpgIds.includes("channel2"));
});

test("validateEpgCoverage - 0% coverage (no tvg-id)", () => {
  const playlist = createPlaylist([createEntry(null), createEntry(null)]);

  const epgData = {
    channel1: [createProgram("channel1", "News", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z")],
  };

  const coverage = validateEpgCoverage(playlist, epgData);

  assert.equal(coverage.totalEntries, 2);
  assert.equal(coverage.withEpgId, 0);
  assert.equal(coverage.withEpgData, 0);
  assert.equal(coverage.coveragePercent, 0);
  assert.equal(coverage.missingEpgIds.length, 0);
});

test("validateEpgCoverage - handles empty playlist", () => {
  const playlist = createPlaylist([]);
  const epgData = {};

  const coverage = validateEpgCoverage(playlist, epgData);

  assert.equal(coverage.totalEntries, 0);
  assert.equal(coverage.coveragePercent, 0);
});

test("getChannelEpg - returns programmes for entry", () => {
  const entry = createEntry("channel1");
  const epgData = {
    channel1: [
      createProgram("channel1", "News", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z"),
      createProgram("channel1", "Sports", "2025-01-01T11:00:00Z", "2025-01-01T12:00:00Z"),
    ],
  };

  const programmes = getChannelEpg(entry, epgData);

  assert.ok(programmes);
  assert.equal(programmes.length, 2);
  assert.equal(programmes[0].title, "News");
  assert.equal(programmes[1].title, "Sports");
});

test("getChannelEpg - returns undefined for entry without tvg-id", () => {
  const entry = createEntry(null);
  const epgData = {
    channel1: [createProgram("channel1", "News", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z")],
  };

  const programmes = getChannelEpg(entry, epgData);

  assert.equal(programmes, undefined);
});

test("getChannelEpg - returns undefined when no EPG data for channel", () => {
  const entry = createEntry("channel999");
  const epgData = {
    channel1: [createProgram("channel1", "News", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z")],
  };

  const programmes = getChannelEpg(entry, epgData);

  assert.equal(programmes, undefined);
});

test("getChannelEpg - programmes are sorted", () => {
  const entry = createEntry("channel1");
  const epgData = {
    channel1: [
      createProgram("channel1", "Later", "2025-01-01T15:00:00Z", "2025-01-01T16:00:00Z"),
      createProgram("channel1", "Earlier", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z"),
    ],
  };

  const programmes = getChannelEpg(entry, epgData);

  assert.equal(programmes[0].title, "Earlier");
  assert.equal(programmes[1].title, "Later");
});

test("findCurrentProgram - finds program at current time", () => {
  const entry = createEntry("channel1");
  const now = new Date("2025-01-01T10:30:00Z");

  const epgData = {
    channel1: [
      createProgram("channel1", "Earlier", "2025-01-01T09:00:00Z", "2025-01-01T10:00:00Z"),
      createProgram("channel1", "Current", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z"),
      createProgram("channel1", "Later", "2025-01-01T11:00:00Z", "2025-01-01T12:00:00Z"),
    ],
  };

  const program = findCurrentProgram(entry, epgData, now);

  assert.ok(program);
  assert.equal(program.title, "Current");
});

test("findCurrentProgram - returns undefined when no match", () => {
  const entry = createEntry("channel1");
  const now = new Date("2025-01-01T08:00:00Z"); // Before any program

  const epgData = {
    channel1: [
      createProgram("channel1", "Program", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z"),
    ],
  };

  const program = findCurrentProgram(entry, epgData, now);

  assert.equal(program, undefined);
});

test("findCurrentProgram - returns undefined for entry without EPG", () => {
  const entry = createEntry(null);
  const epgData = {};

  const program = findCurrentProgram(entry, epgData);

  assert.equal(program, undefined);
});

test("findProgramAtTime - finds exact program", () => {
  const programs = [
    createProgram("ch1", "Show A", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z"),
    createProgram("ch1", "Show B", "2025-01-01T11:00:00Z", "2025-01-01T12:00:00Z"),
    createProgram("ch1", "Show C", "2025-01-01T12:00:00Z", "2025-01-01T13:00:00Z"),
  ];

  const time = new Date("2025-01-01T11:30:00Z");
  const program = findProgramAtTime(programs, time);

  assert.ok(program);
  assert.equal(program.title, "Show B");
});

test("findProgramAtTime - handles time at start boundary (inclusive)", () => {
  const programs = [
    createProgram("ch1", "Show", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z"),
  ];

  const time = new Date("2025-01-01T10:00:00Z");
  const program = findProgramAtTime(programs, time);

  assert.ok(program);
  assert.equal(program.title, "Show");
});

test("findProgramAtTime - handles time at end boundary (exclusive)", () => {
  const programs = [
    createProgram("ch1", "Show A", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z"),
    createProgram("ch1", "Show B", "2025-01-01T11:00:00Z", "2025-01-01T12:00:00Z"),
  ];

  const time = new Date("2025-01-01T11:00:00Z");
  const program = findProgramAtTime(programs, time);

  // Should return Show B (end is exclusive for Show A)
  assert.ok(program);
  assert.equal(program.title, "Show B");
});

test("findProgramAtTime - returns undefined for empty array", () => {
  const programs = [];
  const time = new Date("2025-01-01T10:00:00Z");

  const program = findProgramAtTime(programs, time);

  assert.equal(program, undefined);
});

test("findProgramAtTime - returns undefined for invalid time", () => {
  const programs = [
    createProgram("ch1", "Show", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z"),
  ];

  const program = findProgramAtTime(programs, new Date("invalid"));

  assert.equal(program, undefined);
});

test("findProgramAtTime - handles programs with invalid dates", () => {
  const programs = [
    {
      channel: "ch1",
      title: "Invalid",
      start: new Date("invalid"),
      stop: new Date("invalid"),
    },
    createProgram("ch1", "Valid", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z"),
  ];

  const time = new Date("2025-01-01T10:30:00Z");
  const program = findProgramAtTime(programs, time);

  assert.ok(program);
  assert.equal(program.title, "Valid");
});

test("linkEpgData - handles Map input", () => {
  const playlist = createPlaylist([createEntry("channel1")]);

  const epgMap = new Map();
  epgMap.set("channel1", [
    createProgram("channel1", "News", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z"),
  ]);

  const enriched = linkEpgData(playlist, epgMap);

  assert.equal(enriched.items[0].epg.length, 1);
  assert.equal(enriched.items[0].epg[0].title, "News");
});

test("linkEpgData - handles array of programmes", () => {
  const playlist = createPlaylist([createEntry("channel1")]);

  const epgArray = [
    {
      channel: "channel1",
      title: "Show 1",
      start: new Date("2025-01-01T10:00:00Z"),
      stop: new Date("2025-01-01T11:00:00Z"),
    },
    {
      channel: "channel1",
      title: "Show 2",
      start: new Date("2025-01-01T11:00:00Z"),
      stop: new Date("2025-01-01T12:00:00Z"),
    },
  ];

  const enriched = linkEpgData(playlist, epgArray);

  assert.equal(enriched.items[0].epg.length, 2);
  assert.equal(enriched.items[0].epg[0].title, "Show 1");
  assert.equal(enriched.items[0].epg[1].title, "Show 2");
});

test("linkEpgData - with programme description and category", () => {
  const playlist = createPlaylist([createEntry("channel1")]);

  const epgData = {
    channel1: [
      {
        channel: "channel1",
        title: "Documentary",
        start: new Date("2025-01-01T10:00:00Z"),
        stop: new Date("2025-01-01T11:00:00Z"),
        description: "A fascinating look at nature",
        category: ["Documentary", "Nature"],
        icon: "http://example.com/icon.png",
      },
    ],
  };

  const enriched = linkEpgData(playlist, epgData);

  const prog = enriched.items[0].epg[0];
  assert.equal(prog.description, "A fascinating look at nature");
  assert.ok(Array.isArray(prog.category));
  assert.ok(prog.category.includes("Documentary"));
  assert.equal(prog.icon, "http://example.com/icon.png");
});

test("validateEpgCoverage - mixed coverage with missing EPG IDs", () => {
  const playlist = createPlaylist([
    createEntry("channel1"),
    createEntry("channel2"),
    createEntry(null), // No tvg-id
    createEntry("channel3"),
  ]);

  const epgData = {
    channel1: [createProgram("channel1", "News", "2025-01-01T10:00:00Z", "2025-01-01T11:00:00Z")],
    // channel2 and channel3 missing
  };

  const coverage = validateEpgCoverage(playlist, epgData);

  assert.equal(coverage.totalEntries, 4);
  assert.equal(coverage.withEpgId, 3);
  assert.equal(coverage.withEpgData, 1);
  assert.equal(coverage.coveragePercent, 25); // 1/4 = 25%
  assert.equal(coverage.missingEpgIds.length, 2);
  assert.ok(coverage.missingEpgIds.includes("channel2"));
  assert.ok(coverage.missingEpgIds.includes("channel3"));
});
