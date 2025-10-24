EPG (XMLTV) Helpers

Fetch and parse XMLTV to build simple channel indices for binding.

Parse XMLTV
```ts
import { parseXmltv } from 'iptv-parser/dist/xmltv.js';

const xml = await fetch('https://example.com/epg.xml').then(r => r.text());
const { channels } = parseXmltv(xml);
```

Build Binding Index
```ts
import { buildEpgBindingIndex, normalizePlaylist, parsePlaylist } from 'iptv-parser';

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
