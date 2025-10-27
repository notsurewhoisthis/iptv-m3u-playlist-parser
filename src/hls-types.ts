/**
 * HLS (HTTP Live Streaming) Type Definitions
 * Comprehensive type system for Apple HLS specification
 */

export type Dict<T = string> = Record<string, T>;

// ========== Enums and Union Types ==========

/**
 * Encryption methods for HLS content
 */
export type EncryptionMethod =
  | "NONE"
  | "AES-128"
  | "SAMPLE-AES"
  | "SAMPLE-AES-CENC"
  | "SAMPLE-AES-CTR";

/**
 * Playlist types as defined by HLS spec
 */
export type PlaylistType = "VOD" | "EVENT" | "LIVE";

/**
 * Media rendition types
 */
export type MediaType = "AUDIO" | "VIDEO" | "SUBTITLES" | "CLOSED-CAPTIONS";

/**
 * Video range types for HDR support
 */
export type VideoRange = "SDR" | "PQ" | "HLG";

/**
 * Preload hint types for low-latency HLS
 */
export type PreloadHintType = "PART" | "MAP";

// ========== Segment-Level Types ==========

/**
 * Byte range specification for partial segment retrieval
 */
export interface HlsByteRange {
  length: number;
  offset?: number;
}

/**
 * Encryption key information for decrypting segments
 */
export interface HlsKey {
  method: EncryptionMethod;
  uri?: string;
  iv?: string;
  keyFormat?: string;
  keyFormatVersions?: string;
}

/**
 * Media initialization section (fMP4)
 */
export interface HlsMap {
  uri: string;
  byteRange?: HlsByteRange;
}

/**
 * Date range metadata for timed metadata and ad insertion
 */
export interface HlsDateRange {
  id: string;
  class?: string;
  startDate: string;
  endDate?: string;
  duration?: number;
  plannedDuration?: number;
  endOnNext?: boolean;
  clientAttributes?: Dict;
  scte35Cmd?: string;
  scte35Out?: string;
  scte35In?: string;
}

/**
 * Individual media segment in a media playlist
 */
export interface HlsMediaSegment {
  /** Segment URI (absolute or relative) */
  uri: string;
  /** Segment duration in seconds */
  duration: number;
  /** Optional segment title */
  title?: string;
  /** Byte range for sub-range retrieval */
  byteRange?: HlsByteRange;
  /** Encryption key for this segment */
  key?: HlsKey;
  /** Media initialization section (for fMP4) */
  map?: HlsMap;
  /** Discontinuity flag */
  discontinuity?: boolean;
  /** Gap flag (segment not available) */
  gap?: boolean;
  /** Program date-time for this segment */
  programDateTime?: string;
  /** Date ranges associated with this segment */
  dateRanges?: HlsDateRange[];
}

// ========== Media Playlist Types ==========

/**
 * Server control directives for low-latency HLS
 */
export interface HlsServerControl {
  canSkipUntil?: number;
  canSkipDateRanges?: boolean;
  holdBack?: number;
  partHoldBack?: number;
  canBlockReload?: boolean;
}

/**
 * Partial segment information for low-latency HLS
 */
export interface HlsPartInf {
  partTarget: number;
}

/**
 * Start position preference
 */
export interface HlsStart {
  timeOffset: number;
  precise?: boolean;
}

/**
 * Skip directive for delta updates
 */
export interface HlsSkip {
  skippedSegments: number;
  recentlyRemovedDateRanges?: string;
}

/**
 * Preload hint for low-latency HLS
 */
export interface HlsPreloadHint {
  type: PreloadHintType;
  uri: string;
  byteRangeStart?: number;
  byteRangeLength?: number;
}

/**
 * Rendition report for low-latency HLS
 */
export interface HlsRenditionReport {
  uri: string;
  lastMsn?: number;
  lastPart?: number;
}

/**
 * Media Playlist (contains segments)
 */
export interface HlsMediaPlaylist {
  /** Playlist type indicator */
  type: "media";
  /** HLS protocol version */
  version?: number;
  /** Maximum segment duration in seconds */
  targetDuration: number;
  /** Media sequence number of first segment */
  mediaSequence?: number;
  /** Discontinuity sequence number */
  discontinuitySequence?: number;
  /** Playlist type (VOD, EVENT, or LIVE if undefined) */
  playlistType?: PlaylistType;
  /** End list flag (no more segments will be added) */
  endList: boolean;
  /** I-frames only flag */
  iFramesOnly?: boolean;
  /** List of media segments */
  segments: HlsMediaSegment[];
  /** Server control directives */
  serverControl?: HlsServerControl;
  /** Partial segment information */
  partInf?: HlsPartInf;
  /** Start position preference */
  start?: HlsStart;
  /** Skip directive */
  skip?: HlsSkip;
  /** Preload hints */
  preloadHints?: HlsPreloadHint[];
  /** Rendition reports */
  renditionReports?: HlsRenditionReport[];
  /** Independent segments flag */
  independentSegments?: boolean;
  /** Custom X- attributes */
  customAttributes?: Dict;
  /** Parsing warnings */
  warnings: string[];
}

// ========== Master Playlist Types ==========

/**
 * Video resolution
 */
export interface HlsResolution {
  width: number;
  height: number;
}

/**
 * Variant stream (quality level) in master playlist
 */
export interface HlsVariantStream {
  /** Stream URI */
  uri: string;
  /** Peak bandwidth in bits per second */
  bandwidth: number;
  /** Average bandwidth in bits per second */
  averageBandwidth?: number;
  /** Codec string (RFC 6381) */
  codecs?: string;
  /** Supplemental codecs */
  supplementalCodecs?: string;
  /** Video resolution */
  resolution?: HlsResolution;
  /** Frame rate */
  frameRate?: number;
  /** Video range (HDR) */
  videoRange?: VideoRange;
  /** Audio rendition group ID */
  audio?: string;
  /** Video rendition group ID */
  video?: string;
  /** Subtitles rendition group ID */
  subtitles?: string;
  /** Closed captions rendition group ID or "NONE" */
  closedCaptions?: string;
  /** Custom X- attributes */
  customAttributes?: Dict;
}

/**
 * I-frame variant stream for trick play
 */
export interface HlsIFrameStream {
  /** Stream URI */
  uri: string;
  /** Peak bandwidth in bits per second */
  bandwidth: number;
  /** Average bandwidth in bits per second */
  averageBandwidth?: number;
  /** Codec string */
  codecs?: string;
  /** Video resolution */
  resolution?: HlsResolution;
  /** Video rendition group ID */
  video?: string;
  /** Custom X- attributes */
  customAttributes?: Dict;
}

/**
 * Alternative rendition (audio, video, subtitles, closed captions)
 */
export interface HlsRendition {
  /** Rendition type */
  type: MediaType;
  /** Rendition URI (optional for closed captions) */
  uri?: string;
  /** Group ID */
  groupId: string;
  /** Rendition name */
  name: string;
  /** Language (RFC 5646) */
  language?: string;
  /** Associated language */
  assocLanguage?: string;
  /** Default rendition flag */
  default?: boolean;
  /** Auto-select flag */
  autoSelect?: boolean;
  /** Forced subtitle flag */
  forced?: boolean;
  /** In-stream ID for closed captions */
  instreamId?: string;
  /** Characteristics */
  characteristics?: string;
  /** Channels */
  channels?: string;
  /** Custom X- attributes */
  customAttributes?: Dict;
}

/**
 * Session data for master playlist
 */
export interface HlsSessionData {
  dataId: string;
  value?: string;
  uri?: string;
  language?: string;
}

/**
 * Session key for master playlist
 */
export interface HlsSessionKey extends HlsKey {
  // Inherits all properties from HlsKey
}

/**
 * Master Playlist (contains variant streams)
 */
export interface HlsMasterPlaylist {
  /** Playlist type indicator */
  type: "master";
  /** HLS protocol version */
  version?: number;
  /** List of variant streams */
  variants: HlsVariantStream[];
  /** List of I-frame streams */
  iFrameStreams?: HlsIFrameStream[];
  /** Alternative renditions (audio, video, subtitles, closed captions) */
  renditions?: HlsRendition[];
  /** Session data */
  sessionData?: HlsSessionData[];
  /** Session keys */
  sessionKeys?: HlsSessionKey[];
  /** Start position preference */
  start?: HlsStart;
  /** Independent segments flag */
  independentSegments?: boolean;
  /** Custom X- attributes */
  customAttributes?: Dict;
  /** Parsing warnings */
  warnings: string[];
}

// ========== Union Type for Parsed Playlists ==========

/**
 * Union type for either master or media playlist
 */
export type HlsPlaylist = HlsMasterPlaylist | HlsMediaPlaylist;

// ========== Type Guards ==========

/**
 * Type guard to check if playlist is a master playlist
 */
export function isMasterPlaylist(
  playlist: HlsPlaylist,
): playlist is HlsMasterPlaylist {
  return playlist.type === "master";
}

/**
 * Type guard to check if playlist is a media playlist
 */
export function isMediaPlaylist(
  playlist: HlsPlaylist,
): playlist is HlsMediaPlaylist {
  return playlist.type === "media";
}
