# Series Extraction and Aggregation Guide

The IPTV parser includes powerful series extraction capabilities that automatically detect, parse, and aggregate TV series episodes from playlists.

## Overview

Series features:
- **Pattern Recognition**: Detects S01E02, Season 1 Episode 2, and 1x02 formats
- **Name Sanitization**: Removes years, special characters, and normalizes spacing  
- **Episode Aggregation**: Groups episodes by series name and season
- **Provider Order Preservation**: Maintains original playlist ordering
- **Category Merging**: Unions categories across all episodes of a series

## SeriesInfo Interface

```ts
interface SeriesInfo {
  seriesName?: string;  // Cleaned series name
  season?: number;      // Season number (1-based)
  episode?: number;     // Episode number (1-based)
}

interface Entry {
  // ... other fields
  series?: SeriesInfo;  // Extracted series metadata
}
```

## Basic Usage

### Extract Series Information

```ts
import {
  parsePlaylist,
  enrichWithSeriesInfo,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// Extract series info from all entries
enrichWithSeriesInfo(playlist.items);

// Access series metadata
for (const entry of playlist.items) {
  if (entry.series) {
    console.log(
      `${entry.series.seriesName} S${entry.series.season}E${entry.series.episode}`,
    );
  }
}
```

### Check if Entry is Series

```ts
import { isSeriesEntry } from "iptv-m3u-playlist-parser";

const isSeries = isSeriesEntry("Breaking Bad S01E02");
// true

const isNotSeries = isSeriesEntry("CNN Live");
// false
```

## Supported Patterns

### Pattern 1: S##E## Format (Most Common)

```m3u
#EXTINF:-1,Breaking Bad S01E02
#EXTINF:-1,Game of Thrones S08E06
#EXTINF:-1,The Office S2E5
```

**Regex:** `/\bS(\d{1,2})E(\d{1,3})\b/i`

**Matches:**
- S01E02, S1E2, S10E100
- Case-insensitive (s01e02 also works)

---

### Pattern 2: Season/Episode Text

```m3u
#EXTINF:-1,Stranger Things Season 3 Episode 8
#EXTINF:-1,Friends Season 10 Ep 17
#EXTINF:-1,The Crown Season 2 Episode 1
```

**Regex:** `/season\s*(\d{1,2})\s*.{0,6}\s*ep(?:isode)?\s*(\d{1,3})/i`

**Matches:**
- "Season 1 Episode 2"
- "Season 3 Ep 8"
- "Season 10 Episode 100"

---

### Pattern 3: 1x02 Format (Alternative)

```m3u
#EXTINF:-1,Westworld 1x05
#EXTINF:-1,True Detective 2x08
```

**Regex:** `/\b(\d{1,2})x(\d{1,3})\b/i`

**Matches:**
- 1x05, 2x08, 10x100

---

## Series Name Extraction

The parser extracts series names from:

1. **Explicit `series` attribute**
2. **`tvg-name` attribute**
3. **Entry name** (removes season/episode pattern and sanitizes)

### Sanitization Process

```ts
import { sanitizeSeriesName } from "iptv-m3u-playlist-parser";

// Remove year
sanitizeSeriesName("Breaking Bad (2008) S01E01");
// → "Breaking Bad"

// Remove special characters
sanitizeSeriesName("[Breaking-Bad]_S01E01");
// → "Breaking Bad"

// Normalize whitespace
sanitizeSeriesName("Breaking    Bad   S01E01");
// → "Breaking Bad"
```

**Removed:**
- Years in parentheses: `(1999)`, `(2020)`
- Special characters: `[](){}` `-_`
- Extra whitespace

**Example:**

```m3u
#EXTINF:-1,Game of Thrones (2011) S01E01 - Winter is Coming
```

**Extracted SeriesInfo:**
```ts
{
  seriesName: "Game of Thrones",
  season: 1,
  episode: 1
}
```

---

## Aggregating Series

Group episodes by series name and season:

```ts
import {
  parsePlaylist,
  enrichWithSeriesInfo,
  aggregateSeries,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);
enrichWithSeriesInfo(playlist.items);

// Aggregate into series groups
const seriesGroups = aggregateSeries(playlist.items);

for (const series of seriesGroups) {
  console.log(`\n${series.seriesName}`);
  console.log(`  Seasons: ${series.seasons.size}`);
  console.log(`  Categories: ${series.categories.join(", ")}`);
  console.log(`  Provider Order: ${series.firstProviderOrder}`);

  // Iterate seasons
  for (const [seasonNum, episodes] of series.seasons) {
    console.log(`  Season ${seasonNum}: ${episodes.length} episodes`);
  }
}
```

**Output:**
```
Breaking Bad
  Seasons: 5
  Categories: Drama, Crime, Thriller
  Provider Order: 42
  Season 1: 7 episodes
  Season 2: 13 episodes
  Season 3: 13 episodes
  Season 4: 13 episodes
  Season 5: 16 episodes
```

### SeriesGroup Interface

```ts
interface SeriesGroup {
  seriesName: string;
  seasons: Map<number, Entry[]>;  // Season number → Episodes
  categories: string[];            // Union of all categories
  firstProviderOrder?: number;     // Earliest occurrence in playlist
}
```

---

## Filtering and Querying

### Filter Series Entries Only

```ts
import { filterSeriesEntries } from "iptv-m3u-playlist-parser";

const seriesOnly = filterSeriesEntries(playlist.items);
// Only entries with S##E## patterns
```

### Get All Series Names

```ts
import {
  enrichWithSeriesInfo,
  getSeriesNames,
} from "iptv-m3u-playlist-parser";

enrichWithSeriesInfo(playlist.items);
const allSeries = getSeriesNames(playlist.items);
// ["Breaking Bad", "Game of Thrones", "The Office", ...]
```

### Get Specific Series Episodes

```ts
import { getSeriesEpisodes } from "iptv-m3u-playlist-parser";

// Get all episodes
const breakingBadAll = getSeriesEpisodes(
  playlist.items,
  "Breaking Bad",
);

// Get specific season
const season1 = getSeriesEpisodes(
  playlist.items,
  "Breaking Bad",
  1, // season number
);

// Episodes are sorted by season, then episode
for (const ep of season1) {
  console.log(`S${ep.series?.season}E${ep.series?.episode}: ${ep.name}`);
}
```

---

## Real-World Examples

### Example 1: Build Series Library

```ts
import {
  parsePlaylist,
  enrichWithSeriesInfo,
  aggregateSeries,
  classifyEntries,
  MediaKind,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// Classify and extract series
classifyEntries(playlist.items);
enrichWithSeriesInfo(playlist.items);

// Filter only series (exclude movies/live)
const seriesEntries = playlist.items.filter(
  (e) => e.kind === MediaKind.SERIES,
);

// Aggregate
const library = aggregateSeries(seriesEntries);

// Build UI data structure
const libraryData = library.map((series) => ({
  title: series.seriesName,
  totalSeasons: series.seasons.size,
  totalEpisodes: Array.from(series.seasons.values()).reduce(
    (sum, eps) => sum + eps.length,
    0,
  ),
  categories: series.categories,
  seasons: Array.from(series.seasons.entries()).map(([num, eps]) => ({
    seasonNumber: num,
    episodeCount: eps.length,
    episodes: eps.map((e) => ({
      episodeNumber: e.series!.episode!,
      title: e.name,
      url: e.url,
      logo: e.tvg?.logo,
    })),
  })),
}));
```

### Example 2: Find Missing Episodes

```ts
function findMissingEpisodes(
  items: Entry[],
  seriesName: string,
  season: number,
): number[] {
  const episodes = getSeriesEpisodes(items, seriesName, season);

  if (episodes.length === 0) return [];

  const episodeNumbers = episodes
    .map((e) => e.series!.episode!)
    .sort((a, b) => a - b);

  const missing: number[] = [];
  const maxEpisode = episodeNumbers[episodeNumbers.length - 1];

  for (let i = 1; i <= maxEpisode; i++) {
    if (!episodeNumbers.includes(i)) {
      missing.push(i);
    }
  }

  return missing;
}

const missing = findMissingEpisodes(playlist.items, "Breaking Bad", 1);
console.log(`Missing episodes: ${missing.join(", ")}`);
```

### Example 3: Series with Most Episodes

```ts
const seriesGroups = aggregateSeries(playlist.items);

const sorted = seriesGroups
  .map((s) => ({
    name: s.seriesName,
    episodeCount: Array.from(s.seasons.values()).reduce(
      (sum, eps) => sum + eps.length,
      0,
    ),
  }))
  .sort((a, b) => b.episodeCount - a.episodeCount);

console.log("Top 10 series by episode count:");
sorted.slice(0, 10).forEach((s, i) => {
  console.log(`${i + 1}. ${s.name}: ${s.episodeCount} episodes`);
});
```

---

## Edge Cases Handled

### Multiple Formats in Same Playlist

```m3u
#EXTINF:-1,Breaking Bad S01E01
#EXTINF:-1,Breaking Bad Season 1 Episode 2
#EXTINF:-1,Breaking Bad 1x03
```

All three are recognized and aggregated together under "Breaking Bad".

### Series Names with Years

```m3u
#EXTINF:-1,The Office (US) (2005) S01E01
```

Year is removed, series name is "The Office (US)".

### Special Characters

```m3u
#EXTINF:-1,[HD]_Game-of-Thrones_S01E01
```

Brackets and dashes removed, series name is "HD Game of Thrones".

### Case Insensitivity

```m3u
#EXTINF:-1,breaking bad s01e01
#EXTINF:-1,BREAKING BAD S01E02
#EXTINF:-1,Breaking Bad S01E03
```

All aggregated under same series (case-normalized).

---

## Integration with Classification

Combine series extraction with media classification:

```ts
import {
  parsePlaylist,
  classifyEntries,
  enrichWithSeriesInfo,
  MediaKind,
} from "iptv-m3u-playlist-parser";

const playlist = parsePlaylist(m3uText);

// 1. Classify entries
classifyEntries(playlist.items, { locale: "en" });

// 2. Extract series info (only for entries classified as SERIES)
const seriesEntries = playlist.items.filter(
  (e) => e.kind === MediaKind.SERIES,
);
enrichWithSeriesInfo(seriesEntries);

// 3. Process
const withSeries = seriesEntries.filter((e) => e.series !== undefined);
console.log(
  `Found ${withSeries.length} series episodes out of ${playlist.items.length} total entries`,
);
```

---

## Performance

- **Pattern matching**: O(1) per entry (pre-compiled regex)
- **Aggregation**: O(n) where n = number of series entries
- **Memory**: Minimal overhead, only stores extracted metadata
- **Large playlists**: Tested with 100K+ entries

---

## Best Practices

1. **Always call `enrichWithSeriesInfo()` before aggregation**
2. **Combine with classification for better results**
3. **Use explicit `series` attribute when possible** for custom names
4. **Handle missing episodes gracefully** in UI
5. **Sort episodes** within each season for proper playback order

---

## Advanced: Manual Extraction

If you need more control:

```ts
import { extractSeasonEpisode, sanitizeSeriesName } from "iptv-m3u-playlist-parser";

const name = "Breaking Bad S02E05";

// Extract season/episode
const se = extractSeasonEpisode(name);
console.log(se); // { season: 2, episode: 5 }

// Clean series name
const cleanName = name.replace(/S\d{1,2}E\d{1,3}/i, "");
const seriesName = sanitizeSeriesName(cleanName);
console.log(seriesName); // "Breaking Bad"
```

---

**Related:** [Media Classification Guide](CLASSIFICATION.md)
