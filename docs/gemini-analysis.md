## 2. Regular Expressions

The parser defines a large number of `Pattern` objects, which are compiled regular expressions. These patterns are used to extract information from the M3U8 playlist. Here is a comprehensive list of the regular expressions used by the parser:

| Obfuscated Name | Regular Expression                  | Description                                                                 |
| --------------- | ----------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------- | --- | ------------------------------------------------------- |
| `f5286`         | `#EXT-X-DATERANGE:(\d+)\b`          | Parses the `END-DATE` attribute from the `#EXT-X-DATERANGE` tag.            |
| `f5287`         | `KEYFORMAT="((?:.                   | \f)+?)"`                                                                    | Parses the `KEYFORMAT` attribute from the `#EXT-X-KEY` tag.                      |
| `f5288`         | `VALUE="((?:.                       | \f)+?)"`                                                                    | Parses the `VALUE` attribute.                                                    |
| `f5289`         | `TIME-OFFSET=(-?[\d\.]+)\b`         | Parses the `TIME-OFFSET` attribute from the `#EXT-X-START` tag.             |
| `f5290`         | `#EXT-X-VERSION:(\d+)\b`            | Parses the HLS version from the `#EXT-X-VERSION` tag.                       |
| `f5291`         | `INSTREAM-ID="((?:CC                | SERVICE)\d+)"`                                                              | Parses the `INSTREAM-ID` attribute from the `#EXT-X-MEDIA` tag.                  |
| `f5292`         | `X-RESTRICT="((?:.                  | \f)+?)"`                                                                    | Parses the `X-RESTRICT` attribute.                                               |
| `f5293`         | `AVERAGE-BANDWIDTH=(\d+)\b`         | Parses the `AVERAGE-BANDWIDTH` attribute from the `#EXT-X-STREAM-INF` tag.  |
| `f5294`         | `X-PLAYOUT-LIMIT=([\d\.]+)\b`       | Parses the `X-PLAYOUT-LIMIT` attribute.                                     |
| `f5295`         | `TYPE=(PART                         | MAP)`                                                                       | Parses the `TYPE` attribute from the `#EXT-X-PRELOAD-HINT` tag.                  |
| `f5296`         | `FORCED=(NO                         | YES)`                                                                       | Parses the `FORCED` attribute.                                                   |
| `f5297`         | `GROUP-ID="((?:.                    | \f)+?)"`                                                                    | Parses the `GROUP-ID` attribute from the `#EXT-X-MEDIA` tag.                     |
| `f5298`         | `INDEPENDENT=(NO                    | YES)`                                                                       | Parses the `INDEPENDENT` attribute.                                              |
| `f5299`         | `PART-HOLD-BACK=([\d\.]+)\b`        | Parses the `PART-HOLD-BACK` attribute from the `#EXT-X-SERVER-CONTROL` tag. |
| `f5300`         | `CLASS="((?:.                       | \f)+?)"`                                                                    | Parses the `CLASS` attribute from the `#EXT-X-DATERANGE` tag.                    |
| `f5301`         | `CAN-BLOCK-RELOAD=(NO               | YES)`                                                                       | Parses the `CAN-BLOCK-RELOAD` attribute from the `#EXT-X-SERVER-CONTROL` tag.    |
| `f5302`         | `RESOLUTION=(\d+x\d+)`              | Parses the `RESOLUTION` attribute from the `#EXT-X-STREAM-INF` tag.         |
| `f5303`         | `#EXT-X-TARGETDURATION:(\d+)\b`     | Parses the target duration from the `#EXT-X-TARGETDURATION` tag.            |
| `f5304`         | `BYTERANGE-START=(\d+)\b`           | Parses the `BYTERANGE-START` attribute.                                     |
| `f5305`         | `X-TIMELINE-STYLE="((?:.            | \f)+?)"`                                                                    | Parses the `X-TIMELINE-STYLE` attribute.                                         |
| `f5306`         | `VIDEO="((?:.                       | \f)+?)"`                                                                    | Parses the `VIDEO` attribute from the `#EXT-X-STREAM-INF` tag.                   |
| `f5307`         | `CAN-SKIP-DATERANGES=(NO            | YES)`                                                                       | Parses the `CAN-SKIP-DATERANGES` attribute from the `#EXT-X-SERVER-CONTROL` tag. |
| `f5308`         | `[:                                 | ,]HOLD-BACK=([\d\.]+)\b`                                                    | Parses the `HOLD-BACK` attribute from the `#EXT-X-SERVER-CONTROL` tag.           |
| `f5309`         | `[^-]BANDWIDTH=(\d+)\b`             | Parses the `BANDWIDTH` attribute from the `#EXT-X-STREAM-INF` tag.          |
| `f5310`         | `SUBTITLES="((?:.                   | \f)+?)"`                                                                    | Parses the `SUBTITLES` attribute from the `#EXT-X-STREAM-INF` tag.               |
| `f5311`         | `PART-TARGET=([\d\.]+)\b`           | Parses the `PART-TARGET` attribute from the `#EXT-X-PART-INF` tag.          |
| `f5312`         | `#EXT-X-BYTERANGE:(\d+(?:@\d+)?)\b` | Parses the byte range from the `#EXT-X-BYTERANGE` tag.                      |
| `f5313`         | `X-SNAP="((?:.                      | \f)+?)"`                                                                    | Parses the `X-SNAP` attribute.                                                   |
| `f5314`         | `[:,]DURATION=([\d\.]+)\b`          | Parses the `DURATION` attribute from the `#EXT-X-DATERANGE` tag.            |
| `f5315`         | `\{\$([a-zA-Z0-9\-_]+)\} `          | Parses a variable substitution.                                             |
| `f5316`         | `AUTOSELECT=(NO                     | YES)`                                                                       | Parses the `AUTOSELECT` attribute.                                               |
| `f5317`         | `LAST-MSN=(\d+)\b`                  | Parses the `LAST-MSN` attribute from the `#EXT-X-RENDITION-REPORT` tag.     |
| `f5318`         | `CHARACTERISTICS="((?:.             | \f)+?)"`                                                                    | Parses the `CHARACTERISTICS` attribute from the `#EXT-X-MEDIA` tag.              |
| `f5319`         | `KEYFORMATVERSIONS="((?:.           | \f)+?)"`                                                                    | Parses the `KEYFORMATVERSIONS` attribute from the `#EXT-X-KEY` tag.              |
| `f5320`         | `\b(X-[A-Z0-9-]+)=`                 | Parses a custom `X-` attribute.                                             |
| `f5321`         | `DURATION=([\d\.]+)\b`              | Parses the `DURATION` attribute.                                            |
| `f5322`         | `NAME="((?:.                        | \f)+?)"`                                                                    | Parses the `NAME` attribute.                                                     |
| `f5323`         | `X-CONTENT-MAY-VARY="((?:.          | \f)+?)"`                                                                    | Parses the `X-CONTENT-MAY-VARY` attribute.                                       |
| `f5324`         | `DEFAULT=(NO                        | YES)`                                                                       | Parses the `DEFAULT` attribute.                                                  |
| `f5325`         | `IMPORT="((?:.                      | \f)+?)"`                                                                    | Parses the `IMPORT` attribute from the `#EXT-X-DEFINE` tag.                      |
| `f5326`         | `#EXT-X-PLAYLIST-TYPE:(.+)\b`       | Parses the playlist type from the `#EXT-X-PLAYLIST-TYPE` tag.               |
| `f5327`         | `TYPE=(AUDIO                        | VIDEO                                                                       | SUBTITLES                                                                        | CLOSED-CAPTIONS)`                                                    | Parses the `TYPE` attribute from the `#EXT-X-MEDIA` tag. |
| `f5328`         | `END-ON-NEXT=(NO                    | YES)`                                                                       | Parses the `END-ON-NEXT` attribute from the `#EXT-X-DATERANGE` tag.              |
| `f5329`         | `BYTERANGE="(\d+(?:@\d+)?)\b"`      | Parses the `BYTERANGE` attribute.                                           |
| `f5330`         | `VIDEO-RANGE=(SDR                   | PQ                                                                          | HLG)`                                                                            | Parses the `VIDEO-RANGE` attribute from the `#EXT-X-STREAM-INF` tag. |
| `f5331`         | `X-ASSET-URI="((?:.                 | \f)+?)"`                                                                    | Parses the `X-ASSET-URI` attribute.                                              |
| `f5332`         | `CLOSED-CAPTIONS="((?:.             | \f)+?)"`                                                                    | Parses the `CLOSED-CAPTIONS` attribute from the `#EXT-X-STREAM-INF` tag.         |
| `f5333`         | `URI="((?:.                         | \f)+?)"`                                                                    | Parses the `URI` attribute from the `#EXT-X-KEY` and `#EXT-X-MAP` tags.          |
| `f5334`         | `PRECISE=(NO                        | YES)`                                                                       | Parses the `PRECISE` attribute from the `#EXT-X-START` tag.                      |
| `f5335`         | `#EXTINF:[\d\.]+\b,(.+)`            | Parses the title of a media segment.                                        |
| `f5336`         | `LANGUAGE="((?:.                    | \f)+?)"`                                                                    | Parses the `LANGUAGE` attribute from the `#EXT-X-MEDIA` tag.                     |
| `f5337`         | `#EXTINF:\s*([\d\.]+)\b`            | Parses the duration of a media segment.                                     |
| `f5338`         | `LAST-PART=(\d+)\b`                 | Parses the `LAST-PART` attribute from the `#EXT-X-RENDITION-REPORT` tag.    |
| `f5339`         | `SKIPPED-SEGMENTS=(\d+)\b`          | Parses the `SKIPPED-SEGMENTS` attribute from the `#EXT-X-SKIP` tag.         |
| `f5340`         | `AUDIO="((?:.                       | \f)+?)"`                                                                    | Parses the `AUDIO` attribute from the `#EXT-X-STREAM-INF` tag.                   |
| `f5341`         | `IV=([^,.*]+)`                      | Parses the `IV` attribute from the `#EXT-X-KEY` tag.                        |
| `f5342`         | `[:,]ID="((?:.                      | \f)+?)"`                                                                    | Parses the `ID` attribute from the `#EXT-X-DATERANGE` tag.                       |
| `f5343`         | `CODECS="((?:.                      | \f)+?)"`                                                                    | Parses the `CODECS` attribute from the `#EXT-X-STREAM-INF` tag.                  |
| `f5344`         | `#EXT-X-MEDIA-SEQUENCE:(\d+)\b`     | Parses the media sequence number from the `#EXT-X-MEDIA-SEQUENCE` tag.      |
| `f5345`         | `CHANNELS="((?:.                    | \f)+?)"`                                                                    | Parses the `CHANNELS` attribute from the `#EXT-X-MEDIA` tag.                     |
| `f5346`         | `SUPPLEMENTAL-CODECS="((?:.         | \f)+?)"`                                                                    | Parses the `SUPPLEMENTAL-CODECS` attribute from the `#EXT-X-STREAM-INF` tag.     |
| `f5347`         | `FRAME-RATE=([\d\.]+)\b`            | Parses the `FRAME-RATE` attribute from the `#EXT-X-STREAM-INF` tag.         |
| `f5348`         | `GAP=(NO                            | YES)`                                                                       | Parses the `GAP` attribute.                                                      |
| `f5349`         | `CUE="((?:.                         | \f)+?)"`                                                                    | Parses the `CUE` attribute.                                                      |
| `f5350`         | `X-ASSET-LIST="((?:.                | \f)+?)"`                                                                    | Parses the `X-ASSET-LIST` attribute.                                             |
| `f5351`         | `CAN-SKIP-UNTIL=([\d\.]+)\b`        | Parses the `CAN-SKIP-UNTIL` attribute from the `#EXT-X-SERVER-CONTROL` tag. |
| `f5352`         | `START-DATE="((?:.                  | \f)+?)"`                                                                    | Parses the `START-DATE` attribute from the `#EXT-X-DATERANGE` tag.               |
| `f5353`         | `METHOD=(NONE                       | AES-128                                                                     | SAMPLE-AES                                                                       | SAMPLE-AES-CENC                                                      | SAMPLE-AES-CTR)\s\*(?:,                                  | $)` | Parses the encryption method from the `#EXT-X-KEY` tag. |
| `f5354`         | `PLANNED-DURATION=([\d\.]+)\b`      | Parses the `PLANNED-DURATION` attribute from the `#EXT-X-DATERANGE` tag.    |
| `f5355`         | `X-RESUME-OFFSET=(-?[\d\.]+)\b`     | Parses the `X-RESUME-OFFSET` attribute.                                     |
| `f5356`         | `BYTERANGE-LENGTH=(\d+)\b`          | Parses the `BYTERANGE-LENGTH` attribute.                                    |
| `f5357`         | `X-TIMELINE-OCCUPIES="((?:.         | \f)+?)"`                                                                    | Parses the `X-TIMELINE-OCCUPIES` attribute.                                      |

## 4. Supported HLS Tags and Attributes

The parser supports a wide range of HLS tags and their attributes. Here is a detailed breakdown:

### Media Segment Tags

- **`#EXTINF`**: Specifies the duration and title of a media segment.
  - **Duration:** A floating-point number indicating the duration of the segment in seconds.
  - **Title:** A string representing the title of the segment.
- **`#EXT-X-BYTERANGE`**: Indicates that the media segment is a sub-range of the resource identified by its URI.
  - **Length:** The length of the sub-range in bytes.
  - **Offset:** The offset from the beginning of the resource.
- **`#EXT-X-DISCONTINUITY`**: Indicates a discontinuity between the media segment that follows it and the one that preceded it.
- **`#EXT-X-KEY`**: Specifies how to decrypt media segments.
  - **`METHOD`**: The encryption method. Can be `NONE`, `AES-128`, `SAMPLE-AES`, `SAMPLE-AES-CENC`, or `SAMPLE-AES-CTR`.
  - **`URI`**: The URI of the key file.
  - **`IV`**: The initialization vector.
  - **`KEYFORMAT`**: The format of the key.
  - **`KEYFORMATVERSIONS`**: The versions of the key format.
- **`#EXT-X-MAP`**: Specifies how to obtain the Media Initialization Section.
  - **`URI`**: The URI of the resource containing the Media Initialization Section.
  - **`BYTERANGE`**: The byte range of the Media Initialization Section.

### Media Playlist Tags

- **`#EXT-X-TARGETDURATION`**: Specifies the maximum media segment duration.
- **`#EXT-X-MEDIA-SEQUENCE`**: Indicates the sequence number of the first media segment that appears in a playlist file.
- **`#EXT-X-DISCONTINUITY-SEQUENCE`**: Allows for synchronization between different renditions of the same variant stream.
- **`#EXT-X-ENDLIST`**: Indicates that no more media segments will be added to the playlist file.
- **`#EXT-X-PLAYLIST-TYPE`**: Provides mutability information about the playlist file. Can be `VOD` (static) or `EVENT` (dynamic).
- **`#EXT-X-I-FRAMES-ONLY`**: Indicates that each media segment in the playlist describes a single I-frame.

### Master Playlist Tags

- **`#EXT-X-STREAM-INF`**: Specifies a variant stream.
  - **`BANDWIDTH`**: The peak bandwidth of the stream.
  - **`AVERAGE-BANDWIDTH`**: The average bandwidth of the stream.
  - **`CODECS`**: A string containing a comma-separated list of the codecs used in the stream.
  - **`RESOLUTION`**: The resolution of the video in the stream.
  - **`FRAME-RATE`**: The frame rate of the video in the stream.
  - **`AUDIO`**: The group ID for the audio rendition.
  - **`VIDEO`**: The group ID for the video rendition.
  - **`SUBTITLES`**: The group ID for the subtitles rendition.
  - **`CLOSED-CAPTIONS`**: The group ID for the closed captions rendition.
- **`#EXT-X-I-FRAME-STREAM-INF`**: Specifies an I-frame variant stream.
- **`#EXT-X-SESSION-DATA`**: Specifies arbitrary session data.
- **`#EXT-X-SESSION-KEY`**: Specifies a master key for the playlist.

### Other Tags

- **`#EXT-X-DATERANGE`**: Associates a date range with a set of attributes.
- **`#EXT-X-START`**: Indicates a preferred starting point for the playlist.
- **`#EXT-X-SERVER-CONTROL`**: Provides information to the client about the server's capabilities.
- **`#EXT-X-PART-INF`**: Provides information about the partial segments of the playlist.
- **`#EXT-X-RENDITION-REPORT`**: Provides a report of the renditions that are currently being played.
- **`#EXT-X-SKIP`**: Skips a number of segments from the beginning of the playlist.
- **`#EXT-X-PRELOAD-HINT`**: Hints to the client that it should preload a particular resource.
