import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseXmltv, buildEpgBindingIndex } from '../src/xmltv.js';
import { parsePlaylist } from '../src/index.js';
import { normalizePlaylist } from '../src/normalize.js';

test('parse xmltv channels and bind by id', () => {
  const xml = readFileSync(new URL('./xmltv_sample.xml', import.meta.url), 'utf8');
  const { channels } = parseXmltv(xml);
  assert.equal(channels.length, 2);
  const idx = buildEpgBindingIndex(channels);

  const playlist = `#EXTM3U\n#EXTINF:-1 tvg-id="c1",C1\nhttp://example.com/c1`; // minimal
  const pl = normalizePlaylist(parsePlaylist(playlist));
  const match = idx.byId.get(pl.items[0].tvg?.id?.toLowerCase() ?? '');
  assert.ok(match);
  assert.equal(match?.iconUrl, 'https://example.com/c1.png');
});
