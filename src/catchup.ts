/**
 * Catchup TV URL building for TiviMate-style time-shifted playback
 *
 * Supports 5 catchup types:
 * - default: Simple offset-based with template
 * - append: Append template to URL with variable substitution
 * - shift: Use template with ${} variables
 * - flussonic: Auto-generate archive URL pattern
 * - xtream (xc): Xtream Codes timeshift format
 *
 * Variable placeholders (13 total):
 * Curly brace format: {utc}, {start}, {end}, {duration}, {offset},
 *                     {Y}, {m}, {d}, {H}, {M}, {S}
 * Dollar-curly format: ${start}, ${end}, ${timestamp}, ${offset}, ${duration}
 */

import type { Entry, Playlist, CatchupInfo } from "./types.js";

/**
 * Parsed Xtream URL components
 */
interface XtreamUrlComponents {
  host: string;
  username: string;
  password: string;
  streamId: string;
}

/**
 * Variable replacement map for template substitution
 */
interface VariableMap {
  [key: string]: string;
}

// ============================================================================
// HELPER FUNCTIONS (Internal)
// ============================================================================

/**
 * Parse Xtream URL to extract username, password, stream_id
 *
 * Patterns supported:
 * - /username/password/stream_id
 * - /movie/username/password/stream_id
 * - /live/username/password/stream_id
 * - /series/username/password/stream_id
 *
 * @param url - Stream URL to parse
 * @returns Parsed components or undefined if invalid
 */
function parseXtreamUrl(url: string): XtreamUrlComponents | undefined {
  if (!url) return undefined;

  try {
    const urlObj = new URL(url);
    const host = `${urlObj.protocol}//${urlObj.host}`;
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    // Pattern: /username/password/stream_id (3 parts minimum)
    if (pathParts.length >= 3) {
      // Check if first part is a known category prefix
      const firstPart = pathParts[0].toLowerCase();
      const isCategory =
        firstPart === "live" ||
        firstPart === "movie" ||
        firstPart === "series" ||
        firstPart === "vod";

      if (isCategory && pathParts.length >= 4) {
        // Pattern: /category/username/password/stream_id
        return {
          host,
          username: pathParts[1],
          password: pathParts[2],
          streamId: pathParts[3].replace(/\.m3u8?$/i, ""),
        };
      } else {
        // Pattern: /username/password/stream_id
        return {
          host,
          username: pathParts[0],
          password: pathParts[1],
          streamId: pathParts[2].replace(/\.m3u8?$/i, ""),
        };
      }
    }
  } catch {
    // Invalid URL, return undefined
  }

  return undefined;
}

/**
 * Get base URL (everything before last /)
 *
 * @param url - Full URL
 * @returns Base URL without trailing slash
 */
function getBaseUrl(url: string): string {
  if (!url) return "";

  const lastSlashIndex = url.lastIndexOf("/");
  if (lastSlashIndex === -1) return url;

  return url.slice(0, lastSlashIndex);
}

/**
 * Normalize timestamp to Date object
 *
 * Accepts:
 * - Date object (returned as-is)
 * - Unix timestamp in milliseconds (> 10000000000)
 * - Unix timestamp in seconds (< 10000000000)
 *
 * @param input - Date or Unix timestamp
 * @returns Date object
 */
function normalizeDate(input: Date | number): Date {
  if (input instanceof Date) {
    return input;
  }

  if (typeof input === "number") {
    // If less than 10 billion, assume seconds; otherwise milliseconds
    const timestamp = input < 10000000000 ? input * 1000 : input;
    return new Date(timestamp);
  }

  // Fallback to current date
  return new Date();
}

/**
 * Pad number with leading zero if single digit
 *
 * @param num - Number to pad
 * @returns Zero-padded string
 */
function pad(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Build variable replacement map for template substitution
 *
 * @param start - Start date
 * @param end - End date
 * @returns Map of variable names to values
 */
function buildVariableMap(start: Date, end: Date): VariableMap {
  const now = new Date();
  const startUnix = Math.floor(start.getTime() / 1000);
  const endUnix = Math.floor(end.getTime() / 1000);
  const durationSeconds = endUnix - startUnix;
  const offsetSeconds = startUnix - Math.floor(now.getTime() / 1000); // Negative for past

  return {
    // Unix timestamps
    utc: startUnix.toString(),
    start: startUnix.toString(),
    timestamp: startUnix.toString(), // Alias for start
    end: endUnix.toString(),

    // Duration and offset
    duration: durationSeconds.toString(),
    offset: offsetSeconds.toString(),

    // Date/time components (from start date)
    Y: start.getFullYear().toString(),
    m: pad(start.getMonth() + 1),
    d: pad(start.getDate()),
    H: pad(start.getHours()),
    M: pad(start.getMinutes()),
    S: pad(start.getSeconds()),
  };
}

/**
 * Substitute all variables in template
 *
 * Handles both {var} and ${var} formats
 *
 * @param template - Template string with placeholders
 * @param start - Start date
 * @param end - End date
 * @returns String with all variables replaced
 */
function substituteVariables(
  template: string,
  start: Date,
  end: Date,
): string {
  if (!template) return "";

  const varMap = buildVariableMap(start, end);
  let result = template;

  // Replace all placeholders
  // Handle both {var} and ${var} formats
  for (const [key, value] of Object.entries(varMap)) {
    // Replace {key}
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    // Replace ${key}
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
  }

  return result;
}

// ============================================================================
// TYPE-SPECIFIC BUILDERS (Internal)
// ============================================================================

/**
 * Build catchup URL for "default" type
 *
 * Default pattern: append source template to base URL (or use default template)
 * Default template if none provided: "?utc={utc}&duration={duration}"
 *
 * @param url - Original stream URL
 * @param start - Start date
 * @param end - End date
 * @param source - Optional catchup-source template
 * @returns Catchup URL
 */
function buildDefaultCatchup(
  url: string,
  start: Date,
  end: Date,
  source?: string,
): string {
  const template = source || "?utc={utc}&duration={duration}";
  const substituted = substituteVariables(template, start, end);

  // If template starts with ? or &, append to URL; otherwise replace
  if (substituted.startsWith("?") || substituted.startsWith("&")) {
    return url + substituted;
  }

  return substituted;
}

/**
 * Build catchup URL for "append" type
 *
 * Append pattern: append source template with variable substitution to URL
 *
 * @param url - Original stream URL
 * @param start - Start date
 * @param end - End date
 * @param source - Catchup-source template (required)
 * @returns Catchup URL or original URL if no source
 */
function buildAppendCatchup(
  url: string,
  start: Date,
  end: Date,
  source: string,
): string {
  if (!source) return url;

  const substituted = substituteVariables(source, start, end);
  return url + substituted;
}

/**
 * Build catchup URL for "shift" type
 *
 * Shift pattern: replace URL with source template (with ${} variable substitution)
 *
 * @param url - Original stream URL (unused for shift)
 * @param start - Start date
 * @param end - End date
 * @param source - Catchup-source template (required)
 * @returns Catchup URL or empty string if no source
 */
function buildShiftCatchup(
  url: string,
  start: Date,
  end: Date,
  source: string,
): string {
  if (!source) return "";

  return substituteVariables(source, start, end);
}

/**
 * Build catchup URL for "flussonic" type
 *
 * Flussonic pattern: {baseUrl}/archive-{utc}-{duration}.m3u8
 * (auto-generates archive URL from stream URL)
 *
 * @param url - Original stream URL
 * @param start - Start date
 * @param end - End date
 * @param source - Optional template override
 * @returns Catchup URL
 */
function buildFlussonicCatchup(
  url: string,
  start: Date,
  end: Date,
  source?: string,
): string {
  if (source) {
    // Use custom template if provided
    return substituteVariables(source, start, end);
  }

  // Auto-generate Flussonic archive URL
  const baseUrl = getBaseUrl(url);
  const utc = Math.floor(start.getTime() / 1000);
  const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

  return `${baseUrl}/archive-${utc}-${duration}.m3u8`;
}

/**
 * Build catchup URL for "xtream" (xc) type
 *
 * Xtream pattern: {host}/timeshift/{username}/{password}/{duration}/{start}/{streamId}.m3u8
 *
 * @param url - Original stream URL (must be Xtream format)
 * @param start - Start date
 * @param end - End date
 * @returns Catchup URL or undefined if cannot parse
 */
function buildXtreamCatchup(
  url: string,
  start: Date,
  end: Date,
): string | undefined {
  const parsed = parseXtreamUrl(url);
  if (!parsed) return undefined;

  const utc = Math.floor(start.getTime() / 1000);
  const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

  return `${parsed.host}/timeshift/${parsed.username}/${parsed.password}/${duration}/${utc}/${parsed.streamId}.m3u8`;
}

// ============================================================================
// MAIN EXPORTED FUNCTIONS
// ============================================================================

/**
 * Extract catchup info from entry and playlist (fallback hierarchy)
 *
 * Priority order:
 * 1. Entry-level catchup attributes (highest priority)
 * 2. Playlist header catchup attributes (fallback)
 *
 * @param entry - Playlist entry
 * @param playlist - Optional playlist for header fallback
 * @returns CatchupInfo object or undefined if no catchup configured
 */
export function extractCatchupInfo(
  entry: Entry,
  playlist?: Playlist,
): CatchupInfo | undefined {
  // Extract catchup type (entry > header)
  const type =
    entry.attrs["catchup"] ||
    entry.attrs["tvg-catchup"] ||
    playlist?.header.catchup;

  if (!type) return undefined;

  // Extract catchup source (entry > header)
  const source =
    entry.attrs["catchup-source"] ||
    entry.attrs["tvg-catchup-source"] ||
    playlist?.header.catchupSource;

  // Extract catchup days (entry > header)
  const daysStr =
    entry.attrs["catchup-days"] ||
    entry.attrs["tvg-catchup-days"] ||
    (playlist?.header.catchupDays != null
      ? playlist.header.catchupDays.toString()
      : undefined);
  const days = daysStr != null ? parseInt(daysStr, 10) : undefined;

  // Extract catchup hours (entry > header)
  const hoursStr =
    entry.attrs["catchup-hours"] ||
    entry.attrs["tvg-catchup-hours"] ||
    (playlist?.header.catchupHours != null
      ? playlist.header.catchupHours.toString()
      : undefined);
  const hours = hoursStr != null ? parseInt(hoursStr, 10) : undefined;

  return {
    type: type.toLowerCase(),
    source,
    days: Number.isFinite(days) && days! > 0 ? days : undefined,
    hours: Number.isFinite(hours) && hours! > 0 ? hours : undefined,
  };
}

/**
 * Check if entry has catchup support
 *
 * @param entry - Playlist entry
 * @param playlist - Optional playlist for header fallback
 * @returns True if catchup is configured
 */
export function hasCatchup(entry: Entry, playlist?: Playlist): boolean {
  const info = extractCatchupInfo(entry, playlist);
  return info != null;
}

/**
 * Build catchup URL from entry, start time, and end time
 *
 * @param entry - Playlist entry
 * @param start - Start time (Date or Unix timestamp in ms/seconds)
 * @param end - End time (Date or Unix timestamp in ms/seconds)
 * @param playlist - Optional playlist for header fallback
 * @returns Catchup URL or undefined if cannot build
 */
export function buildCatchupUrl(
  entry: Entry,
  start: Date | number,
  end: Date | number,
  playlist?: Playlist,
): string | undefined {
  // Extract catchup configuration
  const info = extractCatchupInfo(entry, playlist);
  if (!info) return undefined;

  // Normalize dates
  const startDate = normalizeDate(start);
  const endDate = normalizeDate(end);

  // Validate date range
  if (startDate >= endDate) return undefined;

  const { type, source } = info;
  const url = entry.url;

  // Route to type-specific builder
  switch (type) {
    case "default":
      return buildDefaultCatchup(url, startDate, endDate, source);

    case "append":
      if (!source) return undefined; // Append requires source
      return buildAppendCatchup(url, startDate, endDate, source);

    case "shift":
      if (!source) return undefined; // Shift requires source
      return buildShiftCatchup(url, startDate, endDate, source);

    case "flussonic":
      return buildFlussonicCatchup(url, startDate, endDate, source);

    case "xc":
    case "xtream":
    case "xtream-codes":
      return buildXtreamCatchup(url, startDate, endDate);

    default:
      // Try to auto-detect from URL pattern
      if (parseXtreamUrl(url)) {
        return buildXtreamCatchup(url, startDate, endDate);
      }
      // Fallback to default behavior
      return buildDefaultCatchup(url, startDate, endDate, source);
  }
}

/**
 * Get catchup time window (start/end dates based on catchup-days or catchup-hours)
 *
 * Returns the available catchup window based on configured retention period
 *
 * @param entry - Playlist entry
 * @param playlist - Optional playlist for header fallback
 * @returns Object with start and end dates, or undefined if no window configured
 */
export function getCatchupWindow(
  entry: Entry,
  playlist?: Playlist,
): { start: Date; end: Date } | undefined {
  const info = extractCatchupInfo(entry, playlist);
  if (!info) return undefined;

  const now = new Date();
  const { days, hours } = info;

  // Calculate window start based on days or hours
  let windowMs = 0;
  if (days != null && days > 0) {
    windowMs = days * 24 * 60 * 60 * 1000;
  } else if (hours != null && hours > 0) {
    windowMs = hours * 60 * 60 * 1000;
  } else {
    // No window configured
    return undefined;
  }

  const start = new Date(now.getTime() - windowMs);
  return { start, end: now };
}

/**
 * Enrich all entries with catchup info
 *
 * Populates the `catchup` field on each entry with extracted configuration
 *
 * @param playlist - Playlist to enrich
 * @returns Modified playlist with catchup info on entries
 */
export function enrichWithCatchup(playlist: Playlist): Playlist {
  for (const entry of playlist.items) {
    const info = extractCatchupInfo(entry, playlist);
    if (info) {
      entry.catchup = info;
    }
  }
  return playlist;
}

/**
 * Filter entries that have catchup support
 *
 * @param playlist - Playlist to filter
 * @returns Array of entries with catchup support
 */
export function filterCatchupEntries(playlist: Playlist): Entry[] {
  return playlist.items.filter((entry) => hasCatchup(entry, playlist));
}

// ============================================================================
// USAGE EXAMPLE (commented out)
// ============================================================================

/*
import { parsePlaylist } from "./parser.js";
import { buildCatchupUrl, getCatchupWindow, filterCatchupEntries } from "./catchup.js";

// Parse playlist
const m3uContent = `#EXTM3U catchup="default" catchup-days="7"
#EXTINF:-1 tvg-id="channel1",Channel 1
http://example.com/channel1.m3u8`;

const playlist = parsePlaylist(m3uContent);

// Filter entries with catchup
const catchupEntries = filterCatchupEntries(playlist);
console.log(`Found ${catchupEntries.length} entries with catchup support`);

// Build catchup URL for watching 2 hours ago
const entry = catchupEntries[0];
const now = new Date();
const start = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min duration

const catchupUrl = buildCatchupUrl(entry, start, end, playlist);
console.log(`Catchup URL: ${catchupUrl}`);

// Get available catchup window
const window = getCatchupWindow(entry, playlist);
if (window) {
  console.log(`Catchup available from ${window.start} to ${window.end}`);
}

// Example with different catchup types:

// 1. Default type
#EXTINF:-1 catchup="default" catchup-source="?utc={utc}&duration={duration}",Channel
http://example.com/live.m3u8
// Result: http://example.com/live.m3u8?utc=1234567890&duration=3600

// 2. Append type
#EXTINF:-1 catchup="append" catchup-source="&utc={utc}&duration={duration}",Channel
http://example.com/live.m3u8?token=abc
// Result: http://example.com/live.m3u8?token=abc&utc=1234567890&duration=3600

// 3. Shift type
#EXTINF:-1 catchup="shift" catchup-source="http://archive.com/archive?start=${start}&end=${end}",Channel
http://example.com/live.m3u8
// Result: http://archive.com/archive?start=1234567890&end=1234571490

// 4. Flussonic type
#EXTINF:-1 catchup="flussonic",Channel
http://example.com/channel/index.m3u8
// Result: http://example.com/channel/archive-1234567890-3600.m3u8

// 5. Xtream type
#EXTINF:-1 catchup="xc",Channel
http://example.com/live/username/password/12345.m3u8
// Result: http://example.com/timeshift/username/password/3600/1234567890/12345.m3u8
*/
