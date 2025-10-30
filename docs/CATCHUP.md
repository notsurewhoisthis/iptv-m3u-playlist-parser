# Catchup TV Guide

Build time-shifted playback URLs for replaying past TV programs using TiviMate-style catchup configurations.

## Quick Start

```typescript
import {
  parsePlaylist,
  hasCatchup,
  buildCatchupUrl,
  getCatchupWindow,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);
const entry = playlist.items[0];

// Check if entry supports catchup
if (hasCatchup(entry, playlist)) {
  // Build URL to watch 2 hours ago
  const now = new Date();
  const start = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

  const catchupUrl = buildCatchupUrl(entry, start, end, playlist);
  console.log("Catchup URL:", catchupUrl);
}
```

## Overview

Catchup TV (time-shifted viewing) allows users to replay live TV from the past. This module provides utilities to:
- Detect catchup support in playlists
- Build catchup URLs with correct timestamp formatting
- Calculate available catchup windows
- Support multiple provider-specific catchup formats

## Supported Catchup Types

| Type | Description | Template Required |
|------|-------------|-------------------|
| **default** | Simple offset-based with query parameters | Optional |
| **append** | Append template to original URL | Yes |
| **shift** | Replace URL with template | Yes |
| **flussonic** | Auto-generate Flussonic archive URLs | Optional |
| **xtream (xc)** | Xtream Codes timeshift format | No |

## Variable Placeholders

Templates support 13 variable placeholders in two formats:

### Curly Brace Format `{var}`

| Variable | Description | Example |
|----------|-------------|---------|
| `{utc}` | Unix timestamp (seconds) for start time | `1704067200` |
| `{start}` | Alias for `{utc}` | `1704067200` |
| `{end}` | Unix timestamp (seconds) for end time | `1704070800` |
| `{duration}` | Duration in seconds | `3600` |
| `{offset}` | Offset from now in seconds (negative for past) | `-7200` |
| `{Y}` | Year (4 digits) | `2024` |
| `{m}` | Month (2 digits) | `01` |
| `{d}` | Day (2 digits) | `15` |
| `{H}` | Hour (2 digits, 24h) | `14` |
| `{M}` | Minute (2 digits) | `30` |
| `{S}` | Second (2 digits) | `00` |

### Dollar-Curly Format `${var}`

| Variable | Description | Example |
|----------|-------------|---------|
| `${start}` | Unix timestamp (seconds) for start time | `1704067200` |
| `${end}` | Unix timestamp (seconds) for end time | `1704070800` |
| `${timestamp}` | Alias for `${start}` | `1704067200` |
| `${offset}` | Offset from now in seconds | `-7200` |
| `${duration}` | Duration in seconds | `3600` |

Both formats are supported in the same template and are substituted identically.

---

## API Reference

### extractCatchupInfo()

Extract catchup configuration from entry and playlist.

```typescript
function extractCatchupInfo(
  entry: Entry,
  playlist?: Playlist
): CatchupInfo | undefined
```

**Priority order:**
1. Entry-level catchup attributes (highest priority)
2. Playlist header catchup attributes (fallback)

**Returns:**

```typescript
interface CatchupInfo {
  type: string;        // Catchup type (default, append, shift, flussonic, xc)
  source?: string;     // Template string with placeholders
  days?: number;       // Retention period in days
  hours?: number;      // Retention period in hours
}
```

---

### hasCatchup()

Check if entry has catchup support.

```typescript
function hasCatchup(
  entry: Entry,
  playlist?: Playlist
): boolean
```

Returns `true` if catchup is configured (either in entry or playlist header).

---

### buildCatchupUrl()

Build catchup URL for specific time range.

```typescript
function buildCatchupUrl(
  entry: Entry,
  start: Date | number,
  end: Date | number,
  playlist?: Playlist
): string | undefined
```

**Parameters:**
- `entry` - Playlist entry to build catchup URL for
- `start` - Start time (Date object or Unix timestamp in ms/seconds)
- `end` - End time (Date object or Unix timestamp in ms/seconds)
- `playlist` - Optional playlist for header fallback

**Returns:** Catchup URL or `undefined` if cannot build

**Time Formats:**
- `Date` object (preferred)
- Unix timestamp in milliseconds (>10 billion)
- Unix timestamp in seconds (<10 billion)

---

### getCatchupWindow()

Get available catchup time window.

```typescript
function getCatchupWindow(
  entry: Entry,
  playlist?: Playlist
): { start: Date; end: Date } | undefined
```

Calculates the catchup retention window based on `catchup-days` or `catchup-hours`.

**Returns:** Object with start/end dates, or `undefined` if no window configured.

---

### enrichWithCatchup()

Populate `catchup` field on all entries.

```typescript
function enrichWithCatchup(
  playlist: Playlist
): Playlist
```

Extracts catchup info and stores it in `entry.catchup` field for easy access.

---

### filterCatchupEntries()

Filter entries with catchup support.

```typescript
function filterCatchupEntries(
  playlist: Playlist
): Entry[]
```

Returns array of entries that have catchup configured.

---

## Catchup Types Explained

### Type 1: Default

**Pattern:** Append query parameters to original URL (or use custom template).

**Default template:** `?utc={utc}&duration={duration}`

**M3U Configuration:**

```m3u
#EXTM3U catchup="default" catchup-days="7"
#EXTINF:-1 tvg-id="channel1",Channel 1
http://example.com/live.m3u8
```

**Usage:**

```typescript
const now = new Date();
const start = new Date(now.getTime() - 3600000); // 1 hour ago
const end = new Date(); // now

const url = buildCatchupUrl(entry, start, end, playlist);
// Result: http://example.com/live.m3u8?utc=1704063600&duration=3600
```

**Custom Template:**

```m3u
#EXTINF:-1 catchup="default" catchup-source="?start={utc}&dur={duration}",Channel
http://example.com/live.m3u8
```

---

### Type 2: Append

**Pattern:** Append catchup-source template to URL with variable substitution.

**M3U Configuration:**

```m3u
#EXTINF:-1 catchup="append" catchup-source="&utc={utc}&duration={duration}",Channel
http://example.com/live.m3u8?token=abc123
```

**Usage:**

```typescript
const url = buildCatchupUrl(entry, start, end, playlist);
// Result: http://example.com/live.m3u8?token=abc123&utc=1704063600&duration=3600
```

**Use case:** When original URL already has query parameters and you need to append more.

---

### Type 3: Shift

**Pattern:** Replace entire URL with catchup-source template.

**M3U Configuration:**

```m3u
#EXTINF:-1 catchup="shift" catchup-source="http://archive.example.com/replay?start=${start}&end=${end}&channel=1",Channel
http://example.com/live.m3u8
```

**Usage:**

```typescript
const url = buildCatchupUrl(entry, start, end, playlist);
// Result: http://archive.example.com/replay?start=1704063600&end=1704067200&channel=1
```

**Use case:** When archive server is different from live streaming server.

---

### Type 4: Flussonic

**Pattern:** Auto-generate Flussonic archive URL format.

**Auto-generated format:** `{baseUrl}/archive-{utc}-{duration}.m3u8`

**M3U Configuration:**

```m3u
#EXTINF:-1 catchup="flussonic" catchup-days="7",Channel
http://example.com/channel1/index.m3u8
```

**Usage:**

```typescript
const url = buildCatchupUrl(entry, start, end, playlist);
// Result: http://example.com/channel1/archive-1704063600-3600.m3u8
```

**Custom Flussonic Template:**

```m3u
#EXTINF:-1 catchup="flussonic" catchup-source="archive-{utc}-{duration}.mpd",Channel
http://example.com/channel1/index.m3u8
```

**Use case:** Flussonic Media Server standard archive format.

---

### Type 5: Xtream Codes (xc)

**Pattern:** Xtream Codes timeshift API format.

**Auto-generated format:** `{host}/timeshift/{username}/{password}/{duration}/{start}/{streamId}.m3u8`

**M3U Configuration:**

```m3u
#EXTINF:-1 catchup="xc" catchup-days="3",Channel
http://example.com/live/username/password/12345.m3u8
```

**Usage:**

```typescript
const url = buildCatchupUrl(entry, start, end, playlist);
// Result: http://example.com/timeshift/username/password/3600/1704063600/12345.m3u8
```

**Supported URL patterns:**
- `/live/username/password/stream_id`
- `/username/password/stream_id`
- `/movie/username/password/stream_id`
- `/series/username/password/stream_id`

**Use case:** Xtream Codes IPTV panels.

**Aliases:** `xtream`, `xtream-codes`, `xc`

---

## Usage Examples

### Check Catchup Support

```typescript
import { parsePlaylist, hasCatchup } from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

for (const entry of playlist.items) {
  if (hasCatchup(entry, playlist)) {
    console.log(`${entry.name} supports catchup`);
  }
}
```

---

### Build Catchup URL for Specific Time

```typescript
import { parsePlaylist, buildCatchupUrl } from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);
const entry = playlist.items[0];

// Watch program from yesterday 8pm-9pm
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(20, 0, 0, 0);

const start = yesterday;
const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour

const catchupUrl = buildCatchupUrl(entry, start, end, playlist);

if (catchupUrl) {
  console.log("Watch from yesterday:", catchupUrl);
} else {
  console.log("Catchup not available");
}
```

---

### Get Available Catchup Window

```typescript
import { parsePlaylist, getCatchupWindow } from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);
const entry = playlist.items[0];

const window = getCatchupWindow(entry, playlist);

if (window) {
  console.log(`Catchup available from ${window.start} to ${window.end}`);
  console.log(`Total hours: ${(window.end.getTime() - window.start.getTime()) / 3600000}`);
} else {
  console.log("No catchup retention configured");
}
```

---

### Filter Catchup-Only Channels

```typescript
import {
  parsePlaylist,
  filterCatchupEntries,
  generateM3U,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// Get only channels with catchup
const catchupEntries = filterCatchupEntries(playlist);

console.log(`${catchupEntries.length}/${playlist.items.length} channels have catchup`);

// Generate new playlist with catchup channels only
const catchupPlaylist = {
  ...playlist,
  items: catchupEntries,
};

const output = generateM3U(catchupPlaylist);
```

---

### Enrich Entries with Catchup Info

```typescript
import {
  parsePlaylist,
  enrichWithCatchup,
  extractCatchupInfo,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);
const enriched = enrichWithCatchup(playlist);

// Now each entry has .catchup field populated
for (const entry of enriched.items) {
  if (entry.catchup) {
    console.log(`${entry.name}:`);
    console.log(`  Type: ${entry.catchup.type}`);
    console.log(`  Retention: ${entry.catchup.days || entry.catchup.hours || "N/A"}`);
  }
}
```

---

### Using Unix Timestamps

```typescript
import { buildCatchupUrl } from "iptv-m3u-playlist-parser";

const entry = playlist.items[0];

// Unix timestamp in seconds
const startSeconds = 1704063600;
const endSeconds = 1704067200;

const url1 = buildCatchupUrl(entry, startSeconds, endSeconds, playlist);

// Unix timestamp in milliseconds
const startMs = 1704063600000;
const endMs = 1704067200000;

const url2 = buildCatchupUrl(entry, startMs, endMs, playlist);

// Both produce same result
console.log(url1 === url2); // true
```

---

## Provider-Specific Patterns

### Flussonic Media Server

**Standard archive format:**

```m3u
#EXTM3U
#EXTINF:-1 catchup="flussonic" catchup-days="7",Channel Name
http://stream.example.com/channel/index.m3u8
```

**Generated URL:**
```
http://stream.example.com/channel/archive-1704063600-3600.m3u8
```

**Custom Flussonic template (MPEG-DASH):**

```m3u
#EXTINF:-1 catchup="flussonic" catchup-source="archive-{utc}-{duration}.mpd",Channel
http://stream.example.com/channel/index.m3u8
```

---

### Xtream Codes Timeshift

**Configuration:**

```m3u
#EXTM3U
#EXTINF:-1 catchup="xc" catchup-days="3",Channel Name
http://panel.example.com/live/john/secret123/12345.m3u8
```

**Generated URL:**
```
http://panel.example.com/timeshift/john/secret123/3600/1704063600/12345.m3u8
```

**URL structure:**
- `/timeshift/` - Timeshift endpoint
- `{username}` - Account username
- `{password}` - Account password
- `{duration}` - Duration in seconds
- `{start}` - Unix timestamp
- `{streamId}` - Stream ID

---

### Custom Archive Server

**Configuration:**

```m3u
#EXTINF:-1 catchup="shift" catchup-source="http://archive.example.com/v1/replay?channel_id=123&start={utc}&duration={duration}&format=hls",Channel
http://live.example.com/stream.m3u8
```

**Result:** Original URL is completely replaced with archive server URL.

---

### CDN with Query Parameters

**Configuration:**

```m3u
#EXTINF:-1 catchup="append" catchup-source="&rewind={offset}&dur={duration}",Channel
http://cdn.example.com/stream.m3u8?token=abc123&quality=hd
```

**Generated URL:**
```
http://cdn.example.com/stream.m3u8?token=abc123&quality=hd&rewind=-7200&dur=3600
```

---

## Real-World Integration

### EPG + Catchup Integration

```typescript
import {
  parsePlaylist,
  findCurrentProgram,
  buildCatchupUrl,
  getCatchupWindow,
} from "iptv-m3u-playlist-parser";

// Get EPG data (from XMLTV or API)
const epgData = { /* ... */ };

async function replayProgram(
  entry: Entry,
  programTitle: string
): Promise<string | undefined> {
  // Find program in EPG
  const programs = getChannelEpg(entry, epgData);
  const program = programs?.find(p => p.title === programTitle);

  if (!program) {
    console.log("Program not found in EPG");
    return undefined;
  }

  // Check if program is within catchup window
  const window = getCatchupWindow(entry, playlist);
  if (!window || program.start < window.start) {
    console.log("Program is too old (outside catchup window)");
    return undefined;
  }

  // Build catchup URL
  const catchupUrl = buildCatchupUrl(entry, program.start, program.stop, playlist);

  if (catchupUrl) {
    console.log(`Replay "${programTitle}": ${catchupUrl}`);
    return catchupUrl;
  }

  return undefined;
}
```

---

### Catchup Player UI

```typescript
import {
  parsePlaylist,
  hasCatchup,
  buildCatchupUrl,
  getCatchupWindow,
} from "iptv-m3u-playlist-parser";

interface CatchupChannel {
  name: string;
  logo?: string;
  maxHoursBack: number;
  buildUrl: (hoursAgo: number, durationMinutes: number) => string | undefined;
}

function getCatchupChannels(playlist: Playlist): CatchupChannel[] {
  return playlist.items
    .filter(entry => hasCatchup(entry, playlist))
    .map(entry => {
      const window = getCatchupWindow(entry, playlist);
      const maxHoursBack = window
        ? (window.end.getTime() - window.start.getTime()) / 3600000
        : 24;

      return {
        name: entry.name,
        logo: entry.tvg?.logo,
        maxHoursBack,
        buildUrl: (hoursAgo: number, durationMinutes: number) => {
          const now = new Date();
          const start = new Date(now.getTime() - hoursAgo * 3600000);
          const end = new Date(start.getTime() + durationMinutes * 60000);
          return buildCatchupUrl(entry, start, end, playlist);
        },
      };
    });
}

// Usage in UI
const channels = getCatchupChannels(playlist);
channels.forEach(channel => {
  console.log(`${channel.name} - Catchup up to ${channel.maxHoursBack}h ago`);

  // Build URL for 3 hours ago, 1 hour duration
  const url = channel.buildUrl(3, 60);
  console.log(`  URL: ${url}`);
});
```

---

## Troubleshooting

### Issue: buildCatchupUrl() returns undefined

**Possible causes:**
1. No catchup configured on entry or playlist header
2. `start >= end` (invalid time range)
3. Missing required `catchup-source` for append/shift types
4. Invalid Xtream URL format for xc type

**Solution:**

```typescript
// Check if catchup is configured
if (!hasCatchup(entry, playlist)) {
  console.log("Catchup not configured");
}

// Validate time range
if (start >= end) {
  console.log("Invalid time range: start must be before end");
}

// Check catchup info
const info = extractCatchupInfo(entry, playlist);
console.log("Catchup config:", info);
```

---

### Issue: Variables not being replaced in URL

**Problem:** URL still contains `{utc}` or `${start}` placeholders.

**Cause:** Likely a custom catchup implementation not using this library's builder.

**Solution:** Ensure you're calling `buildCatchupUrl()` and not manually concatenating:

```typescript
// Bad - manual concatenation
const badUrl = `${entry.url}?utc={utc}`;

// Good - use builder
const goodUrl = buildCatchupUrl(entry, start, end, playlist);
```

---

### Issue: Xtream catchup not working

**Problem:** `buildCatchupUrl()` returns `undefined` for Xtream URLs.

**Cause:** URL doesn't match expected Xtream format.

**Supported patterns:**
```
http://host/live/username/password/12345.m3u8
http://host/username/password/12345.m3u8
http://host/movie/username/password/12345.m3u8
```

**Check URL format:**

```typescript
// Test if URL can be parsed as Xtream
const info = extractCatchupInfo(entry, playlist);
if (info?.type === 'xc') {
  const url = buildCatchupUrl(entry, start, end, playlist);
  if (!url) {
    console.log("URL doesn't match Xtream format:", entry.url);
  }
}
```

---

### Issue: Catchup window is incorrect

**Problem:** `getCatchupWindow()` returns wrong date range.

**Cause:** `catchup-days` or `catchup-hours` misconfigured.

**Solution:**

```typescript
const info = extractCatchupInfo(entry, playlist);
console.log("Configured retention:", {
  days: info?.days,
  hours: info?.hours
});

const window = getCatchupWindow(entry, playlist);
if (window) {
  const hoursBack = (window.end.getTime() - window.start.getTime()) / 3600000;
  console.log(`Actual window: ${hoursBack} hours`);
}
```

---

### Issue: Times are in wrong timezone

**Problem:** Catchup URLs use wrong timezone for timestamps.

**Solution:** Library uses Unix timestamps (UTC). Ensure input times are correct:

```typescript
// Always use Date objects for clarity
const now = new Date(); // Local time
const utcNow = new Date(Date.UTC(
  now.getFullYear(),
  now.getMonth(),
  now.getDate(),
  now.getHours(),
  now.getMinutes()
));

// Or work with Unix timestamps directly
const utcTimestamp = Math.floor(Date.now() / 1000);
```

---

## Performance Considerations

- **URL building**: O(1) - Fast template substitution
- **Timestamp calculations**: O(1) - Simple date arithmetic
- **Batch operations**: Use `enrichWithCatchup()` once, then access `entry.catchup`
- **No network requests**: All operations are local (URL building only)

---

## Related Documentation

- **[README.md](../README.md)** - Main library documentation
- **[EPG.md](EPG.md)** - EPG integration for program-based catchup
- **[VALIDATION.md](VALIDATION.md)** - Validate catchup URLs before playback
- **[GENERATOR.md](GENERATOR.md)** - Generate playlists with catchup attributes
