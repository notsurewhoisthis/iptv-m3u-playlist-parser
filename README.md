IPTV Parser

Robust, zero-dependency parser for IPTV playlists (M3U/M3U8) that understands IPTV-specific tags and conventions used across providers and players.

Highlights
- M3U extended header parsing: `url-tvg`, `tvg-shift`, global `catchup*`.
- Channel entries with attributes: `tvg-id`, `tvg-name`, `tvg-logo`, `group-title`, duration, name.
- Auxiliary tags: `#EXTGRP`, `#EXTVLCOPT:*`, `#KODIPROP:*` aggregated per entry.
- Catch-up metadata: `catchup`, `catchup-source`, `catchup-hours`/`catchup-days`, `timeshift`.
- HTTP hints: user-agent, referer, cookies, arbitrary headers via VLC options.
- Normalizes encodings, line endings, BOM, and whitespace; resilient to malformed lines.
- Clear TypeScript types and small, composable API; handy CLI that outputs JSON.

Install
```
npm i iptv-parser
```

Quick Start (Library)
```ts
import { parsePlaylist } from 'iptv-parser';
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

Typed Output (simplified)
```ts
interface PlaylistHeader {
  tvgUrls: string[];
  tvgShift?: number; // minutes
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

Status
- Early version, stable API planned for 1.0. Contributions welcome.
