import { Playlist } from "./types.js";
import {
  TvgChannel,
  TvgProgramme,
  buildEpgBindingIndex,
  buildChannelCategoryMap,
  normalizeName,
} from "./xmltv.js";

export interface EnrichOptions {
  topNCategories?: number; // default 3
  attachIconIfMissing?: boolean; // default true
}

export function enrichPlaylistWithEpg(
  playlist: Playlist,
  channels: TvgChannel[],
  programs: TvgProgramme[],
  opts: EnrichOptions = {},
): Playlist {
  const topN = opts.topNCategories ?? 3;
  const attachIcon = opts.attachIconIfMissing ?? true;
  const idx = buildEpgBindingIndex(channels);
  const catMap = buildChannelCategoryMap(programs, { topN });

  const items = playlist.items.map((it) => {
    const tvgId = it.tvg?.id?.toLowerCase();
    // Prefer tvg-id bind, fallback to tvg-name / entry name
    let ch: TvgChannel | undefined;
    if (tvgId) ch = idx.byId.get(tvgId);
    if (!ch) {
      const key = normalizeName(it.tvg?.name || it.name || "");
      if (key) ch = idx.byName.get(key);
    }
    if (!ch) return it;

    const categories = catMap.get(ch.id) || [];
    const epg = {
      channelId: ch.id,
      iconUrl: ch.iconUrl,
      categories,
    };
    const extras = { ...(it.extras ?? {}), epg } as typeof it.extras;

    // Optionally attach icon if missing
    let tvg = it.tvg;
    if (attachIcon && ch.iconUrl && (!tvg || !tvg.logo)) {
      tvg = { ...(tvg ?? {}), logo: ch.iconUrl };
    }

    return {
      ...it,
      tvg,
      extras,
    };
  });

  return { ...playlist, items };
}
