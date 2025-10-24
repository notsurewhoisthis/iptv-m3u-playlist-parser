EPG (XMLTV) Helpers

Fetch and parse XMLTV to build simple channel indices for binding.

Parse XMLTV
```ts
import { parseXmltv } from 'iptv-m3u-parser';

const xml = await fetch('https://example.com/epg.xml').then(r => r.text());
const { channels } = parseXmltv(xml);
```

Build Binding Index
```ts
import { buildEpgBindingIndex, normalizePlaylist, parsePlaylist } from 'iptv-m3u-parser';

const idx = buildEpgBindingIndex(channels);
const pl = normalizePlaylist(parsePlaylist(text));
for (const ch of pl.items) {
  const id = ch.tvg?.id?.toLowerCase();
  const byId = id ? idx.byId.get(id) : undefined;
  const byName = !byId && ch.tvg?.name ? idx.byName.get(ch.tvg.name.toLowerCase()) : undefined;
  const bound = byId || byName;
  // bound?.iconUrl, bound?.displayNames[0], etc.
}
```

Notes
- XMLTV format varies; this helper extracts `channel/@id`, `display-name` text, and the first `icon@src` when present.
- Full programme parsing is out of scope for now.
```

Parse Programmes (EPG events)
```ts
import { parseXmltvPrograms, buildChannelCategoryMap } from 'iptv-m3u-parser';

const { programs } = parseXmltvPrograms(xml);
// Each programme: { channelId, start, stop, title?, desc?, categories? }

// Build channel → categories map (most frequent first)
const categoriesByChannel = buildChannelCategoryMap(programs, { topN: 5 });
```

Binding channels to programmes:
1) Build channel index with `buildEpgBindingIndex(channels)`.
2) Match playlist items by tvg-id or name into an EPG channel.
3) Use `programs.filter(p => p.channelId === bound.id)` to retrieve EPG events.
