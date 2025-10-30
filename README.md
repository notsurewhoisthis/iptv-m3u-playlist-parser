# IPTV M3U Playlist Parser

The modern, batteries-included toolkit for parsing, normalizing, enriching, and **intelligently classifying** IPTV playlists.

## Why this exists

- IPTV playlists in the wild are messy: different providers, different conventions, and plenty of edge cases. Building a reliable player means writing lots of glue code… for every project… over and over.
- IPTV Parser gives you a proven, well-documented, and thoroughly-tested foundation you can drop into any app. Less glue. Fewer surprises. Faster to "it just works".

## What makes it different

- **Purpose-built for IPTV**: Not just a generic M3U parser. Understands IPTV-specific attributes (`tvg-*`, `group-title`), auxiliary tags (`#EXTGRP`, `#EXTVLCOPT`, `#KODIPROP`), and catch‑up conventions.
- **Intelligent classification** (NEW): Automatically detects live TV, movies, series, and radio using multi-stage heuristics with multilingual keyword matching.
- **Series-aware**: Extracts season/episode metadata (S01E02), aggregates by series, and handles international formats.
- **Multilingual**: Built-in support for Turkish, German, French, Spanish, and Arabic with locale-aware text normalization.
- **Normalization that saves you hours**: Unifies common aliases (`tvg_id`→`tvg-id`, `group_title`→`group-title`, etc.), merges group sources, and prefers clean names.
- **Predictable output**: Clear TypeScript types, warnings for suspicious lines, and preservation of unknown attributes so nothing is lost.
- **Extensible "beyond-the-file" toolkit**: First-class helpers for Xtream URLs, XMLTV (EPG) parsing, and one‑line EPG enrichment into your playlist items.
- **Production ready**: CI across Node 18/20/22, focused test suite, and deliberate docs you can trust.

## Highlights

**IPTV Parser:**

- M3U/M3U8 extended header parsing: `url-tvg`, `tvg-shift`, global `catchup*`, `timeshift`, playlist-level `user-agent`.
- Entries: `#EXTINF` with duration, IPTV attributes (`tvg-id`, `tvg-name`, `tvg-logo`, `group-title`), robust name handling.
- Aux tags: `#EXTGRP` groups, `#EXTVLCOPT:*` (UA/referrer/cookie/headers), `#KODIPROP:*` captured and merged.
- Normalization: Resolves aliases, unifies groups, preserves unknowns in `attrs` and flags duplicates.
- Xtream utilities: Detect/parse endpoints, build M3U downloads and common catch‑up URLs.
- EPG (XMLTV): Parse channels + programmes, bind playlist items, and enrich with categories/icon in one call.

**Media Classification (NEW in v0.4.0):**

- **6-stage heuristic classifier**: Explicit attributes → group analysis → name patterns → URL paths → HLS detection → fallback
- **MediaKind detection**: Automatically classifies entries as `live`, `movie`, `series`, or `radio`
- **Multilingual keywords**: Built-in support for EN, TR, DE, FR, ES, AR with extensible custom keywords
- **Platform detection**: Recognizes Netflix, Disney+, HBO, Amazon Prime, and other streaming services
- **Conservative HLS mode**: Treats `.m3u8` as live unless strong VOD signals detected

**Series Extraction (NEW in v0.4.0):**

- **Pattern recognition**: Detects S01E02, Season 1 Episode 2, and 1x02 formats
- **Series aggregation**: Groups episodes by series name and season
- **Name sanitization**: Removes years, special characters, and normalizes spacing
- **Provider order preservation**: Maintains original playlist ordering when merging sources

**Multilingual Support (NEW in v0.4.0):**

- **Locale-aware normalization**: Proper handling of Turkish (İ/ı), Arabic RTL, and diacritics
- **Keyword libraries**: Comprehensive classification keywords in 6 languages
- **Stop word filtering**: Ignores generic terms like "HD", "4K", "FHD" during matching

**HLS Parser:**

- **70+ HLS tags** - Complete Apple HLS specification support
- **Master playlists** - Variant streams, audio/video/subtitle renditions, I-frame streams
- **Media playlists** - VOD, EVENT, LIVE playlists with segments
- **Encryption** - AES-128, SAMPLE-AES, SAMPLE-AES-CENC, SAMPLE-AES-CTR
- **Advanced features** - Byte-range, date ranges, low-latency HLS, variable substitution
- **Auto-detection** - Smart detection between IPTV and HLS formats
- **Zero breaking changes** - Dual parser architecture, 100% backward compatible

**Universal:**

- Designed for huge playlists: String-based, zero I/O, no network until you ask for it.
- Full TypeScript support with comprehensive type definitions

## Install

```bash
npm i iptv-m3u-playlist-parser
```

## Quick Start

### Basic IPTV Parsing

```ts
import { parsePlaylist } from "iptv-m3u-playlist-parser";
import { readFileSync } from "node:fs";

const text = readFileSync("playlist.m3u", "utf8");
const result = parsePlaylist(text);

console.log(result.header.tvgUrls);
for (const ch of result.items) {
  console.log(ch.name, ch.tvg?.id, ch.group?.[0], ch.url);
}
```

### Media Classification (NEW)

```ts
import {
  parsePlaylist,
  classifyEntries,
  filterByKind,
  MediaKind,
  getKindStatistics,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(text);

// Classify all entries
classifyEntries(playlist.items, {
  locale: "en", // or 'tr', 'de', 'fr', 'es', 'ar'
  conservativeHls: true,
});

// Get statistics
const stats = getKindStatistics(playlist.items);
console.log(stats);
// { live: 1240, movie: 385, series: 892, radio: 45, unknown: 12 }

// Filter by type
const liveChannels = filterByKind(playlist.items, MediaKind.LIVE);
const movies = filterByKind(playlist.items, MediaKind.MOVIE);
const series = filterByKind(playlist.items, MediaKind.SERIES);
```

### Series Extraction (NEW)

```ts
import {
  parsePlaylist,
  enrichWithSeriesInfo,
  aggregateSeries,
  getSeriesEpisodes,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(text);

// Extract series info from names
enrichWithSeriesInfo(playlist.items);

// Find specific series
const breakingBadEpisodes = getSeriesEpisodes(
  playlist.items,
  "Breaking Bad",
  1, // season
);

// Aggregate all series
const seriesGroups = aggregateSeries(playlist.items);
for (const series of seriesGroups) {
  console.log(
    `${series.seriesName}: ${series.seasons.size} seasons, ${series.categories.join(", ")}`,
  );
}
```

### Multilingual Classification (NEW)

```ts
import {
  parsePlaylist,
  classifyEntries,
  normalizeText,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(text);

// Turkish playlist with proper İ/ı handling
classifyEntries(playlist.items, {
  locale: "tr",
  customKeywords: {
    movie: ["özel filmler"],
    series: ["yeni diziler"],
  },
});

// Normalize Turkish text
const normalized = normalizeText("DİZİLER", "tr"); // → "diziler"
```

### HLS Playlists

```ts
import {
  parseHlsPlaylist,
  isMasterPlaylist,
  isMediaPlaylist,
} from "iptv-m3u-playlist-parser";

const m3u8Text = readFileSync("playlist.m3u8", "utf8");
const hls = parseHlsPlaylist(m3u8Text);

if (isMasterPlaylist(hls)) {
  console.log(`Master playlist with ${hls.variants.length} variants`);
  hls.variants.forEach((v) => {
    console.log(
      `  ${v.resolution?.width}x${v.resolution?.height} @ ${v.bandwidth}bps - ${v.uri}`,
    );
  });
} else if (isMediaPlaylist(hls)) {
  console.log(
    `Media playlist (${hls.playlistType || "LIVE"}) with ${hls.segments.length} segments`,
  );
}
```

### Auto-Detection

```ts
import { parsePlaylistAuto } from "iptv-m3u-playlist-parser";

const text = readFileSync("playlist.m3u8", "utf8");
const result = parsePlaylistAuto(text);

if (result.format === "hls") {
  console.log("HLS playlist detected");
} else {
  console.log("IPTV playlist detected");
}
```

## CLI

```bash
npx iptv-parse playlist.m3u > channels.json
```

## What It Parses

- **Header**: `#EXTM3U` with optional attributes (e.g. `url-tvg`, `tvg-shift`, `catchup`, `catchup-source`, `catchup-hours`, `catchup-days`, `timeshift`).
- **Entry**: `#EXTINF:<duration> <kv-attrs>,<display-name>` followed by the media URL.
- **Groups**: `group-title` attribute and/or `#EXTGRP:Name` lines.
- **Player options**: lines `#EXTVLCOPT:key=value` and `#KODIPROP:key=value` before the URL; merged into `entry.http` and `entry.kodiProps`.

## Advanced Features

### Playlist Merging & Deduplication

```ts
import {
  parsePlaylist,
  mergePlaylists,
  deduplicateEntries,
} from "iptv-m3u-playlist-parser";

const pl1 = parsePlaylist(text1);
const pl2 = parsePlaylist(text2);

// Merge with provider order preservation
const merged = mergePlaylists([pl1, pl2]);

// Remove duplicates (keeps earliest)
const unique = {
  ...merged,
  items: deduplicateEntries(merged.items),
};
```

### Xtream Helpers

```ts
import {
  isXtreamUrl,
  parseXtream,
  makeXtreamCredentials,
  buildXtreamM3uUrl,
} from "iptv-m3u-playlist-parser";

const info = parseXtream(
  "http://host/get.php?username=u&password=p&type=m3u&output=ts",
);
const creds = makeXtreamCredentials(info!.host, info!.username, info!.password);
const m3uUrl = buildXtreamM3uUrl(creds, { type: "m3u", output: "ts" });
```

### EPG Enrichment

```ts
import {
  parseXmltv,
  parseXmltvPrograms,
  enrichPlaylistWithEpg,
} from "iptv-m3u-playlist-parser";

const xml = await fetch("https://example.com/epg.xml").then((r) => r.text());
const { channels } = parseXmltv(xml);
const { programs } = parseXmltvPrograms(xml);
const enriched = enrichPlaylistWithEpg(pl, channels, programs, {
  topNCategories: 5,
  attachIconIfMissing: true,
});
```

## Typed Output

```ts
enum MediaKind {
  LIVE = "live",
  MOVIE = "movie",
  SERIES = "series",
  RADIO = "radio",
}

interface SeriesInfo {
  seriesName?: string;
  season?: number;
  episode?: number;
}

interface Entry {
  name: string;
  url: string;
  duration?: number; // seconds
  group?: string[];
  tvg?: { id?: string; name?: string; logo?: string; chno?: string };
  http?: {
    userAgent?: string;
    referer?: string;
    cookie?: string;
    headers?: Record<string, string>;
  };
  kodiProps?: Record<string, string>;
  attrs: Record<string, string>; // all parsed attributes
  extras?: Record<string, unknown>;
  kind?: MediaKind; // NEW: auto-detected media type
  series?: SeriesInfo; // NEW: season/episode metadata
  providerOrder?: number; // NEW: original position for merging
}

interface Playlist {
  header: PlaylistHeader;
  items: Entry[];
  warnings: string[];
}
```

## Documentation

- **[CLASSIFICATION.md](docs/CLASSIFICATION.md)** - Media classification system guide (NEW)
- **[SERIES.md](docs/SERIES.md)** - Series extraction and aggregation (NEW)
- **[HLS Parser](docs/HLS.md)** - Complete HLS parsing guide with 70+ tags
- **[PLAYLIST_RULES.md](docs/PLAYLIST_RULES.md)** - IPTV parsing rules and edge cases
- **[XTREAM.md](docs/XTREAM.md)** - Xtream URL formats and helpers
- **[EPG.md](docs/EPG.md)** - XMLTV parsing, binding, and programme categories

## Status

- Version 0.4.0 adds world-class media classification and series handling
- Stable API maintained with backward compatibility
- Contributions welcome

## Project Philosophy

- **Be precise**: clearly define parsing behavior and keep the output shape stable.
- **Be forgiving**: accept the weirdness of real‑world playlists and keep going with warnings.
- **Be pragmatic**: expose small, composable helpers rather than heavy frameworks.
- **Be intelligent**: provide smart defaults while remaining configurable.

## Roadmap

- ✅ Media classification (live/movie/series/radio)
- ✅ Series extraction and aggregation
- ✅ Multilingual keyword matching (6 languages)
- ⬜ Streaming parser for extremely large files (100K+ entries)
- ⬜ Advanced validation utilities
- ⬜ Richer EPG programme queries (by time window, now/next, etc.)

## Contributing

- PRs are welcome. Please run `npm run build` and `npm test` before opening a PR.
- If you're proposing a parsing change, include a failing test and a short note in docs/PLAYLIST_RULES.md.

## Acknowledgments

Classification and series handling inspired by production-proven patterns from [Diamond IPTV](https://github.com/diamondiptvapp).

## License

MIT
