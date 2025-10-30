# EPG Integration Guide

Link Electronic Program Guide (EPG) data to IPTV playlists for rich program information and time-based features.

## Quick Start

```typescript
import {
  parsePlaylist,
  extractEpgIds,
  linkEpgData,
  findCurrentProgram,
} from "iptv-m3u-playlist-parser";

// Parse playlist
const playlist = parsePlaylist(m3uText);

// Get required EPG IDs
const epgIds = extractEpgIds(playlist);
console.log("Channels needing EPG:", epgIds);

// Link EPG data
const epgData = {
  "channel1": [
    {
      channel: "channel1",
      title: "News at 6",
      start: new Date("2025-01-01T18:00:00Z"),
      stop: new Date("2025-01-01T19:00:00Z"),
      description: "Evening news bulletin",
    },
  ],
};

const enriched = linkEpgData(playlist, epgData);

// Find what's playing now
const entry = enriched.items[0];
const currentProgram = findCurrentProgram(entry, epgData);
console.log("Now playing:", currentProgram?.title);
```

## Overview

The EPG module provides utilities to:
- Extract EPG IDs (`tvg-id`) from playlists
- Link EPG data from XMLTV or JSON sources
- Calculate EPG coverage statistics
- Find current or specific programs by time
- Support multiple EPG data formats

**Integration with existing xmltv.ts module:**

This module works alongside the existing XMLTV parser:

```typescript
import { parseXmltv, parseXmltvPrograms } from "iptv-m3u-playlist-parser";

// Parse XMLTV file
const { channels } = parseXmltv(xmlContent);
const { programs } = parseXmltvPrograms(xmlContent);

// Use with EPG module
const enriched = linkEpgData(playlist, programs);
```

---

## EPG Data Sources

### XMLTV Files

Standard XML format for TV program guides.

```typescript
import { parseXmltv, linkEpgData } from "iptv-m3u-playlist-parser";

// Parse XMLTV
const xmlContent = await fetch("https://example.com/epg.xml").then(r => r.text());
const { channels, programmes } = parseXmltv(xmlContent);

// Link to playlist
const enriched = linkEpgData(playlist, { programmes });
```

### JSON APIs

Custom JSON format or API responses.

```typescript
// Fetch from JSON API
const epgResponse = await fetch("https://api.example.com/epg");
const epgData = await epgResponse.json();

// Expected format: { channelId: [programs] }
const enriched = linkEpgData(playlist, epgData);
```

### Custom Formats

The module normalizes multiple input formats:

```typescript
// Format 1: Record/Object
const epgData = {
  "channel1": [{ title: "Program", start: new Date(), stop: new Date() }],
  "channel2": [/* ... */],
};

// Format 2: Map
const epgMap = new Map([
  ["channel1", [/* programs */]],
  ["channel2", [/* programs */]],
]);

// Format 3: TvgData (from XMLTV parser)
const tvgData = {
  channels: [/* channel info */],
  programmes: [/* all programs */],
};

// All work with linkEpgData()
linkEpgData(playlist, epgData);
linkEpgData(playlist, epgMap);
linkEpgData(playlist, tvgData);
```

---

## API Reference

### extractEpgIds()

Extract unique EPG IDs (tvg-id) from playlist entries.

```typescript
function extractEpgIds(
  playlist: Playlist
): string[]
```

**Returns:** Array of unique `tvg-id` values found in playlist.

**Checks:**
- `entry.tvg?.id`
- `entry.attrs['tvg-id']`

**Example:**

```typescript
const ids = extractEpgIds(playlist);
console.log("Found EPG IDs:", ids);
// ['channel1', 'channel2', 'channel3']

// Use for fetching EPG data
const epgUrl = `https://api.example.com/epg?ids=${ids.join(',')}`;
```

---

### linkEpgData()

Link EPG data to playlist entries by tvg-id.

```typescript
function linkEpgData(
  playlist: Playlist,
  epgData: Record<string, EpgProgram[]> | any
): Playlist
```

**Parameters:**
- `playlist` - Parsed IPTV playlist
- `epgData` - EPG data in any supported format

**Returns:** New playlist with `entry.epg` field populated.

**Accepted formats:**
- `Record<string, EpgProgram[]>` - Object mapping channel IDs to programs
- `Map<string, EpgProgram[]>` - Map structure
- `TvgData` - XMLTV parser format `{ channels, programmes }`
- Array of programs with `channel` or `channelId` field

**Example:**

```typescript
const enriched = linkEpgData(playlist, epgData);

// Access EPG data
enriched.items.forEach(entry => {
  if (entry.epg && entry.epg.length > 0) {
    console.log(`${entry.name}: ${entry.epg.length} programs`);
  }
});
```

---

### validateEpgCoverage()

Calculate EPG coverage statistics for playlist.

```typescript
function validateEpgCoverage(
  playlist: Playlist,
  epgData: Record<string, EpgProgram[]> | any
): EpgCoverage
```

**Returns:**

```typescript
interface EpgCoverage {
  totalEntries: number;        // Total playlist entries
  withEpgId: number;           // Entries with tvg-id
  withEpgData: number;         // Entries with matching EPG data
  coveragePercent: number;     // Percentage with EPG (0-100)
  missingEpgIds: string[];     // tvg-ids without EPG data
}
```

**Example:**

```typescript
const coverage = validateEpgCoverage(playlist, epgData);
console.log(`EPG Coverage: ${coverage.coveragePercent}%`);
console.log(`${coverage.withEpgData}/${coverage.totalEntries} channels have EPG`);

if (coverage.missingEpgIds.length > 0) {
  console.log("Missing EPG for:", coverage.missingEpgIds.join(", "));
}
```

---

### getChannelEpg()

Get all EPG programs for a single entry.

```typescript
function getChannelEpg(
  entry: Entry,
  epgData: Record<string, EpgProgram[]> | any
): EpgProgram[] | undefined
```

**Returns:** Array of programs sorted by start time, or `undefined` if not available.

**Example:**

```typescript
const programs = getChannelEpg(entry, epgData);

if (programs) {
  console.log(`${entry.name} has ${programs.length} programs`);
  programs.forEach(p => {
    console.log(`  ${p.start.toISOString()} - ${p.title}`);
  });
}
```

---

### findCurrentProgram()

Find program airing at specific time (defaults to now).

```typescript
function findCurrentProgram(
  entry: Entry,
  epgData: Record<string, EpgProgram[]> | any,
  time?: Date
): EpgProgram | undefined
```

**Parameters:**
- `entry` - Playlist entry to find program for
- `epgData` - EPG data source
- `time` - Optional time to check (defaults to `new Date()`)

**Returns:** Program where `start <= time < stop`, or `undefined`.

**Example:**

```typescript
// Find what's on now
const now = findCurrentProgram(entry, epgData);
console.log("Currently playing:", now?.title);

// Find what was on yesterday at 8pm
const yesterday8pm = new Date();
yesterday8pm.setDate(yesterday8pm.getDate() - 1);
yesterday8pm.setHours(20, 0, 0, 0);

const past = findCurrentProgram(entry, epgData, yesterday8pm);
console.log("Was playing:", past?.title);
```

---

### findProgramAtTime()

Find program at specific time from programs array.

```typescript
function findProgramAtTime(
  programs: EpgProgram[],
  time: Date
): EpgProgram | undefined
```

**Parameters:**
- `programs` - Array of EPG programs (from `getChannelEpg()`)
- `time` - Time to check

**Returns:** Program active at given time, or `undefined`.

**Example:**

```typescript
const programs = getChannelEpg(entry, epgData);
if (programs) {
  const program = findProgramAtTime(programs, new Date("2025-01-01T20:30:00Z"));
  if (program) {
    console.log(`At 8:30pm: ${program.title}`);
    console.log(`Duration: ${program.start} - ${program.stop}`);
  }
}
```

---

## EpgProgram Interface

```typescript
interface EpgProgram {
  channel: string;           // Channel ID (tvg-id)
  title: string;             // Program title
  start: Date;               // Start time
  stop: Date;                // End time
  description?: string;      // Program description
  category?: string[];       // Categories/genres
  icon?: string;             // Program poster/thumbnail
}
```

---

## Usage Examples

### Basic EPG Linking

```typescript
import { parsePlaylist, linkEpgData } from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// EPG data from any source
const epgData = {
  "bbc1": [
    {
      channel: "bbc1",
      title: "News at Six",
      start: new Date("2025-01-01T18:00:00Z"),
      stop: new Date("2025-01-01T19:00:00Z"),
      description: "Evening news bulletin",
      category: ["News"],
    },
  ],
};

const enriched = linkEpgData(playlist, epgData);

// Access linked EPG
enriched.items.forEach(entry => {
  console.log(`${entry.name}: ${entry.epg?.length || 0} programs`);
});
```

---

### XMLTV Integration

```typescript
import {
  parsePlaylist,
  parseXmltvPrograms,
  linkEpgData,
} from "iptv-m3u-playlist-parser";

// Parse playlist
const playlist = parsePlaylist(m3uText);

// Fetch and parse XMLTV
const xmlContent = await fetch("https://example.com/epg.xml").then(r => r.text());
const { programs } = parseXmltvPrograms(xmlContent);

// Link EPG data
const enriched = linkEpgData(playlist, programs);

console.log("EPG linked successfully");
```

---

### Check EPG Coverage

```typescript
import {
  parsePlaylist,
  validateEpgCoverage,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);
const coverage = validateEpgCoverage(playlist, epgData);

console.log(`Total channels: ${coverage.totalEntries}`);
console.log(`With tvg-id: ${coverage.withEpgId}`);
console.log(`With EPG data: ${coverage.withEpgData}`);
console.log(`Coverage: ${coverage.coveragePercent}%`);

if (coverage.coveragePercent < 80) {
  console.warn("Low EPG coverage!");
  console.log("Missing EPG for:", coverage.missingEpgIds);
}
```

---

### Find What's Playing Now

```typescript
import {
  parsePlaylist,
  findCurrentProgram,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);
const entry = playlist.items[0];

const currentProgram = findCurrentProgram(entry, epgData);

if (currentProgram) {
  console.log("Now playing:", currentProgram.title);
  console.log("Description:", currentProgram.description);
  console.log("Until:", currentProgram.stop.toLocaleTimeString());
} else {
  console.log("No program info available");
}
```

---

### Build Program Guide UI

```typescript
import {
  parsePlaylist,
  linkEpgData,
  getChannelEpg,
  findCurrentProgram,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);
const enriched = linkEpgData(playlist, epgData);

// Build UI data structure
const programGuide = enriched.items.map(entry => {
  const programs = getChannelEpg(entry, epgData) || [];
  const current = findCurrentProgram(entry, epgData);

  return {
    channelName: entry.name,
    channelLogo: entry.tvg?.logo,
    currentProgram: current?.title,
    upcomingPrograms: programs
      .filter(p => p.start > new Date())
      .slice(0, 5) // Next 5 programs
      .map(p => ({
        time: p.start.toLocaleTimeString(),
        title: p.title,
      })),
  };
});

console.log(JSON.stringify(programGuide, null, 2));
```

---

### Filter Channels with EPG

```typescript
import {
  parsePlaylist,
  linkEpgData,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);
const enriched = linkEpgData(playlist, epgData);

// Filter to channels with EPG only
const withEpg = {
  ...enriched,
  items: enriched.items.filter(entry => entry.epg && entry.epg.length > 0),
};

console.log(`${withEpg.items.length}/${playlist.items.length} channels have EPG`);
```

---

### Display Program Schedule

```typescript
import {
  getChannelEpg,
  findProgramAtTime,
} from "iptv-m3u-playlist-parser";

const entry = playlist.items[0];
const programs = getChannelEpg(entry, epgData);

if (programs) {
  console.log(`\nSchedule for ${entry.name}:\n`);

  programs.forEach(program => {
    const startTime = program.start.toLocaleTimeString();
    const endTime = program.stop.toLocaleTimeString();
    const duration = Math.round((program.stop.getTime() - program.start.getTime()) / 60000);

    console.log(`${startTime} - ${endTime} (${duration}min)`);
    console.log(`  ${program.title}`);
    if (program.description) {
      console.log(`  ${program.description}`);
    }
    console.log();
  });
}
```

---

### EPG + Catchup Integration

```typescript
import {
  parsePlaylist,
  findCurrentProgram,
  buildCatchupUrl,
  linkEpgData,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);
const enriched = linkEpgData(playlist, epgData);

function watchPreviousProgram(entry: Entry) {
  const programs = getChannelEpg(entry, epgData);
  if (!programs) return;

  // Find program that aired before current one
  const now = new Date();
  const previousPrograms = programs
    .filter(p => p.stop <= now)
    .sort((a, b) => b.stop.getTime() - a.stop.getTime());

  const previous = previousPrograms[0];
  if (!previous) {
    console.log("No previous program found");
    return;
  }

  // Build catchup URL
  const catchupUrl = buildCatchupUrl(entry, previous.start, previous.stop, playlist);

  if (catchupUrl) {
    console.log(`Watch "${previous.title}":`);
    console.log(catchupUrl);
  } else {
    console.log("Catchup not available");
  }
}
```

---

## Date/Time Handling

### Time Formats

EPG programs use JavaScript `Date` objects for `start` and `stop` times.

```typescript
const program: EpgProgram = {
  channel: "channel1",
  title: "Program",
  start: new Date("2025-01-01T18:00:00Z"), // ISO 8601 string
  stop: new Date("2025-01-01T19:00:00Z"),
};
```

### Timezone Considerations

**Important:** Always work in UTC for consistency across timezones.

```typescript
// Create UTC date
const utcDate = new Date(Date.UTC(2025, 0, 1, 18, 0, 0));

// Parse ISO string (automatically UTC if 'Z' suffix)
const isoDate = new Date("2025-01-01T18:00:00Z");

// Current time in UTC
const now = new Date(); // Local time
const utcNow = new Date(now.toISOString());
```

### Duration Calculation

```typescript
const program = findCurrentProgram(entry, epgData);

if (program) {
  const durationMs = program.stop.getTime() - program.start.getTime();
  const durationMinutes = Math.round(durationMs / 60000);
  const durationHours = Math.floor(durationMinutes / 60);
  const remainingMinutes = durationMinutes % 60;

  console.log(`Duration: ${durationHours}h ${remainingMinutes}m`);
}
```

---

## Troubleshooting

### Issue: Low EPG coverage

**Problem:** `validateEpgCoverage()` shows <50% coverage.

**Causes:**
1. Missing `tvg-id` in playlist entries
2. Mismatched IDs between playlist and EPG source
3. Incomplete EPG data

**Solution:**

```typescript
// Check which channels are missing tvg-id
const withoutTvgId = playlist.items.filter(e => !e.tvg?.id);
console.log("Channels without tvg-id:", withoutTvgId.map(e => e.name));

// Check which tvg-ids have no EPG
const coverage = validateEpgCoverage(playlist, epgData);
console.log("Missing EPG for:", coverage.missingEpgIds);

// Manually add missing tvg-ids
playlist.items.forEach(entry => {
  if (!entry.tvg?.id) {
    // Generate ID from name
    entry.tvg = { id: entry.name.toLowerCase().replace(/\s+/g, "-") };
  }
});
```

---

### Issue: findCurrentProgram() returns undefined

**Problem:** No program found for current time.

**Causes:**
1. No EPG data linked to entry
2. EPG data doesn't cover current time
3. Time window mismatch (timezone issues)

**Solution:**

```typescript
// Check if EPG data exists
const programs = getChannelEpg(entry, epgData);
if (!programs) {
  console.log("No EPG data for this channel");
  console.log("tvg-id:", entry.tvg?.id);
}

// Check time coverage
if (programs && programs.length > 0) {
  const firstStart = programs[0].start;
  const lastStop = programs[programs.length - 1].stop;
  const now = new Date();

  console.log("EPG covers:", firstStart, "to", lastStop);
  console.log("Current time:", now);

  if (now < firstStart) {
    console.log("Current time is before EPG data starts");
  } else if (now > lastStop) {
    console.log("Current time is after EPG data ends");
  }
}
```

---

### Issue: Programs in wrong order

**Problem:** Programs array not sorted chronologically.

**Solution:** `getChannelEpg()` automatically sorts by start time. If using raw data:

```typescript
// Sort programs manually
const sortedPrograms = programs.sort((a, b) =>
  a.start.getTime() - b.start.getTime()
);
```

---

### Issue: Date parsing errors

**Problem:** `Invalid Date` or `NaN` in program times.

**Solution:** Validate and convert dates:

```typescript
function sanitizeProgram(prog: any): EpgProgram {
  return {
    channel: prog.channel,
    title: prog.title,
    start: new Date(prog.start), // Ensure Date object
    stop: new Date(prog.stop),
    description: prog.description,
    category: prog.category,
  };
}

// Use when importing from unknown sources
const sanitizedData = Object.entries(rawEpgData).reduce((acc, [id, programs]) => {
  acc[id] = programs.map(sanitizeProgram);
  return acc;
}, {} as Record<string, EpgProgram[]>);
```

---

### Issue: Memory usage with large EPG data

**Problem:** Loading 7+ days of EPG for 1000+ channels uses too much memory.

**Solution:** Filter EPG data by time window:

```typescript
// Keep only programs within 24 hours
function filterRecentPrograms(epgData: any, hoursWindow = 24): any {
  const now = new Date();
  const cutoff = new Date(now.getTime() - hoursWindow * 3600000);
  const future = new Date(now.getTime() + hoursWindow * 3600000);

  const filtered: Record<string, EpgProgram[]> = {};

  for (const [channelId, programs] of Object.entries(epgData)) {
    filtered[channelId] = (programs as EpgProgram[]).filter(
      p => p.stop >= cutoff && p.start <= future
    );
  }

  return filtered;
}

const recentEpg = filterRecentPrograms(fullEpgData, 24);
const enriched = linkEpgData(playlist, recentEpg);
```

---

## Performance Considerations

**Operations:**
- `extractEpgIds()`: O(n) - Scans all entries once
- `linkEpgData()`: O(n) - One pass through entries
- `getChannelEpg()`: O(1) - Map lookup + sort
- `findCurrentProgram()`: O(p) - Linear scan through programs (typically <100/channel)

**Memory:**
- EPG data is reference-shared (not cloned)
- Linked playlists create shallow copies of entries
- 1000 channels × 100 programs/channel ≈ 5-10MB

**Best Practices:**
1. Load EPG data once, reuse for multiple playlists
2. Filter EPG by time window before linking
3. Use `enrichWithCatchup()` + `linkEpgData()` in sequence
4. Cache program lookups in UI layer

---

## Related Documentation

- **[README.md](../README.md)** - Main library documentation
- **[CATCHUP.md](CATCHUP.md)** - Catchup TV integration with EPG
- **[VALIDATION.md](VALIDATION.md)** - Validate streams before showing EPG
- **[GENERATOR.md](GENERATOR.md)** - Generate playlists with EPG metadata
