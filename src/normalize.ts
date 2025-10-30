import { Entry, Playlist } from "./types.js";

/**
 * Comprehensive attribute alias mappings
 * Maps common IPTV provider variations to standard attribute names
 */
const KEY_ALIASES: Record<string, string> = {
  // TVG ID variants
  tvg_id: "tvg-id",
  "channel-id": "tvg-id",
  channelid: "tvg-id",

  // TVG name variants
  tvg_name: "tvg-name",
  "channel-name": "tvg-name",
  channelname: "tvg-name",

  // TVG logo variants
  tvg_logo: "tvg-logo",
  "tvg-logo-square": "tvg-logo", // Prefer standard logo
  "tvg-logo-small": "tvg-logo",
  logo: "tvg-logo",
  icon: "tvg-logo",
  "channel-logo": "tvg-logo",

  // Group title variants
  group_title: "group-title",
  group: "group-title",
  category: "group-title",
  "group-name": "group-title",

  // TVG language variants
  tvg_language: "tvg-language",
  language: "tvg-language",
  lang: "tvg-language",

  // TVG country variants
  tvg_country: "tvg-country",
  country: "tvg-country",

  // TVG type variants
  tvg_type: "tvg-type",
  type: "tvg-type",
  "content-type": "tvg-type",

  // TVG year variants
  tvg_year: "tvg-year",
  year: "tvg-year",

  // TVG channel number variants
  tvg_chno: "tvg-chno",
  "channel-number": "tvg-chno",
  chno: "tvg-chno",

  // Catchup/Timeshift variants
  timeshift: "catchup",
  "catchup-type": "catchup",
};

export function normalizeEntry(e: Entry): Entry {
  const attrs: Record<string, string> = {};

  // Normalize all attribute keys
  for (const [k, v] of Object.entries(e.attrs)) {
    const low = k.toLowerCase();
    const target = KEY_ALIASES[low] ?? low;

    // Only set if not already present (prefer original if both exist)
    if (!attrs[target]) {
      attrs[target] = v;
    }
  }

  // Normalize groups from attrs if absent
  let group = e.group ?? [];
  const groupTitle = attrs["group-title"];
  if (groupTitle) {
    for (const g of groupTitle
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)) {
      if (!group.includes(g)) group.push(g);
    }
  }

  // Normalize tvg structure
  const tvg = {
    id: attrs["tvg-id"] ?? e.tvg?.id,
    name: attrs["tvg-name"] ?? e.tvg?.name,
    logo: attrs["tvg-logo"] ?? e.tvg?.logo,
    chno: attrs["tvg-chno"] ?? e.tvg?.chno,
  };
  const hasTvg = tvg.id || tvg.name || tvg.logo || tvg.chno;

  // Prefer explicit name > tvg-name > url
  const name = e.name || tvg.name || e.url;

  return {
    ...e,
    name,
    group: group.length ? group : undefined,
    tvg: hasTvg ? tvg : undefined,
    attrs,
  };
}

export function normalizePlaylist(p: Playlist): Playlist {
  return {
    ...p,
    items: p.items.map(normalizeEntry),
  };
}

/**
 * Merge multiple playlists with provider order preservation
 *
 * Each playlist's entries get a providerOrder offset to maintain
 * original ordering when merging from multiple sources.
 *
 * @param playlists - Array of playlists to merge
 * @param offset - Offset multiplier per playlist (default 1,000,000)
 * @returns Single merged playlist
 */
export function mergePlaylists(
  playlists: Playlist[],
  offset: number = 1_000_000,
): Playlist {
  const mergedItems: Entry[] = [];
  const mergedWarnings: string[] = [];

  // Use header from first non-empty playlist
  let header = playlists.find((p) => p.header.tvgUrls.length > 0)?.header ?? {
    tvgUrls: [],
    rawAttrs: {},
  };

  for (let idx = 0; idx < playlists.length; idx++) {
    const playlist = playlists[idx];

    // Assign provider order to each entry
    const itemsWithOrder = playlist.items.map((item, i) => ({
      ...item,
      providerOrder: idx * offset + i,
    }));

    mergedItems.push(...itemsWithOrder);
    mergedWarnings.push(...playlist.warnings);
  }

  return {
    header,
    items: mergedItems,
    warnings: mergedWarnings,
  };
}

/**
 * Deduplicate entries based on URL
 *
 * When duplicates found, keeps the one with earliest providerOrder
 *
 * @param entries - Array of entries
 * @returns Deduplicated entries
 */
export function deduplicateEntries(entries: Entry[]): Entry[] {
  const seen = new Map<string, Entry>();

  for (const entry of entries) {
    const existing = seen.get(entry.url);

    if (!existing) {
      seen.set(entry.url, entry);
      continue;
    }

    // Keep entry with lower provider order (earlier in original playlist)
    const existingOrder = existing.providerOrder ?? Number.MAX_SAFE_INTEGER;
    const currentOrder = entry.providerOrder ?? Number.MAX_SAFE_INTEGER;

    if (currentOrder < existingOrder) {
      seen.set(entry.url, entry);
    }
  }

  return Array.from(seen.values());
}
