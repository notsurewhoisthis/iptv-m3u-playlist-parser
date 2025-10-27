/**
 * Playlist Type Detection
 * Smart detection to route between IPTV and HLS parsers
 */

import { parsePlaylist as parseIptvPlaylist } from "./parser.js";
import type { Playlist as IptvPlaylist } from "./types.js";
import { parseHlsPlaylist } from "./hls-parser.js";
import type { HlsPlaylist } from "./hls-types.js";
import { splitLines, stripBOM } from "./util.js";

/**
 * Playlist type identifier
 */
export type PlaylistFormat = "iptv" | "hls";

/**
 * Union type for parsed playlists
 */
export type ParsedPlaylist =
  | { format: "iptv"; playlist: IptvPlaylist }
  | { format: "hls"; playlist: HlsPlaylist };

/**
 * HLS-specific tags that indicate HLS format
 */
const HLS_SPECIFIC_TAGS = [
  "#EXT-X-VERSION",
  "#EXT-X-TARGETDURATION",
  "#EXT-X-MEDIA-SEQUENCE",
  "#EXT-X-DISCONTINUITY-SEQUENCE",
  "#EXT-X-PLAYLIST-TYPE",
  "#EXT-X-KEY",
  "#EXT-X-MAP",
  "#EXT-X-PROGRAM-DATE-TIME",
  "#EXT-X-DATERANGE",
  "#EXT-X-STREAM-INF",
  "#EXT-X-I-FRAME-STREAM-INF",
  "#EXT-X-MEDIA",
  "#EXT-X-SESSION-DATA",
  "#EXT-X-SESSION-KEY",
  "#EXT-X-BYTERANGE",
  "#EXT-X-DISCONTINUITY",
  "#EXT-X-ENDLIST",
  "#EXT-X-I-FRAMES-ONLY",
  "#EXT-X-INDEPENDENT-SEGMENTS",
  "#EXT-X-START",
  "#EXT-X-SERVER-CONTROL",
  "#EXT-X-PART-INF",
  "#EXT-X-RENDITION-REPORT",
  "#EXT-X-SKIP",
  "#EXT-X-PRELOAD-HINT",
];

/**
 * IPTV-specific tags that indicate IPTV format
 */
const IPTV_SPECIFIC_TAGS = [
  "tvg-id=",
  "tvg-name=",
  "tvg-logo=",
  "tvg-chno=",
  "group-title=",
  "#EXTGRP",
  "#EXTVLCOPT",
  "#KODIPROP",
  "catchup=",
  "catchup-source=",
  "timeshift=",
];

/**
 * Detect playlist format (IPTV or HLS)
 * @param text - Raw playlist text
 * @returns Playlist format identifier
 */
export function detectPlaylistType(text: string): PlaylistFormat {
  const lines = splitLines(stripBOM(text));

  let hlsScore = 0;
  let iptvScore = 0;

  // Check first 50 lines for performance
  const checkLines = lines.slice(0, Math.min(lines.length, 50));

  for (const line of checkLines) {
    const upperLine = line.trim().toUpperCase();

    // Check HLS tags
    for (const hlsTag of HLS_SPECIFIC_TAGS) {
      if (upperLine.startsWith(hlsTag)) {
        hlsScore += 10;
        break;
      }
    }

    // Check IPTV tags
    for (const iptvTag of IPTV_SPECIFIC_TAGS) {
      if (upperLine.includes(iptvTag.toUpperCase())) {
        iptvScore += 5;
        break;
      }
    }
  }

  // HLS playlists typically have more HLS-specific tags
  // Strong indicators: #EXT-X-VERSION, #EXT-X-TARGETDURATION, #EXT-X-STREAM-INF
  const hasVersion = checkLines.some((l) =>
    l.trim().toUpperCase().startsWith("#EXT-X-VERSION"),
  );
  const hasTargetDuration = checkLines.some((l) =>
    l.trim().toUpperCase().startsWith("#EXT-X-TARGETDURATION"),
  );
  const hasStreamInf = checkLines.some((l) =>
    l.trim().toUpperCase().startsWith("#EXT-X-STREAM-INF"),
  );

  if (hasVersion || hasTargetDuration || hasStreamInf) {
    hlsScore += 20;
  }

  // IPTV playlists typically have group-title or tvg- attributes
  const hasGroupTitle = checkLines.some((l) =>
    l.toLowerCase().includes("group-title="),
  );
  const hasTvgAttrs = checkLines.some(
    (l) =>
      l.toLowerCase().includes("tvg-id=") ||
      l.toLowerCase().includes("tvg-name=") ||
      l.toLowerCase().includes("tvg-logo="),
  );

  if (hasGroupTitle || hasTvgAttrs) {
    iptvScore += 15;
  }

  // Decision logic
  if (hlsScore > iptvScore) {
    return "hls";
  } else if (iptvScore > hlsScore) {
    return "iptv";
  }

  // Default to IPTV if scores are equal (backward compatibility)
  // Most generic M3U playlists are IPTV format
  return "iptv";
}

/**
 * Auto-detect and parse playlist
 * @param text - Raw playlist text
 * @returns Parsed playlist with format indicator
 */
export function parsePlaylistAuto(text: string): ParsedPlaylist {
  const format = detectPlaylistType(text);

  if (format === "hls") {
    return {
      format: "hls",
      playlist: parseHlsPlaylist(text),
    };
  } else {
    return {
      format: "iptv",
      playlist: parseIptvPlaylist(text),
    };
  }
}
