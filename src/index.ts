// IPTV Parser (existing)
export * from "./types.js";
export { parsePlaylist } from "./parser.js";
export { normalizeEntry, normalizePlaylist } from "./normalize.js";

// HLS Parser (new in v0.3.0)
// Export HLS types explicitly to avoid Dict conflict
export type {
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
  HlsResolution,
  EncryptionMethod,
  PlaylistType,
  MediaType,
  VideoRange,
  PreloadHintType,
} from "./hls-types.js";
export { isMasterPlaylist, isMediaPlaylist } from "./hls-types.js";
export { parseHlsPlaylist } from "./hls-parser.js";
export {
  detectPlaylistType,
  parsePlaylistAuto,
  type PlaylistFormat,
  type ParsedPlaylist,
} from "./detector.js";

// Xtream API
export {
  isXtreamUrl,
  parseXtream,
  makeXtreamCredentials,
  buildXtreamM3uUrl,
  buildXtreamCatchupUrl,
} from "./xtream.js";

// HTTP Utilities
export { fetchText, loadPlaylistFromUrl } from "./http.js";

// EPG/XMLTV
export {
  parseXmltv,
  parseXmltvPrograms,
  buildEpgBindingIndex,
  buildChannelCategoryMap,
  parseXmltvDate,
  type TvgChannel,
  type TvgProgramme,
} from "./xmltv.js";
export { enrichPlaylistWithEpg, type EnrichOptions } from "./enrich.js";
