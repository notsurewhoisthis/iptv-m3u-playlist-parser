import { XMLParser } from 'fast-xml-parser';

export interface TvgChannel {
  id: string;
  displayNames: string[];
  iconUrl?: string;
}

export interface TvgProgramme {
  channelId: string;
  start: number; // epoch seconds (UTC)
  stop?: number; // epoch seconds (UTC)
  title?: string;
  desc?: string;
  categories?: string[];
}

export function parseXmltv(xml: string): { channels: TvgChannel[] } {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text' });
  const data = parser.parse(xml);
  const channelsRaw = data?.tv?.channel ?? [];
  const channelsArr = Array.isArray(channelsRaw) ? channelsRaw : [channelsRaw];
  const channels: TvgChannel[] = [];
  for (const ch of channelsArr) {
    if (!ch) continue;
    const id = ch['@_id'] ?? ch.id;
    if (!id) continue;
    const namesRaw = ch['display-name'];
    const namesArr = Array.isArray(namesRaw) ? namesRaw : namesRaw ? [namesRaw] : [];
    const displayNames: string[] = namesArr
      .map((n: any) => (typeof n === 'string' ? n : (n?.['#text'] ?? '').toString()))
      .map((s: string) => s.trim())
      .filter(Boolean);
    const iconRaw = ch.icon;
    let iconUrl: string | undefined;
    if (iconRaw) {
      if (Array.isArray(iconRaw)) {
        iconUrl = iconRaw[0]?.['@_src'] ?? iconRaw[0]?.src;
      } else {
        iconUrl = iconRaw['@_src'] ?? iconRaw.src;
      }
    }
    channels.push({ id, displayNames, iconUrl });
  }
  return { channels };
}

export function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function buildEpgBindingIndex(channels: TvgChannel[]): {
  byId: Map<string, TvgChannel>;
  byName: Map<string, TvgChannel>;
} {
  const byId = new Map<string, TvgChannel>();
  const byName = new Map<string, TvgChannel>();
  for (const ch of channels) {
    byId.set(ch.id.toLowerCase(), ch);
    for (const n of ch.displayNames) {
      const key = normalizeName(n);
      if (key) byName.set(key, ch);
    }
  }
  return { byId, byName };
}

function textContent(node: any): string | undefined {
  if (node == null) return undefined;
  if (typeof node === 'string') return node.trim();
  if (typeof node['#text'] === 'string') return node['#text'].trim();
  return undefined;
}

export function parseXmltvDate(s: string | undefined): number | undefined {
  if (!s) return undefined;
  // Formats like: YYYYMMDDHHMMSS Z, YYYYMMDDHHMMSS +0000, or without TZ (assume UTC)
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-]\d{2}:?\d{2}|Z))?/);
  if (!m) return undefined;
  const [_, Y, M, D, h, mnt, sec, tz] = m;
  const year = Number(Y);
  const month = Number(M) - 1;
  const day = Number(D);
  const hour = Number(h);
  const minute = Number(mnt);
  const second = Number(sec);
  // Default to UTC
  let ms = Date.UTC(year, month, day, hour, minute, second);
  if (tz && tz !== 'Z') {
    const tzm = tz.replace(':', '');
    const sign = tzm[0] === '-' ? -1 : 1;
    const tzh = Number(tzm.slice(1, 3));
    const tzi = Number(tzm.slice(3, 5));
    const offsetMinutes = sign * (tzh * 60 + tzi);
    ms -= offsetMinutes * 60 * 1000; // convert to UTC
  }
  return Math.floor(ms / 1000);
}

export function parseXmltvPrograms(xml: string): { programs: TvgProgramme[] } {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text' });
  const data = parser.parse(xml);
  const progsRaw = data?.tv?.programme ?? [];
  const arr = Array.isArray(progsRaw) ? progsRaw : [progsRaw];
  const programs: TvgProgramme[] = [];
  for (const p of arr) {
    if (!p) continue;
    const channelId = p['@_channel'] ?? p.channel;
    if (!channelId) continue;
    const start = parseXmltvDate(p['@_start']);
    const stop = parseXmltvDate(p['@_stop']);
    const title = Array.isArray(p.title) ? textContent(p.title[0]) : textContent(p.title);
    const desc = Array.isArray(p.desc) ? textContent(p.desc[0]) : textContent(p.desc);
    const catsRaw = p.category;
    const catsArr = Array.isArray(catsRaw) ? catsRaw : catsRaw ? [catsRaw] : [];
    const categories = catsArr.map((c: any) => textContent(c)).filter(Boolean) as string[];
    if (!start) continue;
    programs.push({ channelId, start, stop, title, desc, categories: categories.length ? categories : undefined });
  }
  return { programs };
}

export function buildChannelCategoryMap(programs: TvgProgramme[], options: { topN?: number } = {}): Map<string, string[]> {
  const topN = options.topN ?? 5;
  const counts = new Map<string, Map<string, number>>();
  for (const p of programs) {
    if (!p.categories?.length) continue;
    let m = counts.get(p.channelId);
    if (!m) counts.set(p.channelId, (m = new Map()));
    for (const c of p.categories) {
      m.set(c, (m.get(c) ?? 0) + 1);
    }
  }
  const out = new Map<string, string[]>();
  for (const [ch, m] of counts) {
    const list = Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([name]) => name);
    out.set(ch, list);
  }
  return out;
}
