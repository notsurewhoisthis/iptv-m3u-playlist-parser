IPTV Parser

The modern, batteries-included toolkit for parsing, normalizing, and enriching IPTV playlists.

Why this exists
- IPTV playlists in the wild are messy: different providers, different conventions, and plenty of edge cases. Building a reliable player means writing lots of glue code… for every project… over and over.
- IPTV Parser gives you a proven, well-documented, and thoroughly-tested foundation you can drop into any app. Less glue. Fewer surprises. Faster to “it just works”.

What makes it different
- Purpose-built for IPTV: Not just a generic M3U parser. Understands IPTV-specific attributes (`tvg-*`, `group-title`), auxiliary tags (`#EXTGRP`, `#EXTVLCOPT`, `#KODIPROP`), and catch‑up conventions.
- Normalization that saves you hours: Unifies common aliases (`tvg_id`→`tvg-id`, `group_title`→`group-title`, etc.), merges group sources, and prefers clean names.
- Predictable output: Clear TypeScript types, warnings for suspicious lines, and preservation of unknown attributes so nothing is lost.
- Extensible “beyond-the-file” toolkit: First-class helpers for Xtream URLs, XMLTV (EPG) parsing, and one‑line EPG enrichment into your playlist items.
- Production ready: CI across Node 18/20/22, focused test suite, and deliberate docs you can trust.

Highlights
- M3U/M3U8 extended header parsing: `url-tvg`, `tvg-shift`, global `catchup*`, `timeshift`, playlist-level `user-agent`.
- Entries: `#EXTINF` with duration, IPTV attributes (`tvg-id`, `tvg-name`, `tvg-logo`, `group-title`), robust name handling.
- Aux tags: `#EXTGRP` groups, `#EXTVLCOPT:*` (UA/referrer/cookie/headers), `#KODIPROP:*` captured and merged.
- Normalization: Resolves aliases, unifies groups, preserves unknowns in `attrs` and flags duplicates.
- Xtream utilities: Detect/parse endpoints, build M3U downloads and common catch‑up URLs.
- EPG (XMLTV): Parse channels + programmes, bind playlist items, and enrich with categories/icon in one call.
- Designed for huge playlists: String-based, zero I/O, no network until you ask for it.

Install
```
npm i iptv-m3u-playlist-parser
```

Quick Start (Library)
```ts
import { parsePlaylist } from 'iptv-m3u-playlist-parser';
import { readFileSync } from 'node:fs';

const text = readFileSync('playlist.m3u', 'utf8');
const result = parsePlaylist(text);

console.log(result.header.tvgUrls);
for (const ch of result.items) {
  console.log(ch.name, ch.tvg?.id, ch.group?.[0], ch.url);
}
```

CLI
```
npx iptv-parse playlist.m3u > channels.json
```

What It Parses
- Header: `#EXTM3U` with optional attributes (e.g. `url-tvg`, `tvg-shift`, `catchup`, `catchup-source`, `catchup-hours`, `catchup-days`, `timeshift`).
- Entry: `#EXTINF:<duration> <kv-attrs>,<display-name>` followed by the media URL.
- Groups: `group-title` attribute and/or `#EXTGRP:Name` lines.
- Player options: lines `#EXTVLCOPT:key=value` and `#KODIPROP:key=value` before the URL; merged into `entry.http` and `entry.kodiProps`.

Xtream Helpers
- Detect and parse Xtream URLs (`get.php`, `player_api.php`).
- Build M3U download URLs and common timeshift (catchup) URLs.

EPG Enrichment
- parseXmltv + parseXmltvPrograms to ingest XMLTV.
- enrichPlaylistWithEpg(playlist, channels, programs, { topNCategories, attachIconIfMissing }) attaches:
  - extras.epg: { channelId, iconUrl, categories[] }
  - tvg.logo from EPG icon if missing and attachIconIfMissing is true (default).

60‑second recipes
- Load a remote playlist with custom UA/Referrer
```ts
import { loadPlaylistFromUrl, normalizePlaylist } from 'iptv-m3u-playlist-parser';

const pl = normalizePlaylist(
  await loadPlaylistFromUrl('https://example.com/playlist.m3u', {
    userAgent: 'MyPlayer/1.0',
    referer: 'https://example.com',
  })
);
```

- Enrich with EPG (channels + programmes → categories + icon)
```ts
import { parseXmltv, parseXmltvPrograms, enrichPlaylistWithEpg } from 'iptv-m3u-playlist-parser';

const xml = await fetch('https://example.com/epg.xml').then(r => r.text());
const { channels } = parseXmltv(xml);
const { programs } = parseXmltvPrograms(xml);
const enriched = enrichPlaylistWithEpg(pl, channels, programs, { topNCategories: 5 });
```

- Work with Xtream
```ts
import { isXtreamUrl, parseXtream, makeXtreamCredentials, buildXtreamM3uUrl } from 'iptv-m3u-playlist-parser';

const info = parseXtream('http://host/get.php?username=u&password=p&type=m3u&output=ts');
const creds = makeXtreamCredentials(info!.host, info!.username, info!.password);
const m3uUrl = buildXtreamM3uUrl(creds, { type: 'm3u', output: 'ts' });
```

Typed Output (simplified)
```ts
interface PlaylistHeader {
  tvgUrls: string[];
  tvgShift?: number; // minutes
  userAgent?: string;
  catchup?: string;
  catchupSource?: string;
  catchupHours?: number;
  catchupDays?: number;
  timeshift?: number; // hours
  rawAttrs: Record<string, string>;
}

interface Entry {
  name: string;
  url: string;
  duration?: number; // seconds
  group?: string[];
  tvg?: { id?: string; name?: string; logo?: string; chno?: string };
  http?: { userAgent?: string; referer?: string; cookie?: string; headers?: Record<string, string> };
  kodiProps?: Record<string, string>;
  attrs: Record<string, string>; // all parsed attributes
  extras?: Record<string, unknown>; // future-proof
}

interface Playlist {
  header: PlaylistHeader;
  items: Entry[];
  warnings: string[];
}
```

Docs
- See docs/PLAYLIST_RULES.md for exact parsing rules and edge cases.
- See docs/XTREAM.md for Xtream URL formats and helpers.
- See docs/EPG.md for XMLTV parsing, binding, and programme categories.

Status
- Early version, stable API planned for 1.0. Contributions welcome.

Project philosophy
- Be precise: clearly define parsing behavior and keep the output shape stable.
- Be forgiving: accept the weirdness of real‑world playlists and keep going with warnings.
- Be pragmatic: expose small, composable helpers rather than heavy frameworks.

Roadmap
- More provider-specific attribute aliases and normalizations
- Optional streaming parser for extremely large files
- Built-in filters for deduplication/grouping
- Richer EPG programme queries (by time window, now/next, etc.)

Contributing
- PRs are welcome. Please run `npm run build` and `npm test` before opening a PR.
- If you’re proposing a parsing change, include a failing test and a short note in docs/PLAYLIST_RULES.md.
