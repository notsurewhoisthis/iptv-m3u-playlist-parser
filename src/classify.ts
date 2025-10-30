/**
 * Media classification system for IPTV entries
 *
 * Implements a sophisticated 6-stage heuristic classifier inspired by
 * production-proven Diamond IPTV parser logic.
 */

import type { Entry, MediaKind, ClassificationOptions } from "./types.js";
import {
  normalizeText,
  getKeywords,
  containsKeywords,
  countKeywordMatches,
} from "./multilingual.js";
import { isSeriesEntry } from "./series.js";

/**
 * Default classification options
 */
const DEFAULT_OPTIONS: Required<ClassificationOptions> = {
  enableAutoClassification: true,
  locale: "en",
  customKeywords: {},
  conservativeHls: true,
};

/**
 * Classify entry into MediaKind (live/movie/series/radio)
 *
 * Uses a 6-stage heuristic system:
 * 1. Explicit type attributes (tvg-type, type)
 * 2. Group-title keyword analysis
 * 3. Name pattern detection
 * 4. URL path analysis
 * 5. HLS-specific logic
 * 6. Fallback detection
 *
 * @param entry - Entry to classify
 * @param options - Classification options
 * @returns MediaKind or undefined if cannot determine
 */
export function classifyEntry(
  entry: Entry,
  options: ClassificationOptions = {},
): MediaKind | undefined {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!opts.enableAutoClassification) {
    return undefined;
  }

  const locale = opts.locale;

  // Stage 1: Explicit type attributes
  const explicitType = classifyByExplicitType(entry);
  if (explicitType) return explicitType;

  // Stage 2: Group-title analysis (most reliable for IPTV)
  const groupType = classifyByGroup(entry, locale, opts.customKeywords);
  if (groupType) return groupType;

  // Stage 3: Name pattern detection
  const nameType = classifyByName(entry, locale);
  if (nameType) return nameType;

  // Stage 4: URL path analysis
  const urlType = classifyByUrl(entry);
  if (urlType) return urlType;

  // Stage 5: HLS-specific logic
  const hlsType = classifyByHls(entry, opts.conservativeHls);
  if (hlsType) return hlsType;

  // Stage 6: Fallback detection
  return classifyByFallback(entry);
}

/**
 * Stage 1: Check explicit type attributes
 */
function classifyByExplicitType(entry: Entry): MediaKind | undefined {
  const typeAttr =
    entry.attrs["tvg-type"] || entry.attrs.type || entry.attrs.tvg_type;

  if (!typeAttr) return undefined;

  const lower = typeAttr.toLowerCase();

  if (lower.includes("movie") || lower === "vod") {
    return "movie";
  }
  if (
    lower.includes("series") ||
    lower.includes("show") ||
    lower === "tv-show"
  ) {
    return "series";
  }
  if (lower === "live" || lower === "channel") {
    return "live";
  }
  if (lower === "radio" || lower === "audio") {
    return "radio";
  }

  return undefined;
}

/**
 * Stage 2: Analyze group-title with multilingual keywords
 */
function classifyByGroup(
  entry: Entry,
  locale: string,
  customKeywords: ClassificationOptions["customKeywords"],
): MediaKind | undefined {
  if (!entry.group || entry.group.length === 0) return undefined;

  // Combine all groups into single string for analysis
  const groupCombined = entry.group.join(" ");
  const normalized = normalizeText(groupCombined, locale);

  // Get keyword sets
  const seriesKeywords = [
    ...getKeywords("series", locale),
    ...(customKeywords?.series || []),
  ];
  const movieKeywords = [
    ...getKeywords("movie", locale),
    ...(customKeywords?.movie || []),
  ];
  const liveKeywords = [
    ...getKeywords("live", locale),
    ...(customKeywords?.live || []),
  ];
  const radioKeywords = [
    ...getKeywords("radio", locale),
    ...(customKeywords?.radio || []),
  ];
  const platformKeywords = getKeywords("platform", locale);

  // Radio detection (highest priority for groups)
  if (containsKeywords(normalized, radioKeywords, locale)) {
    return "radio";
  }

  // Count matches for each category
  const seriesScore = countKeywordMatches(normalized, seriesKeywords, locale);
  const movieScore = countKeywordMatches(normalized, movieKeywords, locale);
  const liveScore = countKeywordMatches(normalized, liveKeywords, locale);

  // Platform hints suggest VOD (series or movie)
  const hasPlatformHint = containsKeywords(
    normalized,
    platformKeywords,
    locale,
  );

  // Series detection
  if (seriesScore > 0 && seriesScore >= movieScore) {
    return "series";
  }

  // Movie detection
  if (movieScore > 0 && movieScore > liveScore) {
    return "movie";
  }

  // Platform hints without clear series/movie signals → assume movie
  if (hasPlatformHint && movieScore === 0 && seriesScore === 0) {
    return "movie";
  }

  // Live detection
  if (liveScore > 0) {
    return "live";
  }

  return undefined;
}

/**
 * Stage 3: Pattern detection in entry name
 */
function classifyByName(entry: Entry, locale: string): MediaKind | undefined {
  const name = entry.name;
  if (!name) return undefined;

  const normalized = normalizeText(name, locale);

  // Series pattern: S01E02 or similar
  if (isSeriesEntry(name)) {
    return "series";
  }

  // Season/Episode text patterns
  if (
    /\bseason\s*\d+/i.test(normalized) ||
    /\bepisode\s*\d+/i.test(normalized)
  ) {
    return "series";
  }

  // Year in parentheses suggests movie: "Inception (2010)"
  if (/\((19\d{2}|20\d{2})\)/.test(name)) {
    return "movie";
  }

  // Standalone year in name (common in European listings)
  // Only for specific locales to avoid false positives
  if (
    (locale === "de" || locale === "fr") &&
    /\b(19|20)\d{2}\b/.test(normalized)
  ) {
    return "movie";
  }

  return undefined;
}

/**
 * Stage 4: URL path analysis
 */
function classifyByUrl(entry: Entry): MediaKind | undefined {
  const url = entry.url;
  if (!url) return undefined;

  const lower = url.toLowerCase();

  // Live indicators
  if (lower.includes("/live/") || lower.includes("/channel/")) {
    return "live";
  }

  // Series indicators
  if (
    lower.includes("/series/") ||
    lower.includes("/tv/") ||
    lower.includes("/shows/") ||
    lower.includes("/seasons/") ||
    lower.includes("/episodes/")
  ) {
    return "series";
  }

  // Movie indicators
  if (lower.includes("/movie/") || lower.includes("/vod/")) {
    return "movie";
  }

  // File extensions suggest VOD
  if (lower.match(/\.(mp4|mkv|avi|mov|wmv|flv)(\?|$)/)) {
    return "movie";
  }

  return undefined;
}

/**
 * Stage 5: HLS-specific classification logic
 */
function classifyByHls(
  entry: Entry,
  conservative: boolean,
): MediaKind | undefined {
  const url = entry.url.toLowerCase();
  const isHls = url.includes(".m3u8") || url.includes(".m3u");

  if (!isHls) return undefined;

  // Check for strong VOD signals
  const hasVodPath =
    url.includes("/movie/") || url.includes("/vod/") || url.includes("/film");
  const hasFileExtension = url.match(/\.(mp4|mkv|avi)(\?|$)/);
  const hasDuration = entry.duration !== undefined && entry.duration > 0;

  const strongVodSignal = hasVodPath || hasFileExtension || hasDuration;

  if (strongVodSignal) {
    // Check if it's series based on path
    if (url.includes("/series/") || url.includes("/show/")) {
      return "series";
    }
    return "movie";
  }

  // Conservative mode: treat HLS as live unless strong VOD signals
  if (conservative) {
    // If has EPG ID, very likely live
    if (entry.tvg?.id) {
      return "live";
    }
    // Default HLS to live
    return "live";
  }

  return undefined;
}

/**
 * Stage 6: Fallback detection based on attributes
 */
function classifyByFallback(entry: Entry): MediaKind | undefined {
  // Catchup/timeshift attributes suggest live TV
  if (entry.attrs.catchup || entry.attrs.timeshift) {
    return "live";
  }

  // EPG ID strongly suggests live channel
  if (entry.tvg?.id) {
    return "live";
  }

  // Default to live (most common for IPTV)
  return "live";
}

/**
 * Classify all entries in a playlist
 *
 * Mutates entries by adding kind field
 *
 * @param entries - Array of entries to classify
 * @param options - Classification options
 * @returns Same array with kind field populated
 */
export function classifyEntries(
  entries: Entry[],
  options: ClassificationOptions = {},
): Entry[] {
  for (const entry of entries) {
    entry.kind = classifyEntry(entry, options);
  }
  return entries;
}

/**
 * Filter entries by media kind
 *
 * @param entries - Array of entries
 * @param kind - MediaKind to filter by
 * @returns Filtered entries
 */
export function filterByKind(entries: Entry[], kind: MediaKind): Entry[] {
  return entries.filter((e) => e.kind === kind);
}

/**
 * Get statistics about media kinds in playlist
 *
 * @param entries - Array of entries
 * @returns Object with counts per kind
 */
export function getKindStatistics(entries: Entry[]): Record<
  MediaKind | "unknown",
  number
> {
  const stats: Record<MediaKind | "unknown", number> = {
    live: 0,
    movie: 0,
    series: 0,
    radio: 0,
    unknown: 0,
  };

  for (const entry of entries) {
    if (entry.kind) {
      stats[entry.kind]++;
    } else {
      stats.unknown++;
    }
  }

  return stats;
}

/**
 * Check if entry URL is likely a placeholder logo
 *
 * @param url - Logo URL to check
 * @returns True if likely a placeholder
 */
export function isPlaceholderLogo(url: string): boolean {
  if (!url) return false;

  const lower = url.toLowerCase();
  const placeholderPatterns = [
    "default",
    "placeholder",
    "logo",
    "channel",
    "poster",
    "noimage",
    "no-image",
    "blank",
    "unknown",
    "missing",
    "dummy",
    "sample",
  ];

  return placeholderPatterns.some((pattern) => lower.includes(pattern));
}
