import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePlaylist, normalizePlaylist, parseXmltv, parseXmltvPrograms, enrichPlaylistWithEpg } from '../dist/index.js';

test('enrich playlist items with EPG categories and icon', () => {
  const playlist = `#EXTM3U\n#EXTINF:-1 tvg-id=\"news\",News Channel\nhttp://example.com/news`;
  const xmlCh = readFileSync(new URL('./xmltv_programs_sample.xml', import.meta.url), 'utf8');
  const { channels } = parseXmltv(xmlCh);
  const { programs } = parseXmltvPrograms(xmlCh);
  const pl = normalizePlaylist(parsePlaylist(playlist));
  const enr = enrichPlaylistWithEpg(pl, channels, programs, { topNCategories: 2 });
  const ch = enr.items[0];
  assert.ok(ch.extras?.epg);
  assert.deepEqual(ch.extras?.epg?.categories, ['News', 'Politics']);
  // No icon in sample for 'news' channel, so logo should remain undefined
  assert.equal(ch.tvg?.logo, undefined);
});
