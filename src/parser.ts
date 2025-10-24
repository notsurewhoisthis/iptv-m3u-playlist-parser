import { Entry, Playlist, PlaylistHeader } from './types.js';
import { parseKeyValueAttrs, splitLines, stripBOM, toNumber, trimQuotes, pushUnique } from './util.js';

const EXTM3U = '#EXTM3U';
const EXTINF = '#EXTINF';
const EXTGRP = '#EXTGRP';
const EXTVLCOPT = '#EXTVLCOPT';
const KODIPROP = '#KODIPROP';

function parseHeader(line: string): PlaylistHeader {
  // e.g. #EXTM3U url-tvg=\"...\" tvg-shift=\"2\" catchup=\"default\"
  const rawAttrs = parseKeyValueAttrs(line.replace(/^#EXTM3U\s*/i, ''));
  const urls = rawAttrs['url-tvg'] || rawAttrs['tvg-url'] || '';
  const tvgUrls = urls
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const tvgShiftHours = toNumber(rawAttrs['tvg-shift']);
  const tvgShift = tvgShiftHours != null ? Math.round(tvgShiftHours * 60) : undefined;

  const out: PlaylistHeader = {
    tvgUrls,
    tvgShift,
    userAgent: rawAttrs['user-agent'] || rawAttrs['http-user-agent'],
    catchup: rawAttrs['catchup'],
    catchupSource: rawAttrs['catchup-source'],
    catchupHours: toNumber(rawAttrs['catchup-hours']),
    catchupDays: toNumber(rawAttrs['catchup-days']),
    timeshift: toNumber(rawAttrs['timeshift']),
    rawAttrs,
  };
  return out;
}

function parseExtInf(line: string) {
  // #EXTINF:-1 tvg-id=\"...\" group-title=\"...\",Channel Name
  const afterPrefix = line.slice(EXTINF.length).trim();
  // Split into "duration [attrs],name"
  const commaIdx = afterPrefix.indexOf(',');
  const left = commaIdx >= 0 ? afterPrefix.slice(0, commaIdx) : afterPrefix;
  const name = commaIdx >= 0 ? afterPrefix.slice(commaIdx + 1).trim() : '';

  // left might be just duration or duration + attrs
  const durMatch = left.match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
  let duration: number | undefined;
  let attrsPart = '';
  if (durMatch) {
    const durNum = Number(durMatch[1]);
    if (Number.isFinite(durNum)) duration = Math.round(durNum);
    attrsPart = durMatch[2] ?? '';
  } else {
    // Some providers omit duration; treat entire left as attrs
    attrsPart = left;
  }
  const attrs = parseKeyValueAttrs(attrsPart);
  return { duration, attrs, name: trimQuotes(name) };
}

function normalizeEntryAttrs(attrs: Record<string, string>) {
  // Normalize common alias keys
  const out: Record<string, string> = { ...attrs };
  if (out['tvg_id'] && !out['tvg-id']) out['tvg-id'] = out['tvg_id'];
  if (out['tvg_name'] && !out['tvg-name']) out['tvg-name'] = out['tvg_name'];
  if (out['tvg_logo'] && !out['tvg-logo']) out['tvg-logo'] = out['tvg_logo'];
  if (out['group_title'] && !out['group-title']) out['group-title'] = out['group_title'];
  return out;
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
    warnings.push('Missing #EXTM3U header');
  }

  // Walk remaining lines
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    if (line.toUpperCase().startsWith(EXTINF)) {
      const { duration, attrs: rawAttrs, name } = parseExtInf(lines[i]);
      const attrs = normalizeEntryAttrs(rawAttrs);
      const group: string[] = [];
      const tvg = {
        id: attrs['tvg-id'],
        name: attrs['tvg-name'],
        logo: attrs['tvg-logo'],
        chno: attrs['tvg-chno'] ?? attrs['tvg-chno'],
      };
      let httpHeaders: { userAgent?: string; referer?: string; cookie?: string; headers?: Record<string, string> } | undefined;
      if (header.userAgent) {
        httpHeaders = { ...(httpHeaders ?? {}), userAgent: header.userAgent, headers: (httpHeaders?.headers ?? {}) };
      }
      let kodiProps: Record<string, string> | undefined;

      // Groups from group-title
      if (attrs['group-title']) {
        for (const g of attrs['group-title'].split(';').map((s) => s.trim()).filter(Boolean)) {
          pushUnique(group, g);
        }
      }

      // Scan forward for auxiliary lines until we hit a URL or another marker
      let j = i + 1;
      let url = '';
      for (; j < lines.length; j++) {
        const lraw = lines[j];
        const l = lraw.trim();
        if (!l) continue;
        if (l.startsWith('#')) {
          if (l.toUpperCase().startsWith(EXTGRP)) {
            const grp = trimQuotes(l.slice(EXTGRP.length).replace(/^:/, '').trim());
            if (grp) pushUnique(group, grp);
          } else if (l.toUpperCase().startsWith(EXTVLCOPT)) {
            const pair = l.slice(EXTVLCOPT.length).replace(/^:/, '').trim();
            const eq = pair.indexOf('=');
            const k = (eq >= 0 ? pair.slice(0, eq) : pair).trim().toLowerCase();
            const v = eq >= 0 ? pair.slice(eq + 1).trim() : 'true';
            httpHeaders ||= { headers: {} };
            if (k === 'http-user-agent') httpHeaders.userAgent = v;
            else if (k === 'http-referrer') httpHeaders.referer = v;
            else if (k === 'http-cookie') httpHeaders.cookie = v;
            else if (k.startsWith('http-header')) {
              // Format: http-header=Name: Value
              const m = v.match(/^([^:]+):\s*(.*)$/);
              if (m) {
                httpHeaders.headers![m[1].trim()] = m[2];
              }
            } else {
              // Keep as attr for completeness
              attrs[`vlcopt:${k}`] = v;
            }
          } else if (l.toUpperCase().startsWith(KODIPROP)) {
            const pair = l.slice(KODIPROP.length).replace(/^:/, '').trim();
            const eq = pair.indexOf('=');
            const k = (eq >= 0 ? pair.slice(0, eq) : pair).trim();
            const v = eq >= 0 ? pair.slice(eq + 1).trim() : 'true';
            kodiProps ||= {};
            kodiProps[k] = v;
          }
          continue;
        }
        // First non-comment line after EXTINF is the URL
        url = lraw.trim();
        break;
      }

      if (!url) {
        warnings.push(`No URL found for entry at line ${i + 1}`);
        i = j; // move on
        continue;
      }

      const entry: Entry = {
        name: name || attrs['tvg-name'] || attrs['tvg-id'] || url,
        url,
        duration,
        group: group.length ? group : undefined,
        tvg: tvg.id || tvg.name || tvg.logo || tvg.chno ? tvg : undefined,
        http: httpHeaders,
        kodiProps,
        attrs,
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
