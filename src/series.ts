/**
 * Series extraction and aggregation utilities
 *
 * Extracts season/episode metadata from entry names and aggregates
 * series episodes for better organization.
 */

import type { Entry, SeriesInfo, SeriesGroup } from "./types.js";

/**
 * Regex patterns for season/episode detection
 * Ordered by specificity (most specific first)
 */
const SEASON_EPISODE_PATTERNS = [
  // S01E02, S1E2 format (most common)
  /\bS(\d{1,2})E(\d{1,3})\b/i,

  // Season 1 Episode 2, Season 01 Ep 02 format
  /season\s*(\d{1,2})\s*.{0,6}\s*ep(?:isode)?\s*(\d{1,3})/i,

  // 1x02 format (alternative)
  /\b(\d{1,2})x(\d{1,3})\b/i,
];

/**
 * Year in parentheses pattern for removal
 */
const YEAR_PATTERN = /\((19\d{2}|20\d{2})\)/g;

/**
 * Special characters to remove when sanitizing series names
 */
const SPECIAL_CHARS_PATTERN = /[\[\](){}\-_]/g;

/**
 * Extract season and episode numbers from entry name
 *
 * @param name - Entry name to parse
 * @returns Object with season and episode, or undefined if not found
 */
export function extractSeasonEpisode(
  name: string,
): { season: number; episode: number } | undefined {
  if (!name) return undefined;

  for (const pattern of SEASON_EPISODE_PATTERNS) {
    const match = pattern.exec(name);
    if (match) {
      const season = parseInt(match[1], 10);
      const episode = parseInt(match[2], 10);

      if (
        Number.isFinite(season) &&
        Number.isFinite(episode) &&
        season > 0 &&
        episode > 0
      ) {
        return { season, episode };
      }
    }
  }

  return undefined;
}

/**
 * Sanitize series name by removing years, special characters, and extra whitespace
 *
 * @param name - Raw series name
 * @returns Cleaned series name
 */
export function sanitizeSeriesName(name: string): string {
  if (!name) return "";

  let cleaned = name;

  // Remove year in parentheses: "Breaking Bad (2008)" → "Breaking Bad"
  cleaned = cleaned.replace(YEAR_PATTERN, "");

  // Remove special characters: "Breaking-Bad" → "Breaking Bad"
  cleaned = cleaned.replace(SPECIAL_CHARS_PATTERN, " ");

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Extract series information from entry
 *
 * Attempts to extract from:
 * 1. Explicit 'series' attribute
 * 2. 'tvg-name' attribute
 * 3. Entry name with sanitization
 *
 * @param entry - Entry to extract from
 * @returns SeriesInfo or undefined
 */
export function extractSeriesInfo(entry: Entry): SeriesInfo | undefined {
  // Try to extract season/episode first
  const seasonEpisode = extractSeasonEpisode(entry.name);
  if (!seasonEpisode) {
    // Not a series episode
    return undefined;
  }

  // Determine series name
  let seriesName: string | undefined;

  // 1. Check explicit 'series' attribute
  if (entry.attrs.series) {
    seriesName = entry.attrs.series;
  }
  // 2. Check tvg-name
  else if (entry.tvg?.name) {
    seriesName = entry.tvg.name;
  }
  // 3. Extract from entry name by removing season/episode info
  else {
    // Remove the season/episode pattern from name
    let nameWithoutEpisode = entry.name;
    for (const pattern of SEASON_EPISODE_PATTERNS) {
      nameWithoutEpisode = nameWithoutEpisode.replace(pattern, "");
    }
    seriesName = sanitizeSeriesName(nameWithoutEpisode);
  }

  if (!seriesName) return undefined;

  return {
    seriesName: sanitizeSeriesName(seriesName),
    season: seasonEpisode.season,
    episode: seasonEpisode.episode,
  };
}

/**
 * Aggregate playlist entries into series groups
 *
 * Groups episodes by series name and season, preserving:
 * - Provider order (earliest occurrence)
 * - Categories (union across episodes)
 * - All episode entries
 *
 * @param items - Playlist entries (should have series info extracted)
 * @returns Array of SeriesGroup objects
 */
export function aggregateSeries(items: Entry[]): SeriesGroup[] {
  const seriesMap = new Map<string, SeriesGroup>();

  for (const item of items) {
    if (!item.series?.seriesName) continue;

    const { seriesName, season } = item.series;
    const seasonNum = season ?? 0;

    // Get or create series group
    let group = seriesMap.get(seriesName);
    if (!group) {
      group = {
        seriesName,
        seasons: new Map<number, Entry[]>(),
        categories: [],
        firstProviderOrder: item.providerOrder,
      };
      seriesMap.set(seriesName, group);
    }

    // Update first provider order (prefer earliest)
    if (
      item.providerOrder !== undefined &&
      (group.firstProviderOrder === undefined ||
        item.providerOrder < group.firstProviderOrder)
    ) {
      group.firstProviderOrder = item.providerOrder;
    }

    // Add episode to season
    let seasonEntries = group.seasons.get(seasonNum);
    if (!seasonEntries) {
      seasonEntries = [];
      group.seasons.set(seasonNum, seasonEntries);
    }
    seasonEntries.push(item);

    // Merge categories (union)
    if (item.group) {
      for (const cat of item.group) {
        if (!group.categories.includes(cat)) {
          group.categories.push(cat);
        }
      }
    }
  }

  // Convert to array and sort by provider order
  const groups = Array.from(seriesMap.values());
  groups.sort((a, b) => {
    const orderA = a.firstProviderOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.firstProviderOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.seriesName.localeCompare(b.seriesName);
  });

  // Sort episodes within each season
  for (const group of groups) {
    for (const [_season, episodes] of group.seasons) {
      episodes.sort((a, b) => {
        const epA = a.series?.episode ?? 0;
        const epB = b.series?.episode ?? 0;
        return epA - epB;
      });
    }
  }

  return groups;
}

/**
 * Enrich playlist entries with series information
 *
 * Mutates entries by adding series field where detected
 *
 * @param items - Playlist entries to enrich
 * @returns Same array with series info added
 */
export function enrichWithSeriesInfo(items: Entry[]): Entry[] {
  for (const item of items) {
    const seriesInfo = extractSeriesInfo(item);
    if (seriesInfo) {
      item.series = seriesInfo;
    }
  }
  return items;
}

/**
 * Check if entry name matches series pattern
 *
 * @param name - Entry name to check
 * @returns True if entry appears to be a series episode
 */
export function isSeriesEntry(name: string): boolean {
  if (!name) return false;
  return SEASON_EPISODE_PATTERNS.some((pattern) => pattern.test(name));
}

/**
 * Filter playlist to only series entries
 *
 * @param items - Playlist entries
 * @returns Entries that appear to be series episodes
 */
export function filterSeriesEntries(items: Entry[]): Entry[] {
  return items.filter((item) => isSeriesEntry(item.name));
}

/**
 * Get all unique series names from playlist
 *
 * @param items - Playlist entries (should have series info)
 * @returns Array of unique series names
 */
export function getSeriesNames(items: Entry[]): string[] {
  const names = new Set<string>();
  for (const item of items) {
    if (item.series?.seriesName) {
      names.add(item.series.seriesName);
    }
  }
  return Array.from(names).sort();
}

/**
 * Get episodes for a specific series and season
 *
 * @param items - Playlist entries
 * @param seriesName - Series name to filter by
 * @param season - Season number (optional, returns all if omitted)
 * @returns Matching episodes sorted by episode number
 */
export function getSeriesEpisodes(
  items: Entry[],
  seriesName: string,
  season?: number,
): Entry[] {
  const filtered = items.filter((item) => {
    if (!item.series?.seriesName) return false;
    if (
      sanitizeSeriesName(item.series.seriesName) !==
      sanitizeSeriesName(seriesName)
    ) {
      return false;
    }
    if (season !== undefined && item.series.season !== season) {
      return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const seasonA = a.series?.season ?? 0;
    const seasonB = b.series?.season ?? 0;
    if (seasonA !== seasonB) return seasonA - seasonB;

    const epA = a.series?.episode ?? 0;
    const epB = b.series?.episode ?? 0;
    return epA - epB;
  });

  return filtered;
}
