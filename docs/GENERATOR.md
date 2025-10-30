# M3U Generation Guide

Convert parsed IPTV playlists back to M3U/M3U8 format with full control over output formatting and structure.

## Quick Start

```typescript
import { parsePlaylist, generateM3U } from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// Generate M3U8 with default settings
const m3u8 = generateM3U(playlist);

// Generate with options
const sorted = generateM3U(playlist, {
  sortByGroup: true,
  format: "m3u8",
});
```

## Overview

The generator module allows you to:
- Convert parsed playlists back to M3U/M3U8 format
- Modify playlists programmatically then regenerate
- Filter entries and create custom playlists
- Sort entries by group or custom criteria
- Preserve all attributes and auxiliary tags

## When to Use Generator vs Parser

**Use Generator when:**
- Building playlist editors or management tools
- Creating filtered/sorted playlists from larger sources
- Merging multiple playlists into one
- Programmatically modifying playlist metadata
- Converting between JSON and M3U formats

**Use Parser when:**
- Reading playlists into your application
- Analyzing playlist structure
- Extracting channel information
- Validating playlist integrity

## API Reference

### generateM3U()

Generate M3U/M3U8 playlist from parsed data.

```typescript
function generateM3U(
  playlist: Playlist,
  options?: GeneratorOptions
): string
```

**Parameters:**
- `playlist` - Parsed playlist object from `parsePlaylist()`
- `options` - Optional configuration object

**Returns:** M3U/M3U8 formatted string

**Options:**

```typescript
interface GeneratorOptions {
  /** Output format (default: "m3u8") */
  format?: "m3u" | "m3u8";

  /** Sort entries by group-title (default: false) */
  sortByGroup?: boolean;

  /** Include #EXTM3U header (default: true) */
  includeHeader?: boolean;
}
```

---

### generateJSON()

Export playlist as JSON.

```typescript
function generateJSON(
  playlist: Playlist,
  pretty?: boolean
): string
```

**Parameters:**
- `playlist` - Parsed playlist object
- `pretty` - Pretty print with indentation (default: false)

**Returns:** JSON string

---

## Usage Examples

### Basic Generation

```typescript
import { parsePlaylist, generateM3U } from "iptv-m3u-playlist-parser";

const original = parsePlaylist(m3uText);
const regenerated = generateM3U(original);

// Write to file
import { writeFileSync } from "fs";
writeFileSync("output.m3u8", regenerated, "utf8");
```

---

### Round-Trip (Parse → Modify → Generate)

```typescript
import { parsePlaylist, generateM3U } from "iptv-m3u-playlist-parser";

// Parse original playlist
const playlist = parsePlaylist(m3uText);

// Modify entries
playlist.items.forEach((entry) => {
  // Add "HD" suffix to all channel names
  if (!entry.name.includes("HD")) {
    entry.name += " HD";
  }

  // Update logo URLs
  if (entry.tvg?.logo && entry.tvg.logo.startsWith("http://")) {
    entry.tvg.logo = entry.tvg.logo.replace("http://", "https://");
  }
});

// Regenerate
const modified = generateM3U(playlist);
```

---

### Filtering Then Regenerating

```typescript
import {
  parsePlaylist,
  classifyEntries,
  MediaKind,
  generateM3U,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);
classifyEntries(playlist.items);

// Create separate playlists by type
const liveOnly = {
  ...playlist,
  items: playlist.items.filter((e) => e.kind === MediaKind.LIVE),
};

const moviesOnly = {
  ...playlist,
  items: playlist.items.filter((e) => e.kind === MediaKind.MOVIE),
};

// Generate separate files
const liveM3U = generateM3U(liveOnly);
const moviesM3U = generateM3U(moviesOnly);
```

---

### Sorting by Group

```typescript
import { parsePlaylist, generateM3U } from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// Sort entries alphabetically by group-title
const sorted = generateM3U(playlist, {
  sortByGroup: true,
});

// Result: All "News" channels together, all "Sports" together, etc.
```

---

### Custom Sorting

```typescript
import { parsePlaylist, generateM3U } from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// Custom sort: by name length (shortest first)
const customSorted = {
  ...playlist,
  items: [...playlist.items].sort((a, b) => a.name.length - b.name.length),
};

const output = generateM3U(customSorted);
```

---

### UTF-8 vs ASCII Format

```typescript
import { parsePlaylist, generateM3U } from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// M3U8 format (UTF-8 encoding) - default
const m3u8 = generateM3U(playlist, { format: "m3u8" });

// M3U format (ASCII encoding)
const m3u = generateM3U(playlist, { format: "m3u" });

// Note: Both produce same output structure, format option is for semantic clarity
// Always use UTF-8 encoding when writing files to support international characters
```

---

### Merging Multiple Playlists

```typescript
import {
  parsePlaylist,
  mergePlaylists,
  generateM3U,
} from "iptv-m3u-playlist-parser";

// Parse multiple sources
const playlist1 = parsePlaylist(source1);
const playlist2 = parsePlaylist(source2);
const playlist3 = parsePlaylist(source3);

// Merge
const merged = mergePlaylists([playlist1, playlist2, playlist3]);

// Generate combined playlist
const combined = generateM3U(merged, { sortByGroup: true });
```

---

### Deduplication

```typescript
import {
  parsePlaylist,
  deduplicateEntries,
  generateM3U,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// Remove duplicate entries (by URL)
const deduplicated = {
  ...playlist,
  items: deduplicateEntries(playlist.items),
};

const clean = generateM3U(deduplicated);
console.log(`Removed ${playlist.items.length - deduplicated.items.length} duplicates`);
```

---

### JSON Export

```typescript
import { parsePlaylist, generateJSON } from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// Compact JSON
const compact = generateJSON(playlist);

// Pretty JSON (for human reading or debugging)
const pretty = generateJSON(playlist, true);

// Save to file
import { writeFileSync } from "fs";
writeFileSync("playlist.json", pretty, "utf8");
```

---

### Header Customization

```typescript
import { parsePlaylist, generateM3U } from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// Modify header attributes
playlist.header.catchup = "default";
playlist.header.catchupDays = 7;
playlist.header.tvgUrls = ["https://example.com/epg.xml"];

// Generate with custom header
const custom = generateM3U(playlist);

// Result:
// #EXTM3U url-tvg="https://example.com/epg.xml" catchup="default" catchup-days="7"
```

---

### Without Header

```typescript
import { parsePlaylist, generateM3U } from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// Generate entries only (no #EXTM3U header)
const entriesOnly = generateM3U(playlist, {
  includeHeader: false,
});

// Useful for concatenating playlists manually
```

---

## Output Format

### Generated M3U Structure

```m3u
#EXTM3U url-tvg="http://epg.example.com/guide.xml" catchup="default" catchup-days="7"
#EXTINF:-1 tvg-id="channel1" tvg-name="Channel 1" tvg-logo="http://logo.png" group-title="News",Channel 1 HD
#EXTGRP:News
#EXTVLCOPT:http-user-agent=Mozilla/5.0
#KODIPROP:inputstream=inputstream.adaptive
http://example.com/channel1.m3u8

#EXTINF:-1 tvg-id="channel2" group-title="Sports",Channel 2
http://example.com/channel2.m3u8
```

### Attribute Handling

**Preserved Attributes:**
- `tvg-id`, `tvg-name`, `tvg-logo`, `tvg-chno`
- `group-title` (from first group in array)
- All custom attributes from `entry.attrs`

**Auxiliary Tags:**
- `#EXTGRP:` lines for all groups
- `#EXTVLCOPT:` lines for HTTP hints (user-agent, referer, cookie, headers)
- `#KODIPROP:` lines for Kodi properties

**Attribute Escaping:**

Double quotes in attribute values are automatically escaped:

```typescript
const playlist = {
  header: {},
  items: [{
    name: 'Channel with "quotes"',
    url: "http://example.com/stream.m3u8",
    attrs: {
      "custom-attr": 'Value with "quotes"'
    }
  }],
  warnings: []
};

const m3u = generateM3U(playlist);
// Result: custom-attr="Value with \"quotes\""
```

---

## Real-World Workflows

### Playlist Builder Application

```typescript
import {
  parsePlaylist,
  classifyEntries,
  enrichWithSeriesInfo,
  generateM3U,
} from "iptv-m3u-playlist-parser";

// Build custom playlist from user selections
async function buildCustomPlaylist(
  sourceFile: string,
  selectedChannelIds: string[]
): Promise<string> {
  const source = parsePlaylist(await readFile(sourceFile));

  // Filter to selected channels only
  const customPlaylist = {
    ...source,
    items: source.items.filter((entry) =>
      selectedChannelIds.includes(entry.tvg?.id || "")
    ),
  };

  // Generate and return
  return generateM3U(customPlaylist, { sortByGroup: true });
}
```

---

### Playlist Optimizer

```typescript
import {
  parsePlaylist,
  validatePlaylist,
  enrichWithHealth,
  filterByHealth,
  generateM3U,
} from "iptv-m3u-playlist-parser";

// Remove dead streams from playlist
async function optimizePlaylist(m3uContent: string): Promise<string> {
  const playlist = parsePlaylist(m3uContent);

  // Validate all streams
  console.log("Validating streams...");
  const healthResults = await validatePlaylist(playlist, {
    timeout: 5000,
    concurrency: 20,
    onProgress: (done, total) => console.log(`${done}/${total}`),
  });

  // Enrich and filter
  const enriched = enrichWithHealth(playlist, healthResults);
  const aliveOnly = filterByHealth(enriched, true);

  console.log(`Kept ${aliveOnly.items.length}/${playlist.items.length} streams`);

  // Regenerate clean playlist
  return generateM3U(aliveOnly);
}
```

---

### Multi-Format Exporter

```typescript
import { parsePlaylist, generateM3U, generateJSON } from "iptv-m3u-playlist-parser";
import { writeFileSync } from "fs";

function exportPlaylist(m3uContent: string, basePath: string): void {
  const playlist = parsePlaylist(m3uContent);

  // Export as M3U8
  const m3u8 = generateM3U(playlist);
  writeFileSync(`${basePath}.m3u8`, m3u8, "utf8");

  // Export as JSON
  const json = generateJSON(playlist, true);
  writeFileSync(`${basePath}.json`, json, "utf8");

  // Export as sorted M3U8
  const sorted = generateM3U(playlist, { sortByGroup: true });
  writeFileSync(`${basePath}.sorted.m3u8`, sorted, "utf8");

  console.log(`Exported to ${basePath}.{m3u8,json,sorted.m3u8}`);
}
```

---

## Troubleshooting

### Issue: Generated playlist has broken special characters

**Problem:** Non-ASCII characters (Turkish İ, Arabic, Chinese) display incorrectly.

**Solution:** Always write with UTF-8 encoding:

```typescript
import { writeFileSync } from "fs";

const m3u8 = generateM3U(playlist);
writeFileSync("output.m3u8", m3u8, "utf8"); // ← Specify encoding
```

---

### Issue: Attribute values contain unescaped quotes

**Problem:** Attribute with quotes breaks M3U format.

**Solution:** Generator automatically escapes quotes. If you're manually constructing attributes:

```typescript
// Bad
entry.attrs["custom"] = 'value with "quotes"'; // Will be escaped

// Good - already handled by generator
const m3u = generateM3U(playlist);
```

---

### Issue: Large playlists generate slowly

**Problem:** Generating 100K+ entry playlist takes several seconds.

**Solution:** Generation is O(n) but string concatenation can be slow. Consider:

```typescript
// For very large playlists, generate in chunks
function generateInChunks(playlist: Playlist, chunkSize = 10000): string {
  const chunks: string[] = [];

  // Generate header once
  const header = generateM3U({ ...playlist, items: [] });
  chunks.push(header);

  // Generate entries in chunks
  for (let i = 0; i < playlist.items.length; i += chunkSize) {
    const chunk = playlist.items.slice(i, i + chunkSize);
    const chunkPlaylist = { ...playlist, items: chunk };
    const chunkM3U = generateM3U(chunkPlaylist, { includeHeader: false });
    chunks.push(chunkM3U);
  }

  return chunks.join("");
}
```

---

### Issue: Missing #EXTGRP tags in output

**Problem:** Groups present in parsed playlist but not in generated output.

**Solution:** Groups are stored in `entry.group` array. Generator outputs `#EXTGRP:` for each:

```typescript
// Ensure groups are populated
entry.group = ["News", "International"];

// Will generate:
// #EXTGRP:News
// #EXTGRP:International
```

---

### Issue: HTTP options not preserved

**Problem:** VLC options (user-agent, referer) missing in generated playlist.

**Solution:** Ensure `entry.http` object is populated:

```typescript
entry.http = {
  userAgent: "VLC/3.0.0",
  referer: "https://example.com",
  cookie: "session=abc123",
};

// Will generate:
// #EXTVLCOPT:http-user-agent=VLC/3.0.0
// #EXTVLCOPT:http-referrer=https://example.com
// #EXTVLCOPT:http-cookie=session=abc123
```

---

## Performance Considerations

**Generation Speed:**
- Small playlists (<1K entries): <10ms
- Medium playlists (1K-10K entries): <100ms
- Large playlists (10K-100K entries): <1s
- Very large playlists (100K+ entries): 1-5s

**Memory Usage:**
- Minimal overhead beyond input playlist size
- Output string held in memory (2x playlist size briefly)
- Consider streaming for extremely large playlists

**Best Practices:**
1. Reuse parsed playlist object for multiple generations
2. Filter entries before generating to reduce output size
3. Use `includeHeader: false` when concatenating multiple outputs
4. Consider chunked generation for 100K+ entries

---

## Related Documentation

- **[README.md](../README.md)** - Main library documentation
- **[CLASSIFICATION.md](CLASSIFICATION.md)** - Media type classification
- **[SERIES.md](SERIES.md)** - Series extraction and aggregation
- **[EPG.md](EPG.md)** - EPG integration guide
- **[VALIDATION.md](VALIDATION.md)** - Stream health validation
