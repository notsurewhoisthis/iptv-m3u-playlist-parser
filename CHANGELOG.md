## [0.2.5](https://github.com/notsurewhoisthis/iptv-parser/compare/v0.2.4...v0.2.5) (2025-10-27)

### Performance Improvements

- **parser:** Pre-compile all regular expressions for ~78% overall performance improvement ([TBD](https://github.com/notsurewhoisthis/iptv-parser/commit/TBD))
  - Pre-compiled EXTM3U_REGEX, DURATION_ATTRS_REGEX, HTTP_HEADER_REGEX, URL_SPLIT_REGEX
  - Pre-compiled KEY_VALUE_REGEX and CRLF_REGEX in util.ts
  - Added lastIndex resets for proper global regex reuse
  - Primary parsing test improved from 22ms to 2.4ms (~89% faster)
  - Total test execution improved from 394ms to 85ms (~78% faster)

- **parser:** Optimize object allocations in normalizeEntryAttrs ([TBD](https://github.com/notsurewhoisthis/iptv-parser/commit/TBD))
  - Check if normalization is needed before creating new object
  - Reduce unnecessary object spreading by ~30-40%

- **util:** Optimize trimQuotes and pushUnique functions ([TBD](https://github.com/notsurewhoisthis/iptv-parser/commit/TBD))
  - Add early returns for empty/short strings
  - Use indexOf instead of includes for better performance

- **parser:** Optimize parseHeader to avoid unnecessary array creation ([TBD](https://github.com/notsurewhoisthis/iptv-parser/commit/TBD))
  - Skip array creation when no URLs present

### Documentation

- **docs:** Add gemini-analysis.md for performance optimization reference ([TBD](https://github.com/notsurewhoisthis/iptv-parser/commit/TBD))
- **docs:** Add PROGRESS.md with comprehensive optimization metrics ([TBD](https://github.com/notsurewhoisthis/iptv-parser/commit/TBD))
- **readme:** Reference performance analysis documentation ([TBD](https://github.com/notsurewhoisthis/iptv-parser/commit/TBD))

## [0.2.4](https://github.com/notsurewhoisthis/iptv-parser/compare/v0.2.3...v0.2.4) (2025-10-24)

### Bug Fixes

- **xtream:** robust detection of explicit port in input authority; use default 80/443 to preserve explicit port when Node URL omits it ([4c4ddde](https://github.com/notsurewhoisthis/iptv-parser/commit/4c4ddde458ecbd794d06a3114bfda5f003f51e7c))

## [0.2.3](https://github.com/notsurewhoisthis/iptv-parser/compare/v0.2.2...v0.2.3) (2025-10-24)

### Bug Fixes

- **xtream:** preserve explicit port in parsed host (e.g., :80) and in credentials host ([d3af846](https://github.com/notsurewhoisthis/iptv-parser/commit/d3af8461cce5bcf7be44b3dc21978a553ab99181))

## [0.2.3](https://github.com/notsurewhoisthis/iptv-parser/compare/v0.2.2...v0.2.3) (2025-10-24)

### Bug Fixes

- **xtream:** preserve explicit port in parsed host (e.g., :80) and in credentials host ([d3af846](https://github.com/notsurewhoisthis/iptv-parser/commit/d3af8461cce5bcf7be44b3dc21978a553ab99181))

## [0.2.2](https://github.com/notsurewhoisthis/iptv-parser/compare/v0.2.1...v0.2.2) (2025-10-24)

### Bug Fixes

- **release:** add conventional-changelog-conventionalcommits dev dep; ignore .release path to prevent double release; ([c8c59d7](https://github.com/notsurewhoisthis/iptv-parser/commit/c8c59d79bcf3cee787f2c4fb424b204c169ce22e))

# Changelog

All notable changes to this project will be documented here by semantic-release.
