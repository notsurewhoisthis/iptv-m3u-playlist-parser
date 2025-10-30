import { Entry, Playlist, PlaylistHeader } from "./types.js";
import {
  parseKeyValueAttrs,
  splitLines,
  stripBOM,
  toNumber,
  trimQuotes,
  pushUnique,
} from "./util.js";

const EXTM3U = "#EXTM3U";
const EXTINF = "#EXTINF";
const EXTGRP = "#EXTGRP";
const EXTVLCOPT = "#EXTVLCOPT";
const KODIPROP = "#KODIPROP";

// Pre-compile regular expressions for performance
const EXTM3U_REGEX = /^#EXTM3U\s*/i;
const DURATION_ATTRS_REGEX = /^(-?\d+(?:\.\d+)?)\s*(.*)$/;
const HTTP_HEADER_REGEX = /^([^:]+):\s*(.*)$/;

// Pre-compile URL splitting regex for performance
const URL_SPLIT_REGEX = /[;,]/;

function parseHeader(line: string): PlaylistHeader {
  // e.g. #EXTM3U url-tvg=\"...\" tvg-shift=\"2\" catchup=\"default\"
  const rawAttrs = parseKeyValueAttrs(line.replace(EXTM3U_REGEX, ""));
  const urls = rawAttrs["url-tvg"] || rawAttrs["tvg-url"] || "";

  // Optimize: avoid creating array if no URLs
  const tvgUrls = urls
    ? urls
        .split(URL_SPLIT_REGEX)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const tvgShiftHours = toNumber(rawAttrs["tvg-shift"]);
  const tvgShift =
    tvgShiftHours != null ? Math.round(tvgShiftHours * 60) : undefined;

  const out: PlaylistHeader = {
    tvgUrls,
    tvgShift,
    userAgent: rawAttrs["user-agent"] || rawAttrs["http-user-agent"],
    catchup: rawAttrs["catchup"],
    catchupSource: rawAttrs["catchup-source"],
    catchupHours: toNumber(rawAttrs["catchup-hours"]),
    catchupDays: toNumber(rawAttrs["catchup-days"]),
    timeshift: toNumber(rawAttrs["timeshift"]),
    rawAttrs,
  };
  return out;
}

function parseExtInf(line: string) {
  // #EXTINF:-1 tvg-id=\"...\" group-title=\"...\",Channel Name
  const afterPrefix = line.slice(EXTINF.length).trim();
  // Split into "duration [attrs],name"
  // Find the comma that separates attributes from name (must be outside quotes)
  let commaIdx = -1;
  let inQuote = false;
  let quoteChar = '';
  for (let i = 0; i < afterPrefix.length; i++) {
    const ch = afterPrefix[i];
    if (!inQuote && (ch === '"' || ch === "'")) {
      inQuote = true;
      quoteChar = ch;
    } else if (inQuote && ch === quoteChar) {
      inQuote = false;
      quoteChar = '';
    } else if (!inQuote && ch === ',') {
      commaIdx = i;
      break;
    }
  }
  const left = commaIdx >= 0 ? afterPrefix.slice(0, commaIdx) : afterPrefix;
  const name = commaIdx >= 0 ? afterPrefix.slice(commaIdx + 1).trim() : "";

  // left might be just duration or duration + attrs
  // Reset lastIndex for regex reuse
  DURATION_ATTRS_REGEX.lastIndex = 0;
  const durMatch = DURATION_ATTRS_REGEX.exec(left);
  let duration: number | undefined;
  let attrsPart = "";
  if (durMatch) {
    const durNum = Number(durMatch[1]);
    if (Number.isFinite(durNum)) duration = Math.round(durNum);
    attrsPart = durMatch[2] ?? "";
  } else {
    // Some providers omit duration; treat entire left as attrs
    attrsPart = left;
  }
  const attrs = parseKeyValueAttrs(attrsPart);

  // Parse typed fields from attributes
  let streamType: Entry['streamType'];
  const tvgType = attrs['tvg-type']?.toLowerCase();
  if (tvgType === 'live') streamType = 'live';
  else if (tvgType === 'vod' || tvgType === 'movie' || tvgType === 'video') streamType = 'vod';
  else if (tvgType === 'series') streamType = 'series';
  else if (tvgType === 'radio') streamType = 'radio';

  const audioTrack = attrs['audio-track'] || undefined;
  const aspectRatio = attrs['aspect-ratio'] || undefined;

  const adultVal = attrs['adult'];
  const isAdult = adultVal === '1' || adultVal?.toLowerCase() === 'true' ? true : undefined;
  const recVal = attrs['tvg-rec'];
  const recording = recVal === '1' || recVal?.toLowerCase() === 'true' ? true : undefined;

  return {
    duration,
    attrs,
    name: trimQuotes(name),
    streamType,
    audioTrack,
    aspectRatio,
    isAdult,
    recording,
  };
}

function normalizeEntryAttrs(attrs: Record<string, string>) {
  // Normalize common alias keys
  // Optimize: only create new object if we need to normalize
  let needsNormalization = false;

  // Check if normalization is needed (avoid unnecessary object creation)
  if (attrs["tvg_id"] && !attrs["tvg-id"]) needsNormalization = true;
  else if (attrs["tvg_name"] && !attrs["tvg-name"]) needsNormalization = true;
  else if (attrs["tvg_logo"] && !attrs["tvg-logo"]) needsNormalization = true;
  else if (attrs["group_title"] && !attrs["group-title"])
    needsNormalization = true;

  if (!needsNormalization) return attrs;

  const out: Record<string, string> = { ...attrs };
  if (attrs["tvg_id"] && !attrs["tvg-id"]) out["tvg-id"] = attrs["tvg_id"];
  if (attrs["tvg_name"] && !attrs["tvg-name"])
    out["tvg-name"] = attrs["tvg_name"];
  if (attrs["tvg_logo"] && !attrs["tvg-logo"])
    out["tvg-logo"] = attrs["tvg_logo"];
  if (attrs["group_title"] && !attrs["group-title"])
    out["group-title"] = attrs["group_title"];
  return out;
}

/**
 * Parse URLs with pipe-separated headers: http://url|Header1=Value1&Header2=Value2
 */
function parseUrlWithPipeParams(rawUrl: string): { url: string; headers?: Record<string, string> } {
  const pipeIdx = rawUrl.indexOf('|');
  if (pipeIdx === -1) {
    return { url: rawUrl };
  }

  const url = rawUrl.slice(0, pipeIdx).trim();
  const paramsStr = rawUrl.slice(pipeIdx + 1).trim();

  if (!paramsStr) {
    return { url };
  }

  const headers: Record<string, string> = {};
  for (const param of paramsStr.split('&')) {
    const eqIdx = param.indexOf('=');
    if (eqIdx > 0) {
      const key = param.slice(0, eqIdx).trim();
      const value = param.slice(eqIdx + 1).trim();
      if (key && value) {
        headers[key] = value;
      }
    }
  }

  return {
    url,
    headers: Object.keys(headers).length > 0 ? headers : undefined
  };
}

export function parsePlaylist(text: string): Playlist {
  const warnings: string[] = [];
  const items: Entry[] = [];
  let header: PlaylistHeader = { tvgUrls: [], rawAttrs: {} };

  const lines = splitLines(stripBOM(text));
  let i = 0;
  // Find the first non-empty, non-comment-ish line
  while (i < lines.length && !lines[i].trim()) i++;
  if (i < lines.length && lines[i].toUpperCase().startsWith(EXTM3U)) {
    header = parseHeader(lines[i]);
    i++;
  } else {
    warnings.push("Missing #EXTM3U header");
  }

  // Walk remaining lines
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    if (line.toUpperCase().startsWith(EXTINF)) {
      const { duration, attrs: rawAttrs, name, streamType, audioTrack, aspectRatio, isAdult, recording } = parseExtInf(lines[i]);
      const attrs = normalizeEntryAttrs(rawAttrs);
      const group: string[] = [];
      const tvg = {
        id: attrs["tvg-id"],
        name: attrs["tvg-name"],
        logo: attrs["tvg-logo"],
        chno: attrs["tvg-chno"] ?? attrs["tvg-chno"],
      };
      let httpHeaders:
        | {
            userAgent?: string;
            referer?: string;
            cookie?: string;
            headers?: Record<string, string>;
          }
        | undefined;
      if (header.userAgent) {
        httpHeaders = {
          ...(httpHeaders ?? {}),
          userAgent: header.userAgent,
          headers: httpHeaders?.headers ?? {},
        };
      }
      let kodiProps: Record<string, string> | undefined;

      // Groups from group-title
      if (attrs["group-title"]) {
        for (const g of attrs["group-title"]
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean)) {
          pushUnique(group, g);
        }
      }

      // Scan forward for auxiliary lines until we hit a URL or another marker
      let j = i + 1;
      let url = "";
      for (; j < lines.length; j++) {
        const lraw = lines[j];
        const l = lraw.trim();
        if (!l) continue;
        if (l.startsWith("#")) {
          if (l.toUpperCase().startsWith(EXTGRP)) {
            const grp = trimQuotes(
              l.slice(EXTGRP.length).replace(/^:/, "").trim(),
            );
            if (grp) pushUnique(group, grp);
          } else if (l.toUpperCase().startsWith(EXTVLCOPT)) {
            const pair = l.slice(EXTVLCOPT.length).replace(/^:/, "").trim();
            const eq = pair.indexOf("=");
            const k = (eq >= 0 ? pair.slice(0, eq) : pair).trim().toLowerCase();
            const v = eq >= 0 ? pair.slice(eq + 1).trim() : "true";
            httpHeaders ||= { headers: {} };
            if (k === "http-user-agent") httpHeaders.userAgent = v;
            else if (k === "http-referrer") httpHeaders.referer = v;
            else if (k === "http-cookie") httpHeaders.cookie = v;
            else if (k.startsWith("http-header")) {
              // Format: http-header=Name: Value
              // Reset lastIndex for regex reuse
              HTTP_HEADER_REGEX.lastIndex = 0;
              const m = HTTP_HEADER_REGEX.exec(v);
              if (m) {
                httpHeaders.headers![m[1].trim()] = m[2];
              }
            } else {
              // Keep as attr for completeness
              attrs[`vlcopt:${k}`] = v;
            }
          } else if (l.toUpperCase().startsWith(KODIPROP)) {
            const pair = l.slice(KODIPROP.length).replace(/^:/, "").trim();
            const eq = pair.indexOf("=");
            const k = (eq >= 0 ? pair.slice(0, eq) : pair).trim();
            const v = eq >= 0 ? pair.slice(eq + 1).trim() : "true";
            kodiProps ||= {};
            kodiProps[k] = v;
          }
          continue;
        }
        // First non-comment line after EXTINF is the URL
        const { url: parsedUrl, headers: pipeHeaders } = parseUrlWithPipeParams(lraw.trim());
        url = parsedUrl;

        // Merge pipe headers into httpHeaders
        if (pipeHeaders) {
          httpHeaders ||= { headers: {} };
          httpHeaders.headers ||= {};
          Object.assign(httpHeaders.headers, pipeHeaders);
        }
        break;
      }

      if (!url) {
        warnings.push(`No URL found for entry at line ${i + 1}`);
        i = j; // move on
        continue;
      }

      const entry: Entry = {
        name: name || attrs["tvg-name"] || attrs["tvg-id"] || url,
        url,
        duration,
        group: group.length ? group : undefined,
        tvg: tvg.id || tvg.name || tvg.logo || tvg.chno ? tvg : undefined,
        http: httpHeaders,
        kodiProps,
        attrs,
        streamType,
        audioTrack,
        aspectRatio,
        isAdult,
        recording,
      };
      items.push(entry);
      i = j + 1;
      continue;
    }

    // Other lines are ignored here
    i++;
  }

  return { header, items, warnings };
}
