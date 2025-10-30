import { Entry, Playlist, EpgProgram, EpgCoverage } from "./types.js";

/**
 * Electronic Program Guide (EPG) integration helpers for IPTV playlists
 *
 * This module provides utilities to:
 * - Extract EPG IDs (tvg-id) from playlist entries
 * - Link EPG data to playlist entries
 * - Calculate EPG coverage statistics
 * - Find current/specific programs by time
 * - Support multiple EPG data formats (Record, TvgData, JSON APIs)
 *
 * @module epg
 * @example
 * ```typescript
 * import { parsePlaylist } from './parser.js';
 * import { extractEpgIds, linkEpgData, validateEpgCoverage } from './epg.js';
 *
 * const playlist = parsePlaylist(m3uContent);
 * const epgIds = extractEpgIds(playlist);
 * console.log('Channels requiring EPG:', epgIds);
 *
 * // Link EPG data
 * const epgData = { 'channel1': [{ ... }] };
 * const enriched = linkEpgData(playlist, epgData);
 *
 * // Check coverage
 * const coverage = validateEpgCoverage(playlist, epgData);
 * console.log(`EPG coverage: ${coverage.coveragePercent}%`);
 * ```
 */

// ============================================================================
// Internal Helper Functions
// ============================================================================

/**
 * Extract tvg-id from entry
 * Checks entry.tvg?.id first, then falls back to entry.attrs['tvg-id']
 *
 * @param entry - Playlist entry to extract tvg-id from
 * @returns tvg-id string or undefined if not present
 * @internal
 */
function getTvgId(entry: Entry): string | undefined {
  // Check structured tvg object first
  if (entry.tvg?.id) {
    return entry.tvg.id;
  }

  // Fallback to raw attributes
  const tvgId = entry.attrs["tvg-id"];
  if (tvgId && typeof tvgId === "string" && tvgId.trim()) {
    return tvgId.trim();
  }

  return undefined;
}

/**
 * Check if program is active at given time
 * Returns true if start <= time < stop
 *
 * @param program - EPG program to check
 * @param time - Time to check (Date object)
 * @returns true if program is active at given time
 * @internal
 */
function isProgramActive(program: EpgProgram, time: Date): boolean {
  // Validate Date objects
  if (
    !program.start ||
    !program.stop ||
    isNaN(program.start.getTime()) ||
    isNaN(program.stop.getTime())
  ) {
    return false;
  }

  // Check if time falls within program range [start, stop)
  return program.start <= time && time < program.stop;
}

/**
 * Sort programmes by start time (ascending)
 * Returns new sorted array without mutating original
 *
 * @param programmes - Array of EPG programs to sort
 * @returns New array sorted by start time
 * @internal
 */
function sortProgrammes(programmes: EpgProgram[]): EpgProgram[] {
  return [...programmes].sort((a, b) => {
    // Handle invalid dates
    const aTime = a.start?.getTime();
    const bTime = b.start?.getTime();

    if (aTime == null || isNaN(aTime)) return 1;
    if (bTime == null || isNaN(bTime)) return -1;

    return aTime - bTime;
  });
}

/**
 * Convert TvgProgramme (from xmltv.ts) to EpgProgram format
 * Handles field name differences and date conversion
 *
 * @param prog - Programme object in TvgProgramme or similar format
 * @returns Normalized EpgProgram object
 * @internal
 */
function convertTvgProgramme(prog: any): EpgProgram {
  // If already in EpgProgram format (has Date objects), return as-is
  if (prog.start instanceof Date && prog.stop instanceof Date) {
    return prog as EpgProgram;
  }

  // Handle Unix timestamps (seconds)
  const parseTime = (time: any): Date => {
    if (time instanceof Date) return time;
    if (typeof time === "number") {
      // Assume Unix timestamp in seconds
      return new Date(time * 1000);
    }
    if (typeof time === "string") {
      return new Date(time);
    }
    // Fallback to current time
    return new Date();
  };

  // Convert from TvgProgramme format
  return {
    channel: prog.channel || prog.channelId || "",
    title: prog.title || "",
    start: parseTime(prog.start),
    stop: parseTime(prog.stop),
    description: prog.desc || prog.description,
    category: prog.categories || prog.category,
    icon: prog.icon,
  };
}

/**
 * Group programmes by channel ID
 * Used when input is array of programmes instead of pre-grouped structure
 *
 * @param programmes - Array of programme objects
 * @returns Map of channel ID to programmes array
 * @internal
 */
function groupProgrammesByChannel(programmes: any[]): Map<string, EpgProgram[]> {
  const map = new Map<string, EpgProgram[]>();

  for (const prog of programmes) {
    // Get channel ID (handle both 'channel' and 'channelId' fields)
    const channelId = prog.channel || prog.channelId;
    if (!channelId || typeof channelId !== "string") {
      continue;
    }

    // Convert to EpgProgram format if needed
    const epgProg = convertTvgProgramme(prog);

    // Add to map
    if (!map.has(channelId)) {
      map.set(channelId, []);
    }
    map.get(channelId)!.push(epgProg);
  }

  return map;
}

/**
 * Normalize EPG data to Map<string, EpgProgram[]>
 * Handles multiple input formats:
 * - Map<string, EpgProgram[]> - Used as-is
 * - Record<string, EpgProgram[]> - Converted to Map
 * - TvgData format { channels: [], programmes: [] } - Grouped by channel
 * - Custom objects - Best-effort conversion
 *
 * @param data - EPG data in any supported format
 * @returns Normalized Map of channel ID to programmes
 * @internal
 */
function normalizeEpgData(data: any): Map<string, EpgProgram[]> {
  // Handle null/undefined
  if (data == null) {
    return new Map();
  }

  // Already a Map - use as-is
  if (data instanceof Map) {
    return data;
  }

  // TvgData format (from xmltv.ts): { channels: [], programmes: [] }
  if (data && data.programmes && Array.isArray(data.programmes)) {
    return groupProgrammesByChannel(data.programmes);
  }

  // Array of programmes - group by channel
  if (Array.isArray(data)) {
    return groupProgrammesByChannel(data);
  }

  // Record<string, EpgProgram[]> or plain object
  if (typeof data === "object" && !Array.isArray(data)) {
    const map = new Map<string, EpgProgram[]>();
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        // Convert each program to ensure correct format
        const programs = value.map((prog) => convertTvgProgramme(prog));
        map.set(key, programs);
      }
    }
    return map;
  }

  // Empty fallback for unsupported formats
  return new Map();
}

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Extract unique EPG IDs (tvg-id) from playlist entries
 *
 * Scans all playlist entries and collects unique tvg-id values.
 * Checks both entry.tvg?.id and entry.attrs['tvg-id'].
 * Returns deduplicated array of IDs.
 *
 * @param playlist - Parsed IPTV playlist
 * @returns Array of unique tvg-id strings found in playlist
 *
 * @example
 * ```typescript
 * const playlist = parsePlaylist(m3uContent);
 * const epgIds = extractEpgIds(playlist);
 * console.log('Found EPG IDs:', epgIds);
 * // ['channel1', 'channel2', 'channel3']
 * ```
 */
export function extractEpgIds(playlist: Playlist): string[] {
  const ids = new Set<string>();

  for (const entry of playlist.items) {
    const tvgId = getTvgId(entry);
    if (tvgId) {
      ids.add(tvgId);
    }
  }

  return Array.from(ids);
}

/**
 * Link EPG data to playlist entries by tvg-id
 *
 * Accepts multiple EPG data formats:
 * - Record<string, EpgProgram[]> - Object mapping channel IDs to programmes
 * - Map<string, EpgProgram[]> - Map structure
 * - TvgData { channels: [], programmes: [] } - XMLTV parser format
 * - Custom formats with automatic normalization
 *
 * Populates entry.epg field with matching programmes array.
 * Returns new playlist with enriched entries (immutable).
 *
 * @param playlist - Parsed IPTV playlist
 * @param epgData - EPG data in any supported format
 * @returns New playlist with EPG data linked to entries
 *
 * @example
 * ```typescript
 * const epgData = {
 *   'channel1': [
 *     { channel: 'channel1', title: 'News', start: new Date('2025-01-01T10:00:00Z'), stop: new Date('2025-01-01T11:00:00Z') }
 *   ]
 * };
 *
 * const enriched = linkEpgData(playlist, epgData);
 * console.log(enriched.items[0].epg); // Array of programmes
 * ```
 */
export function linkEpgData(
  playlist: Playlist,
  epgData: Record<string, EpgProgram[]> | any
): Playlist {
  const epgMap = normalizeEpgData(epgData);

  const enrichedItems = playlist.items.map((entry) => {
    const tvgId = getTvgId(entry);
    if (!tvgId) {
      return entry;
    }

    const programs = epgMap.get(tvgId);
    if (!programs || programs.length === 0) {
      return entry;
    }

    // Clone entry and add epg field with sorted programmes
    return { ...entry, epg: sortProgrammes(programs) };
  });

  return { ...playlist, items: enrichedItems };
}

/**
 * Calculate EPG coverage statistics for a playlist
 *
 * Analyzes how many playlist entries have:
 * - tvg-id defined
 * - Matching EPG data available
 *
 * Returns detailed coverage metrics including:
 * - Total entries count
 * - Entries with tvg-id
 * - Entries with EPG data
 * - Coverage percentage
 * - List of tvg-ids missing EPG data
 *
 * @param playlist - Parsed IPTV playlist
 * @param epgData - EPG data in any supported format
 * @returns Coverage statistics object
 *
 * @example
 * ```typescript
 * const coverage = validateEpgCoverage(playlist, epgData);
 * console.log(`Coverage: ${coverage.coveragePercent}%`);
 * console.log(`Missing EPG: ${coverage.missingEpgIds.join(', ')}`);
 * // Coverage: 85%
 * // Missing EPG: channel4, channel7
 * ```
 */
export function validateEpgCoverage(
  playlist: Playlist,
  epgData: Record<string, EpgProgram[]> | any
): EpgCoverage {
  const epgMap = normalizeEpgData(epgData);

  const totalEntries = playlist.items.length;
  let withEpgId = 0;
  let withEpgData = 0;
  const missingEpgIds: string[] = [];

  for (const entry of playlist.items) {
    const tvgId = getTvgId(entry);
    if (tvgId) {
      withEpgId++;
      const programs = epgMap.get(tvgId);
      if (programs && programs.length > 0) {
        withEpgData++;
      } else {
        missingEpgIds.push(tvgId);
      }
    }
  }

  const coveragePercent =
    totalEntries > 0 ? Math.round((withEpgData / totalEntries) * 100) : 0;

  return {
    totalEntries,
    withEpgId,
    withEpgData,
    coveragePercent,
    missingEpgIds,
  };
}

/**
 * Get EPG programmes for a single entry
 *
 * Retrieves all EPG programmes for a given entry based on its tvg-id.
 * Returns undefined if entry has no tvg-id or no EPG data available.
 * Returned programmes are sorted by start time.
 *
 * @param entry - Playlist entry to get EPG for
 * @param epgData - EPG data in any supported format
 * @returns Array of EPG programmes or undefined if not available
 *
 * @example
 * ```typescript
 * const programs = getChannelEpg(entry, epgData);
 * if (programs) {
 *   console.log(`Found ${programs.length} programmes`);
 *   programs.forEach(p => console.log(p.title, p.start));
 * }
 * ```
 */
export function getChannelEpg(
  entry: Entry,
  epgData: Record<string, EpgProgram[]> | any
): EpgProgram[] | undefined {
  const tvgId = getTvgId(entry);
  if (!tvgId) {
    return undefined;
  }

  const epgMap = normalizeEpgData(epgData);
  const programs = epgMap.get(tvgId);

  if (!programs || programs.length === 0) {
    return undefined;
  }

  return sortProgrammes(programs);
}

/**
 * Find current or specific program for an entry
 *
 * Searches EPG data for the programme airing at specified time.
 * If time not provided, uses current time (Date.now()).
 * Returns first programme where start <= time < stop.
 *
 * @param entry - Playlist entry to find program for
 * @param epgData - EPG data in any supported format
 * @param time - Optional time to check (defaults to now)
 * @returns EPG program airing at given time, or undefined if not found
 *
 * @example
 * ```typescript
 * // Find current program
 * const now = findCurrentProgram(entry, epgData);
 * console.log('Now playing:', now?.title);
 *
 * // Find program at specific time
 * const later = findCurrentProgram(entry, epgData, new Date('2025-01-01T20:00:00Z'));
 * console.log('Airing at 8pm:', later?.title);
 * ```
 */
export function findCurrentProgram(
  entry: Entry,
  epgData: Record<string, EpgProgram[]> | any,
  time?: Date
): EpgProgram | undefined {
  const programs = getChannelEpg(entry, epgData);
  if (!programs) {
    return undefined;
  }

  const checkTime = time || new Date();
  return findProgramAtTime(programs, checkTime);
}

/**
 * Find program at specific time from programmes array
 *
 * Searches through programmes array to find the one active at given time.
 * Uses linear scan (programmes arrays are typically <100 items per channel).
 * Returns first programme where start <= time < stop.
 *
 * @param programs - Array of EPG programmes (should be sorted by start time)
 * @param time - Time to check
 * @returns EPG program airing at given time, or undefined if not found
 *
 * @example
 * ```typescript
 * const programs = getChannelEpg(entry, epgData);
 * const program = findProgramAtTime(programs, new Date('2025-01-01T15:30:00Z'));
 * if (program) {
 *   console.log(`At 3:30pm: ${program.title}`);
 *   console.log(`Duration: ${program.start} - ${program.stop}`);
 * }
 * ```
 */
export function findProgramAtTime(
  programs: EpgProgram[],
  time: Date
): EpgProgram | undefined {
  if (!programs || programs.length === 0) {
    return undefined;
  }

  // Validate time
  if (!time || isNaN(time.getTime())) {
    return undefined;
  }

  // Linear scan - programmes are typically <100 per channel
  // More efficient than binary search for small arrays
  for (const prog of programs) {
    if (isProgramActive(prog, time)) {
      return prog;
    }
  }

  return undefined;
}
