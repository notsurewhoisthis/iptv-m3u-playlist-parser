# Media Classification Guide

The IPTV parser includes a sophisticated **6-stage heuristic classification system** that automatically detects whether an entry is live TV, a movie, a series episode, or radio.

## Overview

The classifier analyzes multiple signals in order of reliability:

1. **Explicit attributes** (`tvg-type`, `type`)
2. **Group-title keywords** (most reliable for IPTV)
3. **Name patterns** (S01E02, year in parentheses, etc.)
4. **URL path analysis** (/live/, /vod/, /series/)
5. **HLS-specific logic** (conservative .m3u8 handling)
6. **Fallback detection** (catchup/timeshift attributes, EPG ID)

Inspired by production-proven patterns from **Diamond IPTV**.

## MediaKind Enum

```ts
enum MediaKind {
  LIVE = "live",      // Live TV channels
  MOVIE = "movie",    // Movies / VOD
  SERIES = "series",  // TV series episodes
  RADIO = "radio",    // Radio stations
}
```

## Basic Usage

```ts
import {
  parsePlaylist,
  classifyEntries,
  classifyEntry,
  MediaKind,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// Classify all entries
classifyEntries(playlist.items);

// Access detected kind
for (const entry of playlist.items) {
  console.log(`${entry.name}: ${entry.kind}`);
}

// Classify single entry
const kind = classifyEntry(playlist.items[0]);
```

## Classification Options

```ts
interface ClassificationOptions {
  /** Enable auto-classification (default: true) */
  enableAutoClassification?: boolean;

  /** Locale for keyword matching (default: 'en') */
  locale?: string; // 'en' | 'tr' | 'de' | 'fr' | 'es' | 'ar'

  /** Custom keywords for classification */
  customKeywords?: {
    live?: string[];
    movie?: string[];
    series?: string[];
    radio?: string[];
  };

  /** Conservative HLS mode (default: true) */
  conservativeHls?: boolean; // Treats .m3u8 as live unless strong VOD signals
}
```

### Examples

```ts
// Turkish playlist
classifyEntries(playlist.items, {
  locale: "tr",
});

// Custom keywords
classifyEntries(playlist.items, {
  locale: "en",
  customKeywords: {
    movie: ["my custom movie keyword"],
    series: ["my custom series keyword"],
  },
});

// Aggressive VOD detection
classifyEntries(playlist.items, {
  conservativeHls: false, // Allows .m3u8 to be classified as movie/series more easily
});
```

## The 6-Stage Classification System

### Stage 1: Explicit Type Attributes

**Signals:** `tvg-type`, `type`, `tvg_type` attributes

```m3u
#EXTINF:-1 tvg-type="movie",Action Movie
http://example.com/movie.mp4
```

**Detection:**
- `movie` or `vod` → `MediaKind.MOVIE`
- `series`, `show`, `tv-show` → `MediaKind.SERIES`
- `live`, `channel` → `MediaKind.LIVE`
- `radio`, `audio` → `MediaKind.RADIO`

**Priority:** Highest (explicit is most reliable)

---

### Stage 2: Group-Title Keyword Analysis

**Signals:** `group-title` attribute and `#EXTGRP` tags

```m3u
#EXTINF:-1 group-title="Movies | Action",Inception
http://example.com/inception.mp4
```

**Multilingual Keywords:**

| Kind | English | Turkish | German | French | Spanish | Arabic |
|------|---------|---------|--------|--------|---------|--------|
| **Series** | series, show, season, episode | dizi, diziler, sezon, bölüm | serie, staffel, folge | série, saison, épisode | serie, temporada, episodio | مسلسل, حلقة, موسم |
| **Movie** | movie, film, cinema, vod, bluray | film, sinema, dublaj, vizyon | film, kino, kinofilm | film, cinéma, vod | película, cine, estreno | فيلم, أفلام, سينما |
| **Live** | live, channel, sport, news, ppv | canlı, spor, haber, ulusal | live, sport, nachrichten | direct, sport, info | en vivo, deporte, noticias | مباشر, قناة, رياضة |
| **Radio** | radio, music, fm, am, shoutcast | radyo, müzik, fm | radio, musik | radio, musique | radio, música | راديو, موسيقى |

**Platform Detection:**

Recognizes streaming services: Netflix, Disney+, HBO, Amazon Prime, Apple TV+, Hulu, Paramount+, Showtime, BBC iPlayer, Exxen, BluTV, Tabii, Gain

**Example:**

```m3u
#EXTINF:-1 group-title="DİZİLER",Breaking Bad S01E01
# Detected as SERIES (Turkish keyword "DİZİLER")

#EXTINF:-1 group-title="FİLMLER | AKSİYON",John Wick
# Detected as MOVIE (Turkish keyword "FİLMLER")

#EXTINF:-1 group-title="CANLI YAYIN | SPOR",beIN Sports 1
# Detected as LIVE (Turkish keywords "CANLI", "SPOR")
```

**Priority:** Very High (most reliable for IPTV playlists)

---

### Stage 3: Name Pattern Detection

**Signals:** Entry name patterns

**Series Patterns:**
- `S\d{1,2}E\d{1,3}` → Breaking Bad S01E02
- `season \d+ episode \d+` → Game of Thrones Season 1 Episode 1
- `\d{1,2}x\d{1,3}` → Stranger Things 1x01

**Movie Patterns:**
- `(19\d{2})` or `(20\d{2})` → Inception (2010)
- Bare year for DE/FR locales: `\b(19|20)\d{2}\b`

**Examples:**

```m3u
#EXTINF:-1,Breaking Bad S02E05
# Detected as SERIES (S##E## pattern)

#EXTINF:-1,The Matrix (1999)
# Detected as MOVIE (year in parentheses)

#EXTINF:-1,Stranger Things Season 3 Episode 8
# Detected as SERIES (season/episode text)
```

**Priority:** High

---

### Stage 4: URL Path Analysis

**Signals:** URL paths and extensions

**Detections:**
- `/live/`, `/channel/` → `MediaKind.LIVE`
- `/series/`, `/tv/`, `/shows/`, `/seasons/` → `MediaKind.SERIES`
- `/movie/`, `/vod/`, `/film/` → `MediaKind.MOVIE`
- `.mp4`, `.mkv`, `.avi`, `.mov` extensions → `MediaKind.MOVIE`

**Examples:**

```m3u
#EXTINF:-1,CNN
http://example.com/live/cnn.m3u8
# Detected as LIVE (/live/ in URL)

#EXTINF:-1,Movie Title
http://example.com/vod/movies/action/movie.mp4
# Detected as MOVIE (/vod/ + .mp4)

#EXTINF:-1,Series Episode
http://example.com/series/breaking-bad/s01e01.m3u8
# Detected as SERIES (/series/ in URL)
```

**Priority:** Medium-High

---

### Stage 5: HLS-Specific Logic

**Signals:** `.m3u8` or `.m3u` in URL

**Conservative Mode** (default: `true`):
- Treats HLS as LIVE unless strong VOD signals present
- Strong VOD signals: `/movie/`, `/vod/`, file extension, duration > 0

**Example:**

```m3u
# Conservative mode (default)
#EXTINF:-1,Channel
http://example.com/stream.m3u8
# Detected as LIVE (no strong VOD signals)

#EXTINF:7200,Movie
http://example.com/stream.m3u8
# Detected as MOVIE (has duration > 0)

# Non-conservative mode
#EXTINF:-1,Content
http://example.com/stream.m3u8
# Could be MOVIE/SERIES based on other signals
```

**Priority:** Medium

---

### Stage 6: Fallback Detection

**Signals:** Attributes and defaults

**Detections:**
- Has `catchup` or `timeshift` attribute → `MediaKind.LIVE`
- Has EPG ID (`tvg-id`) → `MediaKind.LIVE`
- **Default:** `MediaKind.LIVE` (most common for IPTV)

**Priority:** Lowest (catch-all)

---

## Filtering by MediaKind

```ts
import { filterByKind, MediaKind } from "iptv-m3u-playlist-parser";

const liveChannels = filterByKind(playlist.items, MediaKind.LIVE);
const movies = filterByKind(playlist.items, MediaKind.MOVIE);
const series = filterByKind(playlist.items, MediaKind.SERIES);
const radioStations = filterByKind(playlist.items, MediaKind.RADIO);
```

## Statistics

```ts
import { getKindStatistics } from "iptv-m3u-playlist-parser";

const stats = getKindStatistics(playlist.items);
console.log(stats);
// {
//   live: 1240,
//   movie: 385,
//   series: 892,
//   radio: 45,
//   unknown: 12
// }
```

## Troubleshooting

### Issue: Wrong classification

**Solution:** Use explicit `tvg-type` attribute or custom keywords

```m3u
#EXTINF:-1 tvg-type="movie",My Content
http://example.com/stream.m3u8
```

Or add custom keywords:

```ts
classifyEntries(playlist.items, {
  customKeywords: {
    movie: ["my provider movie tag"],
  },
});
```

### Issue: HLS streams always detected as LIVE

**Solution:** Add duration or use non-conservative mode

```ts
// Option 1: Add duration to M3U
#EXTINF:7200,Movie Title

// Option 2: Disable conservative HLS
classifyEntries(playlist.items, {
  conservativeHls: false,
});
```

### Issue: Non-English keywords not working

**Solution:** Set correct locale

```ts
classifyEntries(playlist.items, {
  locale: "tr", // for Turkish
  // or 'de', 'fr', 'es', 'ar'
});
```

## Best Practices

1. **Use explicit `tvg-type` when possible** - Most reliable
2. **Set correct locale for international playlists** - Improves accuracy
3. **Keep conservative HLS mode for live TV playlists** - Reduces false positives
4. **Add custom keywords for provider-specific tags** - Handles edge cases
5. **Use group-title consistently** - Most reliable signal after explicit type

## Performance

- Classification is **fast**: O(1) regex checks per entry
- Pre-compiled patterns for speed
- Lazy evaluation (only classifies when requested)
- Memory efficient (no additional data structures)

## Locale Support

| Locale | Language | Status |
|--------|----------|--------|
| `en` | English | ✅ Full |
| `tr` | Turkish | ✅ Full (with İ/ı handling) |
| `de` | German | ✅ Full |
| `fr` | French | ✅ Full |
| `es` | Spanish | ✅ Full |
| `ar` | Arabic | ✅ Full (RTL aware) |

## Examples by Language

### Turkish (Türkçe)

```ts
classifyEntries(playlist.items, { locale: "tr" });

// Recognizes:
// - DİZİLER → SERIES
// - FİLMLER → MOVIE
// - CANLI YAYIN → LIVE
// - RADYO → RADIO
```

### German (Deutsch)

```ts
classifyEntries(playlist.items, { locale: "de" });

// Recognizes:
// - SERIEN → SERIES
// - FILME → MOVIE
// - LIVE SENDER → LIVE
// - RADIO → RADIO
```

### French (Français)

```ts
classifyEntries(playlist.items, { locale: "fr" });

// Recognizes:
// - SÉRIES → SERIES
// - FILMS → MOVIE
// - EN DIRECT → LIVE
// - RADIO → RADIO
```

## Advanced: Logo Placeholder Detection

```ts
import { isPlaceholderLogo } from "iptv-m3u-playlist-parser";

const entry = playlist.items[0];
if (entry.tvg?.logo && isPlaceholderLogo(entry.tvg.logo)) {
  console.log("Entry has placeholder logo, fetch real one");
}

// Detects patterns like:
// - /default-logo.png
// - /placeholder.jpg
// - /channel-logo.png
// - /noimage.png
```

---

**Next:** [Series Extraction Guide](SERIES.md)
