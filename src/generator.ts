import { Entry, Playlist, GeneratorOptions } from "./types.js";

const EXTM3U = "#EXTM3U";
const EXTINF = "#EXTINF";
const EXTGRP = "#EXTGRP";
const EXTVLCOPT = "#EXTVLCOPT";
const KODIPROP = "#KODIPROP";

/**
 * Generate M3U/M3U8 playlist from parsed data
 * @param playlist - Parsed playlist object
 * @param options - Generator options
 * @returns M3U/M3U8 formatted string
 */
export function generateM3U(
  playlist: Playlist,
  options?: GeneratorOptions,
): string {
  const {
    format = "m3u8",
    sortByGroup = false,
    includeHeader = true,
  } = options || {};

  const lines: string[] = [];

  // Generate #EXTM3U header
  if (includeHeader) {
    let headerLine = EXTM3U;
    const { header } = playlist;

    // Build header attributes from rawAttrs
    const headerAttrs: string[] = [];

    // Add tvg-url if present
    if (header.tvgUrls && header.tvgUrls.length > 0) {
      headerAttrs.push(`url-tvg="${header.tvgUrls.join(",")}"`);
    }

    // Add tvg-shift if present (convert minutes to hours)
    if (header.tvgShift != null) {
      const hours = header.tvgShift / 60;
      headerAttrs.push(`tvg-shift="${hours}"`);
    }

    // Add user-agent if present
    if (header.userAgent) {
      headerAttrs.push(`user-agent="${escapeQuotes(header.userAgent)}"`);
    }

    // Add catchup if present
    if (header.catchup) {
      headerAttrs.push(`catchup="${escapeQuotes(header.catchup)}"`);
    }

    // Add catchup-source if present
    if (header.catchupSource) {
      headerAttrs.push(`catchup-source="${escapeQuotes(header.catchupSource)}"`);
    }

    // Add catchup-hours if present
    if (header.catchupHours != null) {
      headerAttrs.push(`catchup-hours="${header.catchupHours}"`);
    }

    // Add catchup-days if present
    if (header.catchupDays != null) {
      headerAttrs.push(`catchup-days="${header.catchupDays}"`);
    }

    // Add timeshift if present
    if (header.timeshift != null) {
      headerAttrs.push(`timeshift="${header.timeshift}"`);
    }

    // Add any remaining rawAttrs that weren't explicitly handled
    if (header.rawAttrs) {
      const handledKeys = new Set([
        "url-tvg",
        "tvg-url",
        "tvg-shift",
        "user-agent",
        "http-user-agent",
        "catchup",
        "catchup-source",
        "catchup-hours",
        "catchup-days",
        "timeshift",
      ]);

      for (const [key, value] of Object.entries(header.rawAttrs)) {
        if (!handledKeys.has(key)) {
          headerAttrs.push(`${key}="${escapeQuotes(value)}"`);
        }
      }
    }

    if (headerAttrs.length > 0) {
      headerLine += " " + headerAttrs.join(" ");
    }

    lines.push(headerLine);
  }

  // Sort entries by group if requested
  let entries = playlist.items;
  if (sortByGroup) {
    entries = [...entries].sort((a, b) => {
      const groupA = a.group?.[0] || "";
      const groupB = b.group?.[0] || "";
      return groupA.localeCompare(groupB);
    });
  }

  // Generate entries
  for (const entry of entries) {
    const entryLines = generateEntryLines(entry);
    lines.push(...entryLines);
  }

  // Use UTF-8 encoding for m3u8 format
  return lines.join("\n") + "\n";
}

/**
 * Generate all lines for a single entry
 * @param entry - Entry to generate
 * @returns Array of lines for this entry
 */
function generateEntryLines(entry: Entry): string[] {
  const lines: string[] = [];

  // Generate #EXTINF line
  const extinfLine = generateExtInf(entry);
  lines.push(extinfLine);

  // Generate #EXTGRP lines if groups exist
  if (entry.group && entry.group.length > 0) {
    for (const group of entry.group) {
      lines.push(`${EXTGRP}:${group}`);
    }
  }

  // Generate #EXTVLCOPT lines if http hints exist
  if (entry.http) {
    if (entry.http.userAgent) {
      lines.push(
        `${EXTVLCOPT}:http-user-agent=${escapeQuotes(entry.http.userAgent)}`,
      );
    }
    if (entry.http.referer) {
      lines.push(
        `${EXTVLCOPT}:http-referrer=${escapeQuotes(entry.http.referer)}`,
      );
    }
    if (entry.http.cookie) {
      lines.push(
        `${EXTVLCOPT}:http-cookie=${escapeQuotes(entry.http.cookie)}`,
      );
    }
    if (entry.http.headers) {
      for (const [name, value] of Object.entries(entry.http.headers)) {
        lines.push(`${EXTVLCOPT}:http-header=${name}: ${value}`);
      }
    }
  }

  // Generate #KODIPROP lines if kodiProps exist
  if (entry.kodiProps) {
    for (const [key, value] of Object.entries(entry.kodiProps)) {
      lines.push(`${KODIPROP}:${key}=${value}`);
    }
  }

  // Add the URL line
  lines.push(entry.url);

  return lines;
}

/**
 * Generate #EXTINF line for an entry
 * @param entry - Entry to generate EXTINF for
 * @returns EXTINF line string
 */
function generateExtInf(entry: Entry): string {
  // Format: #EXTINF:duration [attrs],name
  const duration = entry.duration ?? -1;
  const parts: string[] = [`${EXTINF}:${duration}`];

  // Collect attributes
  const attrs: Record<string, string> = {};

  // Add tvg attributes
  if (entry.tvg?.id) {
    attrs["tvg-id"] = entry.tvg.id;
  }
  if (entry.tvg?.name) {
    attrs["tvg-name"] = entry.tvg.name;
  }
  if (entry.tvg?.logo) {
    attrs["tvg-logo"] = entry.tvg.logo;
  }
  if (entry.tvg?.chno) {
    attrs["tvg-chno"] = entry.tvg.chno;
  }

  // Add group-title from first group
  if (entry.group && entry.group.length > 0) {
    attrs["group-title"] = entry.group.join(";");
  }

  // Merge with any additional attrs from entry.attrs
  // entry.attrs takes precedence for non-standard attributes
  if (entry.attrs) {
    for (const [key, value] of Object.entries(entry.attrs)) {
      // Skip vlcopt: prefixed attrs (they go in #EXTVLCOPT)
      if (!key.startsWith("vlcopt:")) {
        // Don't override our explicitly set tvg/group attrs
        if (!attrs[key]) {
          attrs[key] = value;
        }
      }
    }
  }

  // Format attributes
  const attrsStr = formatAttributes(attrs);
  if (attrsStr) {
    parts.push(" " + attrsStr);
  }

  // Add name
  const name = entry.name || "";
  parts.push("," + name);

  return parts.join("");
}

/**
 * Format attributes as space-separated key="value" pairs
 * @param attrs - Attributes to format
 * @returns Formatted attribute string
 */
function formatAttributes(attrs: Record<string, string>): string {
  const pairs: string[] = [];

  for (const [key, value] of Object.entries(attrs)) {
    // Skip empty values
    if (value === undefined || value === null || value === "") {
      continue;
    }

    // Format as key="value"
    pairs.push(`${key}="${escapeQuotes(value)}"`);
  }

  return pairs.join(" ");
}

/**
 * Escape double quotes in attribute values
 * @param value - Value to escape
 * @returns Escaped value
 */
function escapeQuotes(value: string): string {
  return value.replace(/"/g, '\\"');
}

/**
 * Export playlist as JSON
 * @param playlist - Parsed playlist object
 * @param pretty - Pretty print with indentation
 * @returns JSON string
 */
export function generateJSON(playlist: Playlist, pretty = false): string {
  if (pretty) {
    return JSON.stringify(playlist, null, 2);
  }
  return JSON.stringify(playlist);
}
