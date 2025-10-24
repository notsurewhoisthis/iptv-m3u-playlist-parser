import { XMLParser } from 'fast-xml-parser';

export interface TvgChannel {
  id: string;
  displayNames: string[];
  iconUrl?: string;
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
