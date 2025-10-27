/**
 * HLS (HTTP Live Streaming) Parser
 * Comprehensive parser for Apple HLS M3U8 playlists
 * Implements all 70+ tags from the HLS specification
 */

import {
  HlsPlaylist,
  HlsMasterPlaylist,
  HlsMediaPlaylist,
  HlsMediaSegment,
  HlsVariantStream,
  HlsIFrameStream,
  HlsRendition,
  HlsKey,
  HlsByteRange,
  HlsDateRange,
  HlsMap,
  HlsSessionData,
  HlsSessionKey,
  HlsServerControl,
  HlsPartInf,
  HlsStart,
  HlsSkip,
  HlsPreloadHint,
  HlsRenditionReport,
  EncryptionMethod,
  PlaylistType,
  MediaType,
  VideoRange,
  PreloadHintType,
  Dict,
} from "./hls-types.js";
import { splitLines, stripBOM, trimQuotes } from "./util.js";

// ========== Pre-Compiled Regex Patterns (70+ patterns) ==========

// Basic Tags
const VERSION_REGEX = /#EXT-X-VERSION:(\d+)\b/;
const TARGETDURATION_REGEX = /#EXT-X-TARGETDURATION:(\d+)\b/;
const MEDIA_SEQUENCE_REGEX = /#EXT-X-MEDIA-SEQUENCE:(\d+)\b/;
const DISCONTINUITY_SEQUENCE_REGEX = /#EXT-X-DISCONTINUITY-SEQUENCE:(\d+)\b/;
const PLAYLIST_TYPE_REGEX = /#EXT-X-PLAYLIST-TYPE:(.+)\b/;
const ENDLIST_REGEX = /#EXT-X-ENDLIST/;
const IFRAMES_ONLY_REGEX = /#EXT-X-I-FRAMES-ONLY/;
const INDEPENDENT_SEGMENTS_REGEX = /#EXT-X-INDEPENDENT-SEGMENTS/;
const DISCONTINUITY_REGEX = /#EXT-X-DISCONTINUITY/;
const GAP_REGEX = /#EXT-X-GAP/;

// Segment Tags
const EXTINF_REGEX = /#EXTINF:\s*([\d.]+)\b/;
const EXTINF_TITLE_REGEX = /#EXTINF:[\d.]+\b,(.+)/;
const BYTERANGE_REGEX = /#EXT-X-BYTERANGE:(\d+(?:@\d+)?)\b/;
const PROGRAM_DATE_TIME_REGEX = /#EXT-X-PROGRAM-DATE-TIME:(.+)/;

// Encryption Key Attributes
const KEY_METHOD_REGEX =
  /METHOD=(NONE|AES-128|SAMPLE-AES|SAMPLE-AES-CENC|SAMPLE-AES-CTR)\s*(?:,|$)/;
const KEY_URI_REGEX = /URI="((?:[^"|\\]|\\.)*)"/;
const KEY_IV_REGEX = /IV=([^,\s]+)/;
const KEY_KEYFORMAT_REGEX = /KEYFORMAT="((?:[^"|\\]|\\.)*)"/;
const KEY_KEYFORMATVERSIONS_REGEX = /KEYFORMATVERSIONS="((?:[^"|\\]|\\.)*)"/;

// Map Attributes
const MAP_URI_REGEX = /URI="((?:[^"|\\]|\\.)*)"/;
const MAP_BYTERANGE_REGEX = /BYTERANGE="(\d+(?:@\d+)?)\b"/;

// Master Playlist - Stream Inf
const BANDWIDTH_REGEX = /[^-]BANDWIDTH=(\d+)\b/;
const AVERAGE_BANDWIDTH_REGEX = /AVERAGE-BANDWIDTH=(\d+)\b/;
const CODECS_REGEX = /CODECS="((?:[^"|\\]|\\.)*)"/;
const SUPPLEMENTAL_CODECS_REGEX = /SUPPLEMENTAL-CODECS="((?:[^"|\\]|\\.)*)"/;
const RESOLUTION_REGEX = /RESOLUTION=(\d+x\d+)/;
const FRAME_RATE_REGEX = /FRAME-RATE=([\d.]+)\b/;
const VIDEO_RANGE_REGEX = /VIDEO-RANGE=(SDR|PQ|HLG)/;
const AUDIO_GROUP_REGEX = /AUDIO="((?:[^"|\\]|\\.)*)"/;
const VIDEO_GROUP_REGEX = /VIDEO="((?:[^"|\\]|\\.)*)"/;
const SUBTITLES_GROUP_REGEX = /SUBTITLES="((?:[^"|\\]|\\.)*)"/;
const CLOSED_CAPTIONS_GROUP_REGEX = /CLOSED-CAPTIONS="((?:[^"|\\]|\\.)*)"/;

// Media Rendition
const MEDIA_TYPE_REGEX = /TYPE=(AUDIO|VIDEO|SUBTITLES|CLOSED-CAPTIONS)/;
const MEDIA_URI_REGEX = /URI="((?:[^"|\\]|\\.)*)"/;
const MEDIA_GROUP_ID_REGEX = /GROUP-ID="((?:[^"|\\]|\\.)*)"/;
const MEDIA_NAME_REGEX = /NAME="((?:[^"|\\]|\\.)*)"/;
const MEDIA_LANGUAGE_REGEX = /LANGUAGE="((?:[^"|\\]|\\.)*)"/;
const MEDIA_ASSOC_LANGUAGE_REGEX = /ASSOC-LANGUAGE="((?:[^"|\\]|\\.)*)"/;
const MEDIA_DEFAULT_REGEX = /DEFAULT=(NO|YES)/;
const MEDIA_AUTOSELECT_REGEX = /AUTOSELECT=(NO|YES)/;
const MEDIA_FORCED_REGEX = /FORCED=(NO|YES)/;
const MEDIA_INSTREAM_ID_REGEX = /INSTREAM-ID="((?:CC|SERVICE)\d+)"/;
const MEDIA_CHARACTERISTICS_REGEX = /CHARACTERISTICS="((?:[^"|\\]|\\.)*)"/;
const MEDIA_CHANNELS_REGEX = /CHANNELS="((?:[^"|\\]|\\.)*)"/;

// Date Range
const DATERANGE_ID_REGEX = /[:,]ID="((?:[^"|\\]|\\.)*)"/;
const DATERANGE_CLASS_REGEX = /CLASS="((?:[^"|\\]|\\.)*)"/;
const DATERANGE_START_DATE_REGEX = /START-DATE="((?:[^"|\\]|\\.)*)"/;
const DATERANGE_END_DATE_REGEX = /END-DATE="((?:[^"|\\]|\\.)*)"/;
const DATERANGE_DURATION_REGEX = /[:,]DURATION=([\d.]+)\b/;
const DATERANGE_PLANNED_DURATION_REGEX = /PLANNED-DURATION=([\d.]+)\b/;
const DATERANGE_END_ON_NEXT_REGEX = /END-ON-NEXT=(NO|YES)/;
const DATERANGE_CUE_REGEX = /CUE="((?:[^"|\\]|\\.)*)"/;
const DATERANGE_SCTE35_CMD_REGEX = /SCTE35-CMD=(0x[0-9A-Fa-f]+)/;
const DATERANGE_SCTE35_OUT_REGEX = /SCTE35-OUT=(0x[0-9A-Fa-f]+)/;
const DATERANGE_SCTE35_IN_REGEX = /SCTE35-IN=(0x[0-9A-Fa-f]+)/;

// Start
const START_TIME_OFFSET_REGEX = /TIME-OFFSET=(-?[\d.]+)\b/;
const START_PRECISE_REGEX = /PRECISE=(NO|YES)/;

// Server Control
const SERVER_CONTROL_CAN_SKIP_UNTIL_REGEX = /CAN-SKIP-UNTIL=([\d.]+)\b/;
const SERVER_CONTROL_CAN_SKIP_DATERANGES_REGEX = /CAN-SKIP-DATERANGES=(NO|YES)/;
const SERVER_CONTROL_HOLD_BACK_REGEX = /[:,]HOLD-BACK=([\d.]+)\b/;
const SERVER_CONTROL_PART_HOLD_BACK_REGEX = /PART-HOLD-BACK=([\d.]+)\b/;
const SERVER_CONTROL_CAN_BLOCK_RELOAD_REGEX = /CAN-BLOCK-RELOAD=(NO|YES)/;

// Part Inf
const PART_TARGET_REGEX = /PART-TARGET=([\d.]+)\b/;

// Skip
const SKIP_SKIPPED_SEGMENTS_REGEX = /SKIPPED-SEGMENTS=(\d+)\b/;
const SKIP_RECENTLY_REMOVED_DATERANGES_REGEX =
  /RECENTLY-REMOVED-DATERANGES="((?:[^"|\\]|\\.)*)"/;

// Preload Hint
const PRELOAD_HINT_TYPE_REGEX = /TYPE=(PART|MAP)/;
const PRELOAD_HINT_URI_REGEX = /URI="((?:[^"|\\]|\\.)*)"/;
const PRELOAD_HINT_BYTERANGE_START_REGEX = /BYTERANGE-START=(\d+)\b/;
const PRELOAD_HINT_BYTERANGE_LENGTH_REGEX = /BYTERANGE-LENGTH=(\d+)\b/;

// Rendition Report
const RENDITION_REPORT_URI_REGEX = /URI="((?:[^"|\\]|\\.)*)"/;
const RENDITION_REPORT_LAST_MSN_REGEX = /LAST-MSN=(\d+)\b/;
const RENDITION_REPORT_LAST_PART_REGEX = /LAST-PART=(\d+)\b/;

// Session Data
const SESSION_DATA_DATA_ID_REGEX = /DATA-ID="((?:[^"|\\]|\\.)*)"/;
const SESSION_DATA_VALUE_REGEX = /VALUE="((?:[^"|\\]|\\.)*)"/;
const SESSION_DATA_URI_REGEX = /URI="((?:[^"|\\]|\\.)*)"/;
const SESSION_DATA_LANGUAGE_REGEX = /LANGUAGE="((?:[^"|\\]|\\.)*)"/;

// Custom X- Attributes
const CUSTOM_X_ATTR_REGEX = /\b(X-[A-Z0-9-]+)=/gi;
const CUSTOM_X_ATTR_VALUE_REGEX = /\b(X-[A-Z0-9-]+)=(?:"([^"]*)"|([^\s,]+))/gi;

// Variable Substitution
const VARIABLE_SUBSTITUTION_REGEX = /\{\$([a-zA-Z0-9\-_]+)\}/g;

// ========== Helper Functions ==========

/**
 * Parse byte range from "length[@offset]" format
 */
function parseByteRange(value: string): HlsByteRange | undefined {
  const parts = value.split("@");
  const length = parseInt(parts[0], 10);
  const offset = parts[1] ? parseInt(parts[1], 10) : undefined;
  return isNaN(length) ? undefined : { length, offset };
}

/**
 * Parse resolution from "WIDTHxHEIGHT" format
 */
function parseResolution(value: string) {
  const parts = value.split("x");
  const width = parseInt(parts[0], 10);
  const height = parseInt(parts[1], 10);
  return isNaN(width) || isNaN(height) ? undefined : { width, height };
}

/**
 * Convert YES/NO to boolean
 */
function parseYesNo(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  return value === "YES";
}

/**
 * Parse custom X- attributes from a line
 */
function parseCustomAttributes(line: string): Dict {
  const attrs: Dict = {};
  let match;
  CUSTOM_X_ATTR_VALUE_REGEX.lastIndex = 0;
  while ((match = CUSTOM_X_ATTR_VALUE_REGEX.exec(line)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2] || match[3] || "";
    attrs[key] = value;
  }
  return attrs;
}

/**
 * Perform variable substitution on a line
 */
function substituteVariables(line: string, variables: Dict): string {
  return line.replace(VARIABLE_SUBSTITUTION_REGEX, (_, varName) => {
    return variables[varName] || `{$${varName}}`;
  });
}

/**
 * Parse #EXT-X-KEY line
 */
function parseKey(line: string): HlsKey | undefined {
  const methodMatch = KEY_METHOD_REGEX.exec(line);
  if (!methodMatch) return undefined;

  const method = methodMatch[1] as EncryptionMethod;
  if (method === "NONE") {
    return { method: "NONE" };
  }

  const uriMatch = KEY_URI_REGEX.exec(line);
  const ivMatch = KEY_IV_REGEX.exec(line);
  const keyFormatMatch = KEY_KEYFORMAT_REGEX.exec(line);
  const keyFormatVersionsMatch = KEY_KEYFORMATVERSIONS_REGEX.exec(line);

  return {
    method,
    uri: uriMatch ? trimQuotes(uriMatch[1]) : undefined,
    iv: ivMatch ? ivMatch[1] : undefined,
    keyFormat: keyFormatMatch ? trimQuotes(keyFormatMatch[1]) : undefined,
    keyFormatVersions: keyFormatVersionsMatch
      ? trimQuotes(keyFormatVersionsMatch[1])
      : undefined,
  };
}

/**
 * Parse #EXT-X-MAP line
 */
function parseMap(line: string): HlsMap | undefined {
  const uriMatch = MAP_URI_REGEX.exec(line);
  if (!uriMatch) return undefined;

  const uri = trimQuotes(uriMatch[1]);
  const byteRangeMatch = MAP_BYTERANGE_REGEX.exec(line);

  return {
    uri,
    byteRange: byteRangeMatch ? parseByteRange(byteRangeMatch[1]) : undefined,
  };
}

/**
 * Parse #EXT-X-DATERANGE line
 */
function parseDateRange(line: string): HlsDateRange | undefined {
  const idMatch = DATERANGE_ID_REGEX.exec(line);
  const startDateMatch = DATERANGE_START_DATE_REGEX.exec(line);

  if (!idMatch || !startDateMatch) return undefined;

  const classMatch = DATERANGE_CLASS_REGEX.exec(line);
  const endDateMatch = DATERANGE_END_DATE_REGEX.exec(line);
  const durationMatch = DATERANGE_DURATION_REGEX.exec(line);
  const plannedDurationMatch = DATERANGE_PLANNED_DURATION_REGEX.exec(line);
  const endOnNextMatch = DATERANGE_END_ON_NEXT_REGEX.exec(line);
  const cueMatch = DATERANGE_CUE_REGEX.exec(line);
  const scte35CmdMatch = DATERANGE_SCTE35_CMD_REGEX.exec(line);
  const scte35OutMatch = DATERANGE_SCTE35_OUT_REGEX.exec(line);
  const scte35InMatch = DATERANGE_SCTE35_IN_REGEX.exec(line);

  return {
    id: trimQuotes(idMatch[1]),
    startDate: trimQuotes(startDateMatch[1]),
    class: classMatch ? trimQuotes(classMatch[1]) : undefined,
    endDate: endDateMatch ? trimQuotes(endDateMatch[1]) : undefined,
    duration: durationMatch ? parseFloat(durationMatch[1]) : undefined,
    plannedDuration: plannedDurationMatch
      ? parseFloat(plannedDurationMatch[1])
      : undefined,
    endOnNext: parseYesNo(endOnNextMatch?.[1]),
    scte35Cmd: scte35CmdMatch ? scte35CmdMatch[1] : undefined,
    scte35Out: scte35OutMatch ? scte35OutMatch[1] : undefined,
    scte35In: scte35InMatch ? scte35InMatch[1] : undefined,
  };
}

/**
 * Parse #EXT-X-STREAM-INF line and next line (URI)
 */
function parseVariantStream(
  line: string,
  uri: string,
): HlsVariantStream | undefined {
  const bandwidthMatch = BANDWIDTH_REGEX.exec(line);
  if (!bandwidthMatch) return undefined;

  const averageBandwidthMatch = AVERAGE_BANDWIDTH_REGEX.exec(line);
  const codecsMatch = CODECS_REGEX.exec(line);
  const supplementalCodecsMatch = SUPPLEMENTAL_CODECS_REGEX.exec(line);
  const resolutionMatch = RESOLUTION_REGEX.exec(line);
  const frameRateMatch = FRAME_RATE_REGEX.exec(line);
  const videoRangeMatch = VIDEO_RANGE_REGEX.exec(line);
  const audioMatch = AUDIO_GROUP_REGEX.exec(line);
  const videoMatch = VIDEO_GROUP_REGEX.exec(line);
  const subtitlesMatch = SUBTITLES_GROUP_REGEX.exec(line);
  const closedCaptionsMatch = CLOSED_CAPTIONS_GROUP_REGEX.exec(line);

  return {
    uri,
    bandwidth: parseInt(bandwidthMatch[1], 10),
    averageBandwidth: averageBandwidthMatch
      ? parseInt(averageBandwidthMatch[1], 10)
      : undefined,
    codecs: codecsMatch ? trimQuotes(codecsMatch[1]) : undefined,
    supplementalCodecs: supplementalCodecsMatch
      ? trimQuotes(supplementalCodecsMatch[1])
      : undefined,
    resolution: resolutionMatch
      ? parseResolution(resolutionMatch[1])
      : undefined,
    frameRate: frameRateMatch ? parseFloat(frameRateMatch[1]) : undefined,
    videoRange: videoRangeMatch
      ? (videoRangeMatch[1] as VideoRange)
      : undefined,
    audio: audioMatch ? trimQuotes(audioMatch[1]) : undefined,
    video: videoMatch ? trimQuotes(videoMatch[1]) : undefined,
    subtitles: subtitlesMatch ? trimQuotes(subtitlesMatch[1]) : undefined,
    closedCaptions: closedCaptionsMatch
      ? trimQuotes(closedCaptionsMatch[1])
      : undefined,
    customAttributes: parseCustomAttributes(line),
  };
}

/**
 * Parse #EXT-X-I-FRAME-STREAM-INF line
 */
function parseIFrameStream(line: string): HlsIFrameStream | undefined {
  const uriMatch = MEDIA_URI_REGEX.exec(line);
  const bandwidthMatch = BANDWIDTH_REGEX.exec(line);

  if (!uriMatch || !bandwidthMatch) return undefined;

  const averageBandwidthMatch = AVERAGE_BANDWIDTH_REGEX.exec(line);
  const codecsMatch = CODECS_REGEX.exec(line);
  const resolutionMatch = RESOLUTION_REGEX.exec(line);
  const videoMatch = VIDEO_GROUP_REGEX.exec(line);

  return {
    uri: trimQuotes(uriMatch[1]),
    bandwidth: parseInt(bandwidthMatch[1], 10),
    averageBandwidth: averageBandwidthMatch
      ? parseInt(averageBandwidthMatch[1], 10)
      : undefined,
    codecs: codecsMatch ? trimQuotes(codecsMatch[1]) : undefined,
    resolution: resolutionMatch
      ? parseResolution(resolutionMatch[1])
      : undefined,
    video: videoMatch ? trimQuotes(videoMatch[1]) : undefined,
    customAttributes: parseCustomAttributes(line),
  };
}

/**
 * Parse #EXT-X-MEDIA line
 */
function parseRendition(line: string): HlsRendition | undefined {
  const typeMatch = MEDIA_TYPE_REGEX.exec(line);
  const groupIdMatch = MEDIA_GROUP_ID_REGEX.exec(line);
  const nameMatch = MEDIA_NAME_REGEX.exec(line);

  if (!typeMatch || !groupIdMatch || !nameMatch) return undefined;

  const uriMatch = MEDIA_URI_REGEX.exec(line);
  const languageMatch = MEDIA_LANGUAGE_REGEX.exec(line);
  const assocLanguageMatch = MEDIA_ASSOC_LANGUAGE_REGEX.exec(line);
  const defaultMatch = MEDIA_DEFAULT_REGEX.exec(line);
  const autoSelectMatch = MEDIA_AUTOSELECT_REGEX.exec(line);
  const forcedMatch = MEDIA_FORCED_REGEX.exec(line);
  const instreamIdMatch = MEDIA_INSTREAM_ID_REGEX.exec(line);
  const characteristicsMatch = MEDIA_CHARACTERISTICS_REGEX.exec(line);
  const channelsMatch = MEDIA_CHANNELS_REGEX.exec(line);

  return {
    type: typeMatch[1] as MediaType,
    groupId: trimQuotes(groupIdMatch[1]),
    name: trimQuotes(nameMatch[1]),
    uri: uriMatch ? trimQuotes(uriMatch[1]) : undefined,
    language: languageMatch ? trimQuotes(languageMatch[1]) : undefined,
    assocLanguage: assocLanguageMatch
      ? trimQuotes(assocLanguageMatch[1])
      : undefined,
    default: parseYesNo(defaultMatch?.[1]),
    autoSelect: parseYesNo(autoSelectMatch?.[1]),
    forced: parseYesNo(forcedMatch?.[1]),
    instreamId: instreamIdMatch ? trimQuotes(instreamIdMatch[1]) : undefined,
    characteristics: characteristicsMatch
      ? trimQuotes(characteristicsMatch[1])
      : undefined,
    channels: channelsMatch ? trimQuotes(channelsMatch[1]) : undefined,
    customAttributes: parseCustomAttributes(line),
  };
}

/**
 * Parse #EXT-X-SESSION-DATA line
 */
function parseSessionData(line: string): HlsSessionData | undefined {
  const dataIdMatch = SESSION_DATA_DATA_ID_REGEX.exec(line);
  if (!dataIdMatch) return undefined;

  const valueMatch = SESSION_DATA_VALUE_REGEX.exec(line);
  const uriMatch = SESSION_DATA_URI_REGEX.exec(line);
  const languageMatch = SESSION_DATA_LANGUAGE_REGEX.exec(line);

  return {
    dataId: trimQuotes(dataIdMatch[1]),
    value: valueMatch ? trimQuotes(valueMatch[1]) : undefined,
    uri: uriMatch ? trimQuotes(uriMatch[1]) : undefined,
    language: languageMatch ? trimQuotes(languageMatch[1]) : undefined,
  };
}

/**
 * Parse #EXT-X-START line
 */
function parseStart(line: string): HlsStart | undefined {
  const timeOffsetMatch = START_TIME_OFFSET_REGEX.exec(line);
  if (!timeOffsetMatch) return undefined;

  const preciseMatch = START_PRECISE_REGEX.exec(line);

  return {
    timeOffset: parseFloat(timeOffsetMatch[1]),
    precise: parseYesNo(preciseMatch?.[1]),
  };
}

/**
 * Parse #EXT-X-SERVER-CONTROL line
 */
function parseServerControl(line: string): HlsServerControl {
  const canSkipUntilMatch = SERVER_CONTROL_CAN_SKIP_UNTIL_REGEX.exec(line);
  const canSkipDateRangesMatch =
    SERVER_CONTROL_CAN_SKIP_DATERANGES_REGEX.exec(line);
  const holdBackMatch = SERVER_CONTROL_HOLD_BACK_REGEX.exec(line);
  const partHoldBackMatch = SERVER_CONTROL_PART_HOLD_BACK_REGEX.exec(line);
  const canBlockReloadMatch = SERVER_CONTROL_CAN_BLOCK_RELOAD_REGEX.exec(line);

  return {
    canSkipUntil: canSkipUntilMatch
      ? parseFloat(canSkipUntilMatch[1])
      : undefined,
    canSkipDateRanges: parseYesNo(canSkipDateRangesMatch?.[1]),
    holdBack: holdBackMatch ? parseFloat(holdBackMatch[1]) : undefined,
    partHoldBack: partHoldBackMatch
      ? parseFloat(partHoldBackMatch[1])
      : undefined,
    canBlockReload: parseYesNo(canBlockReloadMatch?.[1]),
  };
}

/**
 * Parse #EXT-X-PART-INF line
 */
function parsePartInf(line: string): HlsPartInf | undefined {
  const partTargetMatch = PART_TARGET_REGEX.exec(line);
  if (!partTargetMatch) return undefined;

  return {
    partTarget: parseFloat(partTargetMatch[1]),
  };
}

/**
 * Parse #EXT-X-SKIP line
 */
function parseSkip(line: string): HlsSkip | undefined {
  const skippedSegmentsMatch = SKIP_SKIPPED_SEGMENTS_REGEX.exec(line);
  if (!skippedSegmentsMatch) return undefined;

  const recentlyRemovedMatch =
    SKIP_RECENTLY_REMOVED_DATERANGES_REGEX.exec(line);

  return {
    skippedSegments: parseInt(skippedSegmentsMatch[1], 10),
    recentlyRemovedDateRanges: recentlyRemovedMatch
      ? trimQuotes(recentlyRemovedMatch[1])
      : undefined,
  };
}

/**
 * Parse #EXT-X-PRELOAD-HINT line
 */
function parsePreloadHint(line: string): HlsPreloadHint | undefined {
  const typeMatch = PRELOAD_HINT_TYPE_REGEX.exec(line);
  const uriMatch = PRELOAD_HINT_URI_REGEX.exec(line);

  if (!typeMatch || !uriMatch) return undefined;

  const byteRangeStartMatch = PRELOAD_HINT_BYTERANGE_START_REGEX.exec(line);
  const byteRangeLengthMatch = PRELOAD_HINT_BYTERANGE_LENGTH_REGEX.exec(line);

  return {
    type: typeMatch[1] as PreloadHintType,
    uri: trimQuotes(uriMatch[1]),
    byteRangeStart: byteRangeStartMatch
      ? parseInt(byteRangeStartMatch[1], 10)
      : undefined,
    byteRangeLength: byteRangeLengthMatch
      ? parseInt(byteRangeLengthMatch[1], 10)
      : undefined,
  };
}

/**
 * Parse #EXT-X-RENDITION-REPORT line
 */
function parseRenditionReport(line: string): HlsRenditionReport | undefined {
  const uriMatch = RENDITION_REPORT_URI_REGEX.exec(line);
  if (!uriMatch) return undefined;

  const lastMsnMatch = RENDITION_REPORT_LAST_MSN_REGEX.exec(line);
  const lastPartMatch = RENDITION_REPORT_LAST_PART_REGEX.exec(line);

  return {
    uri: trimQuotes(uriMatch[1]),
    lastMsn: lastMsnMatch ? parseInt(lastMsnMatch[1], 10) : undefined,
    lastPart: lastPartMatch ? parseInt(lastPartMatch[1], 10) : undefined,
  };
}

/**
 * Detect if playlist is a master playlist (has variant streams)
 */
function detectMasterPlaylist(lines: string[]): boolean {
  return lines.some((line) =>
    line.trim().toUpperCase().startsWith("#EXT-X-STREAM-INF"),
  );
}

/**
 * Parse media playlist (contains segments)
 */
function parseMediaPlaylist(
  lines: string[],
  warnings: string[],
): HlsMediaPlaylist {
  const segments: HlsMediaSegment[] = [];
  const variables: Dict = {};

  let version: number | undefined;
  let targetDuration = 0;
  let mediaSequence: number | undefined;
  let discontinuitySequence: number | undefined;
  let playlistType: PlaylistType | undefined;
  let endList = false;
  let iFramesOnly = false;
  let independentSegments = false;
  let serverControl: HlsServerControl | undefined;
  let partInf: HlsPartInf | undefined;
  let start: HlsStart | undefined;
  let skip: HlsSkip | undefined;
  const preloadHints: HlsPreloadHint[] = [];
  const renditionReports: HlsRenditionReport[] = [];
  const customAttributes: Dict = {};

  // Current segment being built
  let currentSegment: Partial<HlsMediaSegment> | null = null;
  let currentKey: HlsKey | undefined;
  let currentMap: HlsMap | undefined;
  const currentDateRanges: HlsDateRange[] = [];
  let pendingDiscontinuity = false;
  let pendingGap = false;
  let pendingProgramDateTime: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line || line === "#EXTM3U") continue;

    // Substitute variables
    line = substituteVariables(line, variables);

    // Version
    const versionMatch = VERSION_REGEX.exec(line);
    if (versionMatch) {
      version = parseInt(versionMatch[1], 10);
      continue;
    }

    // Target Duration
    const targetDurationMatch = TARGETDURATION_REGEX.exec(line);
    if (targetDurationMatch) {
      targetDuration = parseInt(targetDurationMatch[1], 10);
      continue;
    }

    // Media Sequence
    const mediaSequenceMatch = MEDIA_SEQUENCE_REGEX.exec(line);
    if (mediaSequenceMatch) {
      mediaSequence = parseInt(mediaSequenceMatch[1], 10);
      continue;
    }

    // Discontinuity Sequence
    const discontinuitySequenceMatch = DISCONTINUITY_SEQUENCE_REGEX.exec(line);
    if (discontinuitySequenceMatch) {
      discontinuitySequence = parseInt(discontinuitySequenceMatch[1], 10);
      continue;
    }

    // Playlist Type
    const playlistTypeMatch = PLAYLIST_TYPE_REGEX.exec(line);
    if (playlistTypeMatch) {
      playlistType = playlistTypeMatch[1].trim() as PlaylistType;
      continue;
    }

    // End List
    if (ENDLIST_REGEX.test(line)) {
      endList = true;
      continue;
    }

    // I-Frames Only
    if (IFRAMES_ONLY_REGEX.test(line)) {
      iFramesOnly = true;
      continue;
    }

    // Independent Segments
    if (INDEPENDENT_SEGMENTS_REGEX.test(line)) {
      independentSegments = true;
      continue;
    }

    // Key
    if (line.startsWith("#EXT-X-KEY")) {
      currentKey = parseKey(line);
      continue;
    }

    // Map
    if (line.startsWith("#EXT-X-MAP")) {
      currentMap = parseMap(line);
      continue;
    }

    // Date Range
    if (line.startsWith("#EXT-X-DATERANGE")) {
      const dateRange = parseDateRange(line);
      if (dateRange) {
        currentDateRanges.push(dateRange);
      }
      continue;
    }

    // Server Control
    if (line.startsWith("#EXT-X-SERVER-CONTROL")) {
      serverControl = parseServerControl(line);
      continue;
    }

    // Part Inf
    if (line.startsWith("#EXT-X-PART-INF")) {
      partInf = parsePartInf(line);
      continue;
    }

    // Start
    if (line.startsWith("#EXT-X-START")) {
      start = parseStart(line);
      continue;
    }

    // Skip
    if (line.startsWith("#EXT-X-SKIP")) {
      skip = parseSkip(line);
      continue;
    }

    // Preload Hint
    if (line.startsWith("#EXT-X-PRELOAD-HINT")) {
      const hint = parsePreloadHint(line);
      if (hint) preloadHints.push(hint);
      continue;
    }

    // Rendition Report
    if (line.startsWith("#EXT-X-RENDITION-REPORT")) {
      const report = parseRenditionReport(line);
      if (report) renditionReports.push(report);
      continue;
    }

    // Discontinuity (applies to next segment)
    if (DISCONTINUITY_REGEX.test(line)) {
      pendingDiscontinuity = true;
      continue;
    }

    // Gap (applies to next segment)
    if (GAP_REGEX.test(line)) {
      pendingGap = true;
      continue;
    }

    // Program Date Time (applies to next segment)
    if (line.startsWith("#EXT-X-PROGRAM-DATE-TIME")) {
      const match = PROGRAM_DATE_TIME_REGEX.exec(line);
      if (match) {
        pendingProgramDateTime = match[1].trim();
      }
      continue;
    }

    // EXTINF (segment info)
    if (line.startsWith("#EXTINF")) {
      const durationMatch = EXTINF_REGEX.exec(line);
      const titleMatch = EXTINF_TITLE_REGEX.exec(line);

      if (durationMatch) {
        currentSegment = {
          uri: "",
          duration: parseFloat(durationMatch[1]),
          title: titleMatch ? titleMatch[1].trim() : undefined,
          key: currentKey,
          map: currentMap,
          dateRanges:
            currentDateRanges.length > 0 ? [...currentDateRanges] : undefined,
          discontinuity: pendingDiscontinuity || undefined,
          gap: pendingGap || undefined,
          programDateTime: pendingProgramDateTime,
        };
        currentDateRanges.length = 0;
        pendingDiscontinuity = false;
        pendingGap = false;
        pendingProgramDateTime = undefined;
      }
      continue;
    }

    // Byte Range
    if (line.startsWith("#EXT-X-BYTERANGE")) {
      const match = BYTERANGE_REGEX.exec(line);
      if (match && currentSegment) {
        currentSegment.byteRange = parseByteRange(match[1]);
      }
      continue;
    }

    // Define (variable)
    if (line.startsWith("#EXT-X-DEFINE")) {
      const nameMatch = /NAME="([^"]+)"/.exec(line);
      const valueMatch = /VALUE="([^"]*)"/.exec(line);
      if (nameMatch && valueMatch) {
        variables[nameMatch[1]] = valueMatch[1];
      }
      continue;
    }

    // Custom X- attributes at playlist level
    if (line.startsWith("#EXT-X-")) {
      const customAttrs = parseCustomAttributes(line);
      Object.assign(customAttributes, customAttrs);
    }

    // URI (segment URL)
    if (!line.startsWith("#") && currentSegment) {
      currentSegment.uri = line;
      segments.push(currentSegment as HlsMediaSegment);
      currentSegment = null;
    }
  }

  if (targetDuration === 0 && segments.length > 0) {
    warnings.push(
      "Missing #EXT-X-TARGETDURATION tag; required for media playlists",
    );
  }

  return {
    type: "media",
    version,
    targetDuration,
    mediaSequence,
    discontinuitySequence,
    playlistType,
    endList,
    iFramesOnly: iFramesOnly || undefined,
    segments,
    serverControl,
    partInf,
    start,
    skip,
    preloadHints: preloadHints.length > 0 ? preloadHints : undefined,
    renditionReports:
      renditionReports.length > 0 ? renditionReports : undefined,
    independentSegments: independentSegments || undefined,
    customAttributes:
      Object.keys(customAttributes).length > 0 ? customAttributes : undefined,
    warnings,
  };
}

/**
 * Parse master playlist (contains variant streams)
 */
function parseMasterPlaylist(
  lines: string[],
  warnings: string[],
): HlsMasterPlaylist {
  const variants: HlsVariantStream[] = [];
  const iFrameStreams: HlsIFrameStream[] = [];
  const renditions: HlsRendition[] = [];
  const sessionData: HlsSessionData[] = [];
  const sessionKeys: HlsSessionKey[] = [];
  const customAttributes: Dict = {};
  const variables: Dict = {};

  let version: number | undefined;
  let independentSegments = false;
  let start: HlsStart | undefined;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line || line === "#EXTM3U") continue;

    // Substitute variables
    line = substituteVariables(line, variables);

    // Version
    const versionMatch = VERSION_REGEX.exec(line);
    if (versionMatch) {
      version = parseInt(versionMatch[1], 10);
      continue;
    }

    // Independent Segments
    if (INDEPENDENT_SEGMENTS_REGEX.test(line)) {
      independentSegments = true;
      continue;
    }

    // Start
    if (line.startsWith("#EXT-X-START")) {
      start = parseStart(line);
      continue;
    }

    // Stream Inf (variant stream)
    if (line.startsWith("#EXT-X-STREAM-INF")) {
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && !nextLine.startsWith("#")) {
        const variant = parseVariantStream(line, nextLine);
        if (variant) {
          variants.push(variant);
        }
        i++; // Skip next line (URI)
      }
      continue;
    }

    // I-Frame Stream Inf
    if (line.startsWith("#EXT-X-I-FRAME-STREAM-INF")) {
      const iFrame = parseIFrameStream(line);
      if (iFrame) {
        iFrameStreams.push(iFrame);
      }
      continue;
    }

    // Media (rendition)
    if (line.startsWith("#EXT-X-MEDIA")) {
      const rendition = parseRendition(line);
      if (rendition) {
        renditions.push(rendition);
      }
      continue;
    }

    // Session Data
    if (line.startsWith("#EXT-X-SESSION-DATA")) {
      const data = parseSessionData(line);
      if (data) {
        sessionData.push(data);
      }
      continue;
    }

    // Session Key
    if (line.startsWith("#EXT-X-SESSION-KEY")) {
      const key = parseKey(line);
      if (key) {
        sessionKeys.push(key as HlsSessionKey);
      }
      continue;
    }

    // Define (variable)
    if (line.startsWith("#EXT-X-DEFINE")) {
      const nameMatch = /NAME="([^"]+)"/.exec(line);
      const valueMatch = /VALUE="([^"]*)"/.exec(line);
      if (nameMatch && valueMatch) {
        variables[nameMatch[1]] = valueMatch[1];
      }
      continue;
    }

    // Custom X- attributes
    if (line.startsWith("#EXT-X-")) {
      const customAttrs = parseCustomAttributes(line);
      Object.assign(customAttributes, customAttrs);
    }
  }

  if (variants.length === 0) {
    warnings.push(
      "No variant streams found; master playlist should contain #EXT-X-STREAM-INF tags",
    );
  }

  return {
    type: "master",
    version,
    variants,
    iFrameStreams: iFrameStreams.length > 0 ? iFrameStreams : undefined,
    renditions: renditions.length > 0 ? renditions : undefined,
    sessionData: sessionData.length > 0 ? sessionData : undefined,
    sessionKeys: sessionKeys.length > 0 ? sessionKeys : undefined,
    start,
    independentSegments: independentSegments || undefined,
    customAttributes:
      Object.keys(customAttributes).length > 0 ? customAttributes : undefined,
    warnings,
  };
}

/**
 * Parse HLS playlist (auto-detects master vs media playlist)
 * @param text - Raw M3U8 playlist text
 * @returns Parsed HLS playlist (master or media)
 */
export function parseHlsPlaylist(text: string): HlsPlaylist {
  const warnings: string[] = [];
  const lines = splitLines(stripBOM(text));

  // Check for #EXTM3U header
  if (
    lines.length === 0 ||
    !lines[0].trim().toUpperCase().startsWith("#EXTM3U")
  ) {
    warnings.push("Missing #EXTM3U header; may not be a valid M3U8 file");
  }

  // Detect playlist type
  const isMaster = detectMasterPlaylist(lines);

  if (isMaster) {
    return parseMasterPlaylist(lines, warnings);
  } else {
    return parseMediaPlaylist(lines, warnings);
  }
}
