import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePlaylist } from '../src/index.js';

test('parses sample playlist', () => {
  const text = readFileSync(new URL('./sample.m3u', import.meta.url), 'utf8');
  const res = parsePlaylist(text);
  assert.equal(res.header.tvgUrls[0], 'https://example.com/epg.xml');
  assert.equal(res.header.tvgShift, 120); // minutes
  assert.equal(res.items.length, 2);
  const ch = res.items[0];
  assert.equal(ch.name, 'BBC One HD');
  assert.equal(ch.tvg?.id, 'BBC1.uk');
  assert.ok(ch.group?.includes('UK'));
  assert.equal(ch.http?.userAgent, 'MyPlayer/1.0');
  assert.equal(ch.http?.headers?.['X-Test'], '123');
  assert.equal(ch.kodiProps?.['inputstream.adaptive.manifest_type'], 'hls');
});
