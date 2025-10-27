/**
 * HLS Master Playlist Tests
 * Tests for parsing HLS master playlists (variant streams)
 */

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseHlsPlaylist, isMasterPlaylist } from "../dist/index.js";

const fixturesDir = join(import.meta.dirname, "hls-fixtures");

function loadFixture(name) {
  return readFileSync(join(fixturesDir, name), "utf8");
}

test("HLS Simple Master Playlist", () => {
  const text = loadFixture("master-simple.m3u8");
  const playlist = parseHlsPlaylist(text);

  assert.ok(isMasterPlaylist(playlist), "Should be a master playlist");
  assert.strictEqual(playlist.type, "master");
  assert.strictEqual(playlist.version, 3);
  assert.strictEqual(playlist.variants.length, 3);

  // Check first variant (720p)
  const v0 = playlist.variants[0];
  assert.strictEqual(v0.uri, "720p.m3u8");
  assert.strictEqual(v0.bandwidth, 1280000);
  assert.ok(v0.resolution);
  assert.strictEqual(v0.resolution.width, 720);
  assert.strictEqual(v0.resolution.height, 404);
  assert.strictEqual(v0.codecs, "avc1.42e01e,mp4a.40.2");

  // Check second variant (1080p)
  const v1 = playlist.variants[1];
  assert.strictEqual(v1.uri, "1080p.m3u8");
  assert.strictEqual(v1.bandwidth, 2560000);
  assert.strictEqual(v1.resolution.width, 1280);
  assert.strictEqual(v1.resolution.height, 720);

  // Check third variant (1080p-high)
  const v2 = playlist.variants[2];
  assert.strictEqual(v2.uri, "1080p-high.m3u8");
  assert.strictEqual(v2.bandwidth, 7680000);
  assert.strictEqual(v2.resolution.width, 1920);
  assert.strictEqual(v2.resolution.height, 1080);
});

test("HLS Complex Master Playlist with Renditions", () => {
  const text = loadFixture("master-complex.m3u8");
  const playlist = parseHlsPlaylist(text);

  assert.ok(isMasterPlaylist(playlist));
  assert.strictEqual(playlist.version, 6);
  assert.strictEqual(playlist.independentSegments, true);

  // Check variants
  assert.strictEqual(playlist.variants.length, 4);

  const v0 = playlist.variants[0];
  assert.strictEqual(v0.uri, "360p/prog_index.m3u8");
  assert.strictEqual(v0.bandwidth, 1280000);
  assert.strictEqual(v0.averageBandwidth, 1000000);
  assert.strictEqual(v0.resolution.width, 640);
  assert.strictEqual(v0.resolution.height, 360);
  assert.strictEqual(v0.frameRate, 29.97);
  assert.strictEqual(v0.audio, "audio-aac");
  assert.strictEqual(v0.subtitles, "subs");

  // Check 1080p variant with VIDEO-RANGE
  const v3 = playlist.variants[3];
  assert.strictEqual(v3.resolution.width, 1920);
  assert.strictEqual(v3.resolution.height, 1080);
  assert.strictEqual(v3.videoRange, "SDR");

  // Check audio renditions
  assert.ok(playlist.renditions);
  const audioRenditions = playlist.renditions.filter((r) => r.type === "AUDIO");
  assert.strictEqual(audioRenditions.length, 2);

  const audioEn = audioRenditions[0];
  assert.strictEqual(audioEn.type, "AUDIO");
  assert.strictEqual(audioEn.groupId, "audio-aac");
  assert.strictEqual(audioEn.name, "English");
  assert.strictEqual(audioEn.language, "en");
  assert.strictEqual(audioEn.default, true);
  assert.strictEqual(audioEn.autoSelect, true);
  assert.strictEqual(audioEn.uri, "audio/en/prog_index.m3u8");

  const audioEs = audioRenditions[1];
  assert.strictEqual(audioEs.name, "Spanish");
  assert.strictEqual(audioEs.language, "es");
  assert.strictEqual(audioEs.default, undefined); // Not default
  assert.strictEqual(audioEs.uri, "audio/es/prog_index.m3u8");

  // Check subtitle renditions
  const subRenditions = playlist.renditions.filter(
    (r) => r.type === "SUBTITLES",
  );
  assert.strictEqual(subRenditions.length, 2);

  const subEn = subRenditions[0];
  assert.strictEqual(subEn.type, "SUBTITLES");
  assert.strictEqual(subEn.groupId, "subs");
  assert.strictEqual(subEn.name, "English");
  assert.strictEqual(subEn.default, true);

  // Check I-frame streams
  assert.ok(playlist.iFrameStreams);
  assert.strictEqual(playlist.iFrameStreams.length, 2);

  const iframe0 = playlist.iFrameStreams[0];
  assert.strictEqual(iframe0.uri, "360p/iframe_index.m3u8");
  assert.strictEqual(iframe0.bandwidth, 365875);
  assert.strictEqual(iframe0.resolution.width, 640);
  assert.strictEqual(iframe0.resolution.height, 360);
  assert.strictEqual(iframe0.codecs, "avc1.42e01e");
});

test("HLS Master Playlist with SESSION-DATA", () => {
  const text = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-SESSION-DATA:DATA-ID="com.example.title",VALUE="My Video Title"
#EXT-X-SESSION-DATA:DATA-ID="com.example.description",URI="https://example.com/desc.json",LANGUAGE="en"
#EXT-X-STREAM-INF:BANDWIDTH=1280000
stream.m3u8
`;

  const playlist = parseHlsPlaylist(text);
  assert.ok(isMasterPlaylist(playlist));
  assert.ok(playlist.sessionData);
  assert.strictEqual(playlist.sessionData.length, 2);

  const sd0 = playlist.sessionData[0];
  assert.strictEqual(sd0.dataId, "com.example.title");
  assert.strictEqual(sd0.value, "My Video Title");

  const sd1 = playlist.sessionData[1];
  assert.strictEqual(sd1.dataId, "com.example.description");
  assert.strictEqual(sd1.uri, "https://example.com/desc.json");
  assert.strictEqual(sd1.language, "en");
});

test("HLS Master Playlist with SESSION-KEY", () => {
  const text = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-SESSION-KEY:METHOD=AES-128,URI="https://example.com/key.bin",IV=0x12345678901234567890123456789012
#EXT-X-STREAM-INF:BANDWIDTH=1280000
stream.m3u8
`;

  const playlist = parseHlsPlaylist(text);
  assert.ok(playlist.sessionKeys);
  assert.strictEqual(playlist.sessionKeys.length, 1);

  const key = playlist.sessionKeys[0];
  assert.strictEqual(key.method, "AES-128");
  assert.strictEqual(key.uri, "https://example.com/key.bin");
  assert.strictEqual(key.iv, "0x12345678901234567890123456789012");
});

test("HLS Master Playlist with START", () => {
  const text = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-START:TIME-OFFSET=10.5,PRECISE=NO
#EXT-X-STREAM-INF:BANDWIDTH=1280000
stream.m3u8
`;

  const playlist = parseHlsPlaylist(text);
  assert.ok(playlist.start);
  assert.strictEqual(playlist.start.timeOffset, 10.5);
  assert.strictEqual(playlist.start.precise, false);
});

test("HLS Master Playlist with Closed Captions", () => {
  const text = `#EXTM3U
#EXT-X-MEDIA:TYPE=CLOSED-CAPTIONS,GROUP-ID="cc",NAME="English CC",LANGUAGE="en",INSTREAM-ID="CC1",DEFAULT=YES
#EXT-X-STREAM-INF:BANDWIDTH=1280000,CLOSED-CAPTIONS="cc"
stream.m3u8
`;

  const playlist = parseHlsPlaylist(text);
  assert.ok(playlist.renditions);

  const ccRendition = playlist.renditions.find(
    (r) => r.type === "CLOSED-CAPTIONS",
  );
  assert.ok(ccRendition);
  assert.strictEqual(ccRendition.groupId, "cc");
  assert.strictEqual(ccRendition.name, "English CC");
  assert.strictEqual(ccRendition.instreamId, "CC1");
  assert.strictEqual(ccRendition.default, true);

  const variant = playlist.variants[0];
  assert.strictEqual(variant.closedCaptions, "cc");
});

test("HLS Master Playlist with CHARACTERISTICS and CHANNELS", () => {
  const text = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",LANGUAGE="en",CHARACTERISTICS="public.accessibility.describes-video",CHANNELS="2"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,AUDIO="audio"
stream.m3u8
`;

  const playlist = parseHlsPlaylist(text);
  const audioRendition = playlist.renditions.find((r) => r.type === "AUDIO");

  assert.ok(audioRendition);
  assert.strictEqual(
    audioRendition.characteristics,
    "public.accessibility.describes-video",
  );
  assert.strictEqual(audioRendition.channels, "2");
});

test("HLS Master Playlist with FORCED Subtitles", () => {
  const text = `#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Forced",LANGUAGE="en",FORCED=YES,URI="forced.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,SUBTITLES="subs"
stream.m3u8
`;

  const playlist = parseHlsPlaylist(text);
  const subRendition = playlist.renditions.find((r) => r.type === "SUBTITLES");

  assert.ok(subRendition);
  assert.strictEqual(subRendition.forced, true);
});

test("HLS Master Playlist with SUPPLEMENTAL-CODECS", () => {
  const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,CODECS="avc1.42e01e,mp4a.40.2",SUPPLEMENTAL-CODECS="dvh1.05.01"
stream.m3u8
`;

  const playlist = parseHlsPlaylist(text);
  const variant = playlist.variants[0];

  assert.strictEqual(variant.codecs, "avc1.42e01e,mp4a.40.2");
  assert.strictEqual(variant.supplementalCodecs, "dvh1.05.01");
});

test("HLS Master Playlist Warnings - No Variants", () => {
  // A master playlist must have at least one #EXT-X-STREAM-INF tag
  // Without it, the parser treats it as a media playlist (which also fails validation)
  // Let's test a master playlist with a malformed variant instead
  const text = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1280000
`;

  const playlist = parseHlsPlaylist(text);
  // This will be detected as master but with warning about missing URI for variant
  assert.ok(isMasterPlaylist(playlist));
  // The parser will create an empty variants array since no URI follows
  assert.strictEqual(playlist.variants.length, 0);
});

test("HLS Master Playlist with Custom X- Attributes", () => {
  const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,X-CUSTOM-ATTR="custom-value"
stream.m3u8
`;

  const playlist = parseHlsPlaylist(text);
  const variant = playlist.variants[0];

  assert.ok(variant.customAttributes);
  assert.strictEqual(variant.customAttributes["x-custom-attr"], "custom-value");
});
