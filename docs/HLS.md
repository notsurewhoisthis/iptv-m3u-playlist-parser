# HLS Parser Documentation

## Overview

The HLS (HTTP Live Streaming) parser provides comprehensive support for parsing Apple HLS M3U8 playlists, implementing **70+ tags** from the [Apple HLS specification](https://developer.apple.com/documentation/http-live-streaming).

**New in v0.3.0** - Full HLS support with dual-parser architecture.

## Features

### ✅ Complete Tag Support

#### Media Playlist Tags (Segment-Based)

- `#EXT-X-VERSION` - Protocol version
- `#EXT-X-TARGETDURATION` - Maximum segment duration
- `#EXT-X-MEDIA-SEQUENCE` - First segment sequence number
- `#EXT-X-DISCONTINUITY-SEQUENCE` - Discontinuity sequence
- `#EXT-X-PLAYLIST-TYPE` - VOD, EVENT, or LIVE
- `#EXT-X-ENDLIST` - End of playlist marker
- `#EXT-X-I-FRAMES-ONLY` - I-frames only indicator
- `#EXT-X-INDEPENDENT-SEGMENTS` - Independent segments flag

#### Segment Tags

- `#EXTINF` - Segment duration and title
- `#EXT-X-BYTERANGE` - Byte-range retrieval
- `#EXT-X-DISCONTINUITY` - Discontinuity marker
- `#EXT-X-GAP` - Missing segment indicator
- `#EXT-X-PROGRAM-DATE-TIME` - Absolute date-time
- `#EXT-X-KEY` - Encryption (NONE, AES-128, SAMPLE-AES, SAMPLE-AES-CENC, SAMPLE-AES-CTR)
- `#EXT-X-MAP` - Media initialization section (fMP4)
- `#EXT-X-DATERANGE` - Timed metadata and ad insertion

#### Master Playlist Tags

- `#EXT-X-STREAM-INF` - Variant streams with quality levels
- `#EXT-X-I-FRAME-STREAM-INF` - I-frame streams for trick play
- `#EXT-X-MEDIA` - Alternative renditions (audio, video, subtitles, closed captions)
- `#EXT-X-SESSION-DATA` - Session metadata
- `#EXT-X-SESSION-KEY` - Master encryption key

#### Low-Latency HLS Tags

- `#EXT-X-SERVER-CONTROL` - Server capability directives
- `#EXT-X-PART-INF` - Partial segment information
- `#EXT-X-SKIP` - Delta update skip directive
- `#EXT-X-PRELOAD-HINT` - Resource preload hints
- `#EXT-X-RENDITION-REPORT` - Rendition status reports

#### Advanced Features

- `#EXT-X-START` - Preferred playback start position
- `#EXT-X-DEFINE` - Variable substitution
- Custom `X-` attributes support
- Variable substitution (`{\$VAR}`)

## Quick Start

### Basic Usage

```typescript
import { parseHlsPlaylist } from "iptv-m3u-playlist-parser";

const m3u8Text = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:9.9,
segment00.ts
#EXTINF:9.9,
segment01.ts
#EXT-X-ENDLIST
`;

const playlist = parseHlsPlaylist(m3u8Text);

console.log(playlist.type); // "media"
console.log(playlist.playlistType); // "VOD"
console.log(playlist.segments.length); // 2
console.log(playlist.segments[0].duration); // 9.9
console.log(playlist.segments[0].uri); // "segment00.ts"
```

### Auto-Detection

Let the parser automatically detect whether your playlist is HLS or IPTV:

```typescript
import { parsePlaylistAuto } from "iptv-m3u-playlist-parser";

const text = await fetchPlaylist(url);
const result = parsePlaylistAuto(text);

if (result.format === "hls") {
  // HLS playlist
  const hlsPlaylist = result.playlist;
  if (hlsPlaylist.type === "master") {
    console.log(
      "Master playlist with",
      hlsPlaylist.variants.length,
      "variants",
    );
  } else {
    console.log("Media playlist with", hlsPlaylist.segments.length, "segments");
  }
} else {
  // IPTV playlist
  const iptvPlaylist = result.playlist;
  console.log("IPTV playlist with", iptvPlaylist.items.length, "channels");
}
```

### Manual Detection

```typescript
import { detectPlaylistType } from "iptv-m3u-playlist-parser";

const format = detectPlaylistType(m3u8Text);
console.log(format); // "hls" or "iptv"
```

## Examples

### Media Playlist (VOD)

```typescript
import { parseHlsPlaylist, isMediaPlaylist } from "iptv-m3u-playlist-parser";

const vod = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:9.9,Segment 1
segment00.ts
#EXTINF:9.9,Segment 2
segment01.ts
#EXTINF:9.9,Segment 3
segment02.ts
#EXT-X-ENDLIST
`;

const playlist = parseHlsPlaylist(vod);

if (isMediaPlaylist(playlist)) {
  console.log("VOD Playlist");
  console.log("Version:", playlist.version); // 3
  console.log("Target Duration:", playlist.targetDuration); // 10
  console.log("Playlist Type:", playlist.playlistType); // "VOD"
  console.log("End List:", playlist.endList); // true
  console.log("Segments:", playlist.segments.length); // 3

  playlist.segments.forEach((seg, i) => {
    console.log(`Segment ${i}: ${seg.uri} (${seg.duration}s)`);
  });
}
```

### Master Playlist with Variants

```typescript
import { parseHlsPlaylist, isMasterPlaylist } from "iptv-m3u-playlist-parser";

const master = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=720x404,CODECS="avc1.42e01e,mp4a.40.2"
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2560000,RESOLUTION=1280x720,CODECS="avc1.42e01e,mp4a.40.2"
1080p.m3u8
`;

const playlist = parseHlsPlaylist(master);

if (isMasterPlaylist(playlist)) {
  console.log("Master Playlist");
  console.log("Variants:", playlist.variants.length); // 2

  // Sort variants by bandwidth
  const sorted = [...playlist.variants].sort(
    (a, b) => a.bandwidth - b.bandwidth,
  );

  sorted.forEach((variant) => {
    console.log(
      `${variant.resolution?.width}x${variant.resolution?.height} @ ${variant.bandwidth}bps`,
    );
    console.log(`  URI: ${variant.uri}`);
    console.log(`  Codecs: ${variant.codecs}`);
  });
}
```

### Encrypted Content

```typescript
const encrypted = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-KEY:METHOD=AES-128,URI="https://example.com/key.bin",IV=0x12345678901234567890123456789012
#EXTINF:9.9,
segment00.ts
#EXTINF:9.9,
segment01.ts
#EXT-X-ENDLIST
`;

const playlist = parseHlsPlaylist(encrypted);

playlist.segments.forEach((seg) => {
  if (seg.key?.method !== "NONE") {
    console.log("Encrypted segment:", seg.uri);
    console.log("  Method:", seg.key?.method); // "AES-128"
    console.log("  Key URI:", seg.key?.uri);
    console.log("  IV:", seg.key?.iv);
  }
});
```

### Master Playlist with Audio/Subtitle Renditions

```typescript
const complex = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-INDEPENDENT-SEGMENTS

#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",LANGUAGE="en",DEFAULT=YES,AUTOSELECT=YES,URI="audio/en.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Spanish",LANGUAGE="es",AUTOSELECT=YES,URI="audio/es.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",LANGUAGE="en",DEFAULT=YES,URI="subs/en.m3u8"

#EXT-X-STREAM-INF:BANDWIDTH=2560000,RESOLUTION=1280x720,AUDIO="audio",SUBTITLES="subs"
video/720p.m3u8
`;

const playlist = parseHlsPlaylist(complex);

if (isMasterPlaylist(playlist)) {
  // Get audio renditions
  const audioRenditions = playlist.renditions?.filter(
    (r) => r.type === "AUDIO",
  );
  console.log("Audio tracks:");
  audioRenditions?.forEach((audio) => {
    console.log(
      `  ${audio.name} (${audio.language}) ${audio.default ? "[DEFAULT]" : ""}`,
    );
  });

  // Get subtitle renditions
  const subRenditions = playlist.renditions?.filter(
    (r) => r.type === "SUBTITLES",
  );
  console.log("Subtitles:");
  subRenditions?.forEach((sub) => {
    console.log(`  ${sub.name} (${sub.language})`);
  });
}
```

### Byte-Range Segments

```typescript
const byteRange = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
#EXT-X-BYTERANGE:75232@0
segment.ts
#EXTINF:10.0,
#EXT-X-BYTERANGE:82112@75232
segment.ts
#EXT-X-ENDLIST
`;

const playlist = parseHlsPlaylist(byteRange);

playlist.segments.forEach((seg) => {
  if (seg.byteRange) {
    console.log(`${seg.uri}:`);
    console.log(`  Byte range: ${seg.byteRange.length} bytes`);
    if (seg.byteRange.offset !== undefined) {
      console.log(`  Offset: ${seg.byteRange.offset}`);
    }
  }
});
```

### Date Ranges (Ad Insertion)

```typescript
const dateRange = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-DATERANGE:ID="ad-1",CLASS="com.apple.hls.interstitial",START-DATE="2024-01-15T10:00:00.000Z",DURATION=30.0
#EXTINF:9.9,
segment00.ts
#EXT-X-ENDLIST
`;

const playlist = parseHlsPlaylist(dateRange);

playlist.segments.forEach((seg) => {
  seg.dateRanges?.forEach((dr) => {
    console.log("Date Range:", dr.id);
    console.log("  Class:", dr.class);
    console.log("  Start:", dr.startDate);
    console.log("  Duration:", dr.duration);
  });
});
```

## Type System

### Master Playlist

```typescript
interface HlsMasterPlaylist {
  type: "master";
  version?: number;
  variants: HlsVariantStream[];
  iFrameStreams?: HlsIFrameStream[];
  renditions?: HlsRendition[];
  sessionData?: HlsSessionData[];
  sessionKeys?: HlsSessionKey[];
  start?: HlsStart;
  independentSegments?: boolean;
  customAttributes?: Dict;
  warnings: string[];
}
```

### Media Playlist

```typescript
interface HlsMediaPlaylist {
  type: "media";
  version?: number;
  targetDuration: number;
  mediaSequence?: number;
  discontinuitySequence?: number;
  playlistType?: "VOD" | "EVENT" | "LIVE";
  endList: boolean;
  iFramesOnly?: boolean;
  segments: HlsMediaSegment[];
  serverControl?: HlsServerControl;
  partInf?: HlsPartInf;
  start?: HlsStart;
  skip?: HlsSkip;
  preloadHints?: HlsPreloadHint[];
  renditionReports?: HlsRenditionReport[];
  independentSegments?: boolean;
  customAttributes?: Dict;
  warnings: string[];
}
```

### Media Segment

```typescript
interface HlsMediaSegment {
  uri: string;
  duration: number;
  title?: string;
  byteRange?: HlsByteRange;
  key?: HlsKey;
  map?: HlsMap;
  discontinuity?: boolean;
  gap?: boolean;
  programDateTime?: string;
  dateRanges?: HlsDateRange[];
}
```

### Variant Stream

```typescript
interface HlsVariantStream {
  uri: string;
  bandwidth: number;
  averageBandwidth?: number;
  codecs?: string;
  supplementalCodecs?: string;
  resolution?: HlsResolution;
  frameRate?: number;
  videoRange?: "SDR" | "PQ" | "HLG";
  audio?: string;
  video?: string;
  subtitles?: string;
  closedCaptions?: string;
  customAttributes?: Dict;
}
```

## Type Guards

```typescript
import { isMasterPlaylist, isMediaPlaylist } from "iptv-m3u-playlist-parser";

const playlist = parseHlsPlaylist(text);

if (isMasterPlaylist(playlist)) {
  // TypeScript knows playlist is HlsMasterPlaylist
  console.log(playlist.variants);
}

if (isMediaPlaylist(playlist)) {
  // TypeScript knows playlist is HlsMediaPlaylist
  console.log(playlist.segments);
}
```

## Advanced Features

### Variable Substitution

```typescript
const withVars = `#EXTM3U
#EXT-X-DEFINE:NAME="baseUrl",VALUE="https://example.com"
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:9.9,
{\$baseUrl}/segment00.ts
#EXT-X-ENDLIST
`;

const playlist = parseHlsPlaylist(withVars);
console.log(playlist.segments[0].uri); // "https://example.com/segment00.ts"
```

### Custom X- Attributes

```typescript
const custom = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,X-CUSTOM-QUALITY="HD",X-CUSTOM-REGION="US"
stream.m3u8
`;

const playlist = parseHlsPlaylist(custom);
const variant = playlist.variants[0];
console.log(variant.customAttributes);
// { "x-custom-quality": "HD", "x-custom-region": "US" }
```

## Performance

The HLS parser is optimized for performance:

- **Pre-compiled regex patterns** - All 70+ patterns compiled once at module load
- **Efficient line processing** - Single-pass parsing
- **Minimal allocations** - Reuses regex instances, avoids unnecessary object creation
- **Type-safe** - Full TypeScript support with zero runtime overhead

## Compatibility

- **Zero Breaking Changes** - Existing IPTV functionality unchanged
- **Dual Parser Architecture** - HLS and IPTV parsers work side-by-side
- **Auto-Detection** - Smart detection routes to correct parser
- **Backward Compatible** - All existing code continues to work

## Warnings

The parser provides helpful warnings for common issues:

```typescript
const playlist = parseHlsPlaylist(text);

if (playlist.warnings.length > 0) {
  console.log("Parsing warnings:");
  playlist.warnings.forEach((w) => console.log("  -", w));
}
```

Common warnings:

- Missing `#EXTM3U` header
- Missing `#EXT-X-TARGETDURATION` (required for media playlists)
- No variant streams in master playlist
- Invalid tag format

## Error Handling

The parser is lenient and handles malformed playlists gracefully:

```typescript
try {
  const playlist = parseHlsPlaylist(text);

  // Check for warnings
  if (playlist.warnings.length > 0) {
    console.warn("Playlist has warnings:", playlist.warnings);
  }

  // Proceed with valid data
  if (isMediaPlaylist(playlist) && playlist.segments.length > 0) {
    // Use segments...
  }
} catch (error) {
  console.error("Failed to parse playlist:", error);
}
```

## See Also

- [Apple HLS Specification](https://developer.apple.com/documentation/http-live-streaming)
- [RFC 8216 - HTTP Live Streaming](https://datatracker.ietf.org/doc/html/rfc8216)
- [Main README](../README.md)
- [IPTV Parser Documentation](../README.md#iptv-parser)
