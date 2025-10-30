import test from "node:test";
import assert from "node:assert/strict";
import { parsePlaylist } from "../dist/index.js";

test("parse tvg-type to streamType field - live", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-type="live",Live Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.streamType, "live");
});

test("parse tvg-type to streamType field - vod", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-type="vod",Movie
http://example.com/movie.mp4`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.streamType, "vod");
});

test("parse tvg-type to streamType field - movie (alias for vod)", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-type="movie",Movie
http://example.com/movie.mp4`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.streamType, "vod");
});

test("parse tvg-type to streamType field - video (alias for vod)", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-type="video",Video
http://example.com/video.mp4`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.streamType, "vod");
});

test("parse tvg-type to streamType field - series", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-type="series",TV Show
http://example.com/series.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.streamType, "series");
});

test("parse tvg-type to streamType field - radio", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-type="radio",Radio Station
http://example.com/radio.mp3`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.streamType, "radio");
});

test("parse tvg-type - case insensitive", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-type="LIVE",Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.streamType, "live");
});

test("parse tvg-type - missing field", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-id="ch1",Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.streamType, undefined);
});

test("parse audio-track to audioTrack field", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 audio-track="eng",Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.audioTrack, "eng");
});

test("parse audio-track with multiple languages", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 audio-track="eng,spa,fra",Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.audioTrack, "eng,spa,fra");
});

test("parse aspect-ratio to aspectRatio field", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 aspect-ratio="16:9",Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.aspectRatio, "16:9");
});

test("parse aspect-ratio - various formats", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 aspect-ratio="4:3",Channel 1
http://example.com/stream1.m3u8
#EXTINF:-1 aspect-ratio="21:9",Channel 2
http://example.com/stream2.m3u8
#EXTINF:-1 aspect-ratio="1.78",Channel 3
http://example.com/stream3.m3u8`;

  const playlist = parsePlaylist(m3u);

  assert.equal(playlist.items[0].aspectRatio, "4:3");
  assert.equal(playlist.items[1].aspectRatio, "21:9");
  assert.equal(playlist.items[2].aspectRatio, "1.78");
});

test("parse adult flag - adult=1 to isAdult=true", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 adult="1",Adult Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.isAdult, true);
});

test("parse adult flag - adult=0 to isAdult=undefined", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 adult="0",Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  // Parser only sets to true for "1", otherwise undefined
  assert.equal(entry.isAdult, undefined);
});

test("parse adult flag - missing field", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-id="ch1",Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.isAdult, undefined);
});

test("parse tvg-rec flag - tvg-rec=1 to recording=true", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-rec="1",Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.recording, true);
});

test("parse tvg-rec flag - tvg-rec=0 to recording=undefined", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-rec="0",Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  // Parser only sets to true for "1", otherwise undefined
  assert.equal(entry.recording, undefined);
});

test("parse tvg-rec flag - missing field", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-id="ch1",Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.recording, undefined);
});

test("parse URL with pipe params - single header", () => {
  const m3u = `#EXTM3U
#EXTINF:-1,Channel
http://example.com/stream.m3u8|X-Custom-Header=Value123`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.url, "http://example.com/stream.m3u8");
  assert.ok(entry.http?.headers);
  assert.equal(entry.http.headers["X-Custom-Header"], "Value123");
});

test("parse URL with pipe params - multiple headers", () => {
  const m3u = `#EXTM3U
#EXTINF:-1,Channel
http://example.com/stream.m3u8|Header1=Value1&Header2=Value2`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.url, "http://example.com/stream.m3u8");
  assert.equal(entry.http?.headers?.["Header1"], "Value1");
  assert.equal(entry.http?.headers?.["Header2"], "Value2");
});

test("parse URL with pipe params - User-Agent", () => {
  const m3u = `#EXTM3U
#EXTINF:-1,Channel
http://example.com/stream.m3u8|User-Agent=CustomAgent/2.0`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.url, "http://example.com/stream.m3u8");
  // Pipe headers go into headers object, not parsed specially
  assert.ok(entry.http?.headers?.["User-Agent"] === "CustomAgent/2.0");
});

test("parse URL with pipe params - Referer", () => {
  const m3u = `#EXTM3U
#EXTINF:-1,Channel
http://example.com/stream.m3u8|Referer=http://referrer.com`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.url, "http://example.com/stream.m3u8");
  // Pipe headers go into headers object
  assert.ok(entry.http?.headers?.["Referer"] === "http://referrer.com");
});

test("merge pipe headers with EXTVLCOPT headers", () => {
  const m3u = `#EXTM3U
#EXTINF:-1,Channel
#EXTVLCOPT:http-user-agent=VLCAgent/1.0
#EXTVLCOPT:http-header=X-VLC-Header: VLCValue
http://example.com/stream.m3u8|User-Agent=PipeAgent/2.0&X-Pipe-Header=PipeValue`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.url, "http://example.com/stream.m3u8");

  // EXTVLCOPT sets userAgent field directly
  assert.equal(entry.http?.userAgent, "VLCAgent/1.0");

  // Both headers should be present
  assert.ok(entry.http?.headers?.["X-VLC-Header"]);
  assert.ok(entry.http?.headers?.["X-Pipe-Header"]);
  assert.ok(entry.http?.headers?.["User-Agent"]); // Pipe agent goes to headers
  assert.equal(entry.http.headers["X-Pipe-Header"], "PipeValue");
});

test("parse URL with pipe params - special characters in values", () => {
  const m3u = `#EXTM3U
#EXTINF:-1,Channel
http://example.com/stream.m3u8|Authorization=Bearer abc123==&X-Custom=Test+Value`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.url, "http://example.com/stream.m3u8");
  assert.ok(entry.http?.headers?.["Authorization"]);
  assert.ok(entry.http.headers["Authorization"].includes("Bearer"));
});

test("parse all enhanced fields together", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-type="live" audio-track="eng,spa" aspect-ratio="16:9" adult="1" tvg-rec="1",Channel
http://example.com/stream.m3u8|User-Agent=Custom/1.0`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.streamType, "live");
  assert.equal(entry.audioTrack, "eng,spa");
  assert.equal(entry.aspectRatio, "16:9");
  assert.equal(entry.isAdult, true);
  assert.equal(entry.recording, true);
  assert.equal(entry.url, "http://example.com/stream.m3u8");
  // Pipe User-Agent goes to headers object
  assert.ok(entry.http?.headers?.["User-Agent"] === "Custom/1.0");
});

test("parse URL without pipe params - normal behavior", () => {
  const m3u = `#EXTM3U
#EXTINF:-1,Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.url, "http://example.com/stream.m3u8");
  assert.ok(!entry.http?.headers);
});

test("parse URL with pipe but no params", () => {
  const m3u = `#EXTM3U
#EXTINF:-1,Channel
http://example.com/stream.m3u8|`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.url, "http://example.com/stream.m3u8");
});

test("parse adult flag - case insensitive attribute name", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 ADULT="1",Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  // Attributes are normalized to lowercase
  assert.equal(entry.isAdult, true);
});

test("parse multiple entries with mixed enhanced fields", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-type="live" aspect-ratio="16:9",Live Channel
http://example.com/live.m3u8
#EXTINF:-1 tvg-type="vod" adult="1",Movie
http://example.com/movie.mp4
#EXTINF:-1 tvg-type="radio" audio-track="eng",Radio
http://example.com/radio.mp3|User-Agent=Radio/1.0`;

  const playlist = parsePlaylist(m3u);

  assert.equal(playlist.items.length, 3);

  // First entry
  assert.equal(playlist.items[0].streamType, "live");
  assert.equal(playlist.items[0].aspectRatio, "16:9");
  assert.ok(!playlist.items[0].isAdult);

  // Second entry
  assert.equal(playlist.items[1].streamType, "vod");
  assert.equal(playlist.items[1].isAdult, true);

  // Third entry
  assert.equal(playlist.items[2].streamType, "radio");
  assert.equal(playlist.items[2].audioTrack, "eng");
  // Pipe User-Agent goes to headers object
  assert.ok(playlist.items[2].http?.headers?.["User-Agent"] === "Radio/1.0");
});

test("parse URL with pipe params - Cookie header", () => {
  const m3u = `#EXTM3U
#EXTINF:-1,Channel
http://example.com/stream.m3u8|Cookie=session=abc123; token=xyz`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  assert.equal(entry.url, "http://example.com/stream.m3u8");
  assert.ok(entry.http?.cookie || entry.http?.headers?.["Cookie"]);
});

test("parse tvg-type with unknown value - stores in attrs", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-type="unknown-type",Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  // Should not set streamType for unknown values
  assert.equal(entry.streamType, undefined);
  // Should still be in attrs
  assert.equal(entry.attrs["tvg-type"], "unknown-type");
});

test("parse enhanced fields - preserve in attrs", () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-type="live" audio-track="eng" aspect-ratio="16:9" adult="1" tvg-rec="1",Channel
http://example.com/stream.m3u8`;

  const playlist = parsePlaylist(m3u);
  const entry = playlist.items[0];

  // Enhanced fields should also be in attrs for backward compatibility
  assert.ok(entry.attrs["tvg-type"]);
  assert.ok(entry.attrs["audio-track"]);
  assert.ok(entry.attrs["aspect-ratio"]);
  assert.ok(entry.attrs["adult"]);
  assert.ok(entry.attrs["tvg-rec"]);
});
