Xtream URL Helpers

The library includes small utilities for detecting and working with Xtream Codes–style URLs.

Detect and Parse
```ts
import { isXtreamUrl, parseXtream } from 'iptv-m3u-parser/dist/xtream.js';

isXtreamUrl('http://example.com/get.php?username=u&password=p&type=m3u'); // true

const info = parseXtream('http://example.com/get.php?username=u&password=p&type=m3u&output=ts');
// -> { host: 'http://example.com', username: 'u', password: 'p', type: 'm3u', output: 'ts' }
```

Build URLs
```ts
import { makeXtreamCredentials, buildXtreamM3uUrl, buildXtreamCatchupUrl } from 'iptv-m3u-parser/dist/xtream.js';

const creds = makeXtreamCredentials('http://example.com:8080', 'u', 'p');
const m3uUrl = buildXtreamM3uUrl(creds, { type: 'm3u', output: 'ts' });
// -> http://example.com:8080/get.php?username=u&password=p&type=m3u&output=ts

// Common timeshift (catchup) endpoint (format varies by panel):
const catchupUrl = buildXtreamCatchupUrl(creds, /* streamId */ 1234, /* startUtc */ Date.now(), /* durationSec */ 7200, 'ts');
```

Notes
- Xtream deployments vary. These helpers cover common patterns but may need adjustment for a specific panel.
- The parser itself remains playlist-centric; Xtream helpers are optional utilities.
