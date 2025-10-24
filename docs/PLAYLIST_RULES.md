IPTV Playlist Parsing Rules

This document describes precisely how this parser interprets IPTV playlists (M3U/M3U8) and common IPTV-specific conventions.

File-Level Header
- First non-empty line should be `#EXTM3U`.
- Attributes on `#EXTM3U` are parsed as space-delimited `key="value"` tokens. Supported keys (case-insensitive):
  - `url-tvg`: One or more EPG XMLTV URLs, separated by commas or semicolons. Stored as `header.tvgUrls`.
  - `tvg-shift`: Number of hours to shift EPG. Stored as minutes in `header.tvgShift` (hours × 60).
  - `user-agent` or `http-user-agent`: Default UA applied to all entries as `entry.http.userAgent` unless overridden via `#EXTVLCOPT`.
  - `catchup`, `catchup-source`, `catchup-hours`, `catchup-days`, `timeshift`.
  - Unknown attributes preserved in `header.rawAttrs`.

Channel Entries
- Each entry begins with `#EXTINF:<duration> <attrs>,<display-name>`.
  - `<duration>` may be `-1`, integer seconds or float. We store seconds (integer) when possible.
  - `<attrs>` are zero or more space-delimited `key="value"` tokens. Quoted or unquoted values supported; quotes can be single or double. Escaped quotes inside values are unescaped.
  - `<display-name>` becomes `entry.name` (trimmed). If empty, parser falls back to name hints from attributes.
- The next non-comment, non-empty line after `#EXTINF` is treated as the media URL (`entry.url`).

Recognized Attributes (case-insensitive)
- EPG: `tvg-id`, `tvg-name`, `tvg-logo`, `tvg-chno`.
- Grouping: `group-title` (may contain `;` to indicate multiple groups). Also supports `#EXTGRP:Group Name` lines appended between `#EXTINF` and URL.
- Catch-up/time-shift: `catchup`, `catchup-source`, `catchup-hours`, `catchup-days`, `timeshift`.
- Misc: `radio`, `type`, `channel-id`, `provider` are preserved if present.

Aliases Normalization
- Keys are normalized to lower-case. Common aliases resolved:
  - `tvg_id` → `tvg-id`, `tvg_name` → `tvg-name`, `tvg_logo` → `tvg-logo`, `group_title`/`group` → `group-title`, `logo` → `tvg-logo`, `channel-id` → `tvg-id`.

Player/Client Options
- VLC: Any `#EXTVLCOPT:key=value` lines between `#EXTINF` and URL are recorded into `entry.http` or raw options:
  - `http-user-agent` -> `entry.http.userAgent`
  - `http-referrer` -> `entry.http.referer`
  - `http-cookie` -> `entry.http.cookie`
  - `http-header=<Name>: <Value>` -> merged into `entry.http.headers[Name]`
  - Unrecognized VLC options preserved under `entry.attrs` with `vlcopt:key` keys.
- Kodi: Any `#KODIPROP:key=value` lines are captured as `entry.kodiProps[key]`.

Line Handling & Encoding
- Accepts LF and CRLF line endings.
- UTF-8 with or without BOM preferred; if a BOM is present it is ignored.
- Trims trailing spaces; ignores standalone comments that do not affect entries.

Fault Tolerance
- Unknown/extra attributes are retained in `entry.attrs`.
- Missing URL after `#EXTINF` yields a warning; entry is skipped.
- Malformed `key=value` tokens (no `=`) become `key=true` in `attrs`.
- Duplicate keys: last one wins; previous values are not discarded, but a warning is added.

Merging and Groups
- If both `group-title` and one or more `#EXTGRP` lines exist, the union is used; duplicates removed.
- Semicolons (`;`) in `group-title` split multiple groups.

Normalization
- The parser normalizes common variants: `tvg-id` vs `tvg_id`, `group-title` vs `group_title`, etc.
- Attribute keys are lower-cased in outputs; original case is not preserved.

Known Non-Goals
- This library does not fetch or parse EPG XMLTV content; it only captures references (`url-tvg`).
- It does not validate URLs or probe streams. Clients should validate before playback.

Examples
See `examples/` for annotated playlists and outputs.
