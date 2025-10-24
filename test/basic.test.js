import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePlaylist } from '../src/index.js';
import { normalizePlaylist } from '../src/normalize.js';
import { isXtreamUrl, parseXtream, buildXtreamM3uUrl } from '../src/xtream.js';

test('parses sample playlist', () => {
  const text = readFileSync(new URL('./sample.m3u', import.meta.url), 'utf8');
  const res = normalizePlaylist(parsePlaylist(text));
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

test('xtream helpers', () => {
  const url = 'http://demo.example.com:80/get.php?username=u&password=p&type=m3u&output=ts';
  assert.ok(isXtreamUrl(url));
  const info = parseXtream(url);
  assert.equal(info?.host, 'http://demo.example.com:80');
  assert.equal(info?.username, 'u');
  assert.equal(info?.password, 'p');
  assert.equal(info?.type, 'm3u');
  assert.equal(info?.output, 'ts');

  const m3uUrl = buildXtreamM3uUrl({ host: 'http://demo.example.com:80', username: 'u', password: 'p' }, { type: 'm3u', output: 'ts' });
  assert.ok(m3uUrl.includes('/get.php'));
});
