import { Entry, Playlist } from './types.js';

const KEY_ALIASES: Record<string, string> = {
  'tvg_id': 'tvg-id',
  'tvg_name': 'tvg-name',
  'tvg_logo': 'tvg-logo',
  'group_title': 'group-title',
  'group': 'group-title',
  'logo': 'tvg-logo',
  'channel-id': 'tvg-id',
};

export function normalizeEntry(e: Entry): Entry {
  const attrs: Record<string, string> = {};
  for (const [k, v] of Object.entries(e.attrs)) {
    const low = k.toLowerCase();
    const target = KEY_ALIASES[low] ?? low;
    attrs[target] = v;
  }

  // Normalize groups from attrs if absent
  let group = e.group ?? [];
  const groupTitle = attrs['group-title'];
  if (groupTitle) {
    for (const g of groupTitle.split(';').map((s) => s.trim()).filter(Boolean)) {
      if (!group.includes(g)) group.push(g);
    }
  }

  // Normalize tvg structure
  const tvg = {
    id: attrs['tvg-id'] ?? e.tvg?.id,
    name: attrs['tvg-name'] ?? e.tvg?.name,
    logo: attrs['tvg-logo'] ?? e.tvg?.logo,
    chno: attrs['tvg-chno'] ?? e.tvg?.chno,
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
