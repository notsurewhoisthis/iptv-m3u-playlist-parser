/**
 * Multilingual text normalization and keyword matching for IPTV classification
 *
 * Supports: English (en), Turkish (tr), German (de), French (fr), Spanish (es), Arabic (ar)
 */

/**
 * Normalize text for case-insensitive, diacritic-insensitive matching
 * Handles Turkish special characters (İ, ı, ğ, ş, ç, ö, ü) properly
 */
export function normalizeText(text: string, locale: string = "en"): string {
  if (!text) return "";

  // Turkish requires special handling for dotted/dotless i
  if (locale === "tr" || locale === "tr_TR") {
    // In Turkish: İ (U+0130) lowercase is i, I uppercase is ı (U+0131)
    text = text
      .replace(/İ/g, "i")
      .replace(/I/g, "ı")
      .toLowerCase();
    // Normalize common Turkish diacritics
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove combining diacritics
      .toLowerCase();
  }

  // For Arabic, preserve the text but lowercase (Arabic doesn't have case, but keep for mixed content)
  if (locale === "ar") {
    return text.trim();
  }

  // Standard normalization for Western languages
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .toLowerCase();
}

/**
 * Tokenize text by splitting on common separators and filtering stop words
 */
export function tokenizeText(
  text: string,
  locale: string = "en",
): string[] {
  const normalized = normalizeText(text, locale);
  const stopWords = getStopWords(locale);

  return normalized
    .split(/[\s\-_|,;.]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopWords.has(t));
}

/**
 * Get stop words for a locale (words to ignore during classification)
 */
function getStopWords(locale: string): Set<string> {
  const common = new Set([
    "hd",
    "fhd",
    "uhd",
    "4k",
    "sd",
    "hevc",
    "h264",
    "h265",
    "1080p",
    "720p",
    "480p",
  ]);

  const byLocale: Record<string, string[]> = {
    en: ["the", "and", "or", "tv", "channel"],
    tr: ["ve", "veya", "tv", "kanal", "ve"],
    de: ["und", "oder", "der", "die", "das", "tv", "kanal"],
    fr: ["et", "ou", "le", "la", "les", "tv", "chaine"],
    es: ["y", "o", "el", "la", "los", "las", "tv", "canal"],
  };

  const localeStops = byLocale[locale] || [];
  return new Set([...common, ...localeStops]);
}

/**
 * Comprehensive keyword libraries for media classification
 */
export const KEYWORDS = {
  // SERIES/SHOWS keywords by locale
  series: {
    en: [
      "series",
      "show",
      "shows",
      "season",
      "seasons",
      "episode",
      "episodes",
      "episod",
      "serial",
      "serials",
      "miniseries",
      "mini series",
      "tv show",
      "tv shows",
      "tv series",
    ],
    tr: [
      "dizi",
      "diziler",
      "dizileri",
      "tv dizileri",
      "sezon",
      "bolum",
      "bölüm",
    ],
    de: [
      "serie",
      "serien",
      "staffel",
      "folge",
      "folgen",
      "fernsehserie",
      "tv serie",
    ],
    fr: [
      "serie",
      "series",
      "saison",
      "episode",
      "episodes",
      "emission",
      "emissions",
    ],
    es: [
      "serie",
      "series",
      "temporada",
      "episodio",
      "episodios",
      "programa",
      "programas",
    ],
    ar: ["مسلسل", "مسلسلات", "حلقة", "موسم", "برنامج"],
  },

  // MOVIE keywords by locale
  movie: {
    en: [
      "movie",
      "movies",
      "film",
      "films",
      "cinema",
      "vod",
      "video on demand",
      "bluray",
      "blu ray",
      "dvdrip",
      "webrip",
      "hdrip",
      "4k movie",
      "hdr",
      "bollywood",
      "hollywood",
    ],
    tr: [
      "film",
      "filmler",
      "sinema",
      "dublaj",
      "altyazili",
      "altyazılı",
      "vizyon",
      "vizyonda",
      "vizyondakiler",
    ],
    de: [
      "film",
      "filme",
      "kino",
      "kinofilm",
      "kinofilme",
      "liebesfilm",
      "liebesfilme",
      "actionfilm",
    ],
    fr: [
      "film",
      "films",
      "cinema",
      "cinéma",
      "vod",
      "comedie",
      "comédie",
      "action",
    ],
    es: [
      "pelicula",
      "película",
      "peliculas",
      "películas",
      "cine",
      "vod",
      "estreno",
      "estrenos",
    ],
    ar: ["فيلم", "أفلام", "سينما", "مباشر"],
  },

  // LIVE TV keywords by locale
  live: {
    en: [
      "live",
      "channel",
      "channels",
      "sport",
      "sports",
      "news",
      "ppv",
      "pay per view",
      "24/7",
      "247",
      "streaming",
      "broadcast",
      "national",
      "international",
      "documentary",
      "kids",
      "children",
      "entertainment",
      "raw",
      "adaptive",
      "adaptif",
    ],
    tr: [
      "canli",
      "canlı",
      "spor",
      "haber",
      "ulusal",
      "ulusal kanallar",
      "belgesel",
      "cocuk",
      "çocuk",
      "eglence",
      "eğlence",
    ],
    de: [
      "live",
      "sender",
      "sport",
      "nachrichten",
      "kinder",
      "unterhaltung",
      "doku",
      "dokumentation",
    ],
    fr: [
      "direct",
      "en direct",
      "chaine",
      "chaîne",
      "sport",
      "info",
      "actualite",
      "actualité",
      "enfants",
      "jeunesse",
      "divertissement",
    ],
    es: [
      "en vivo",
      "directo",
      "canal",
      "deporte",
      "deportes",
      "noticias",
      "infantil",
      "niños",
      "entretenimiento",
    ],
    ar: ["مباشر", "قناة", "قنوات", "رياضة", "أخبار", "أطفال", "وثائقي"],
  },

  // RADIO keywords by locale
  radio: {
    en: [
      "radio",
      "music",
      "fm",
      "am",
      "shoutcast",
      "radio station",
      "radio stations",
      "podcast",
    ],
    tr: ["radyo", "muzik", "müzik", "fm", "am"],
    de: ["radio", "musik", "fm", "am", "sender"],
    fr: ["radio", "musique", "fm", "am", "station"],
    es: ["radio", "música", "musica", "fm", "am", "emisora"],
    ar: ["راديو", "موسيقى", "إذاعة"],
  },

  // Platform/Service hints (suggest VOD/Series)
  platform: {
    all: [
      "netflix",
      "amazon",
      "prime",
      "disney",
      "disney+",
      "apple",
      "apple tv",
      "hbo",
      "hbo max",
      "max",
      "paramount",
      "paramount+",
      "showtime",
      "starz",
      "hulu",
      "peacock",
      "gain",
      "tabii",
      "exxen",
      "blutv",
      "puhu",
      "bbc",
      "iplayer",
      "cw",
      "mubi",
      "criterion",
    ],
  },
};

/**
 * Check if text contains any keywords from a keyword set
 */
export function containsKeywords(
  text: string,
  keywords: string[],
  locale: string = "en",
): boolean {
  const normalized = normalizeText(text, locale);
  return keywords.some((kw) =>
    normalized.includes(normalizeText(kw, locale)),
  );
}

/**
 * Get all keywords for a media kind and locale
 */
export function getKeywords(
  kind: "series" | "movie" | "live" | "radio" | "platform",
  locale: string = "en",
): string[] {
  if (kind === "platform") {
    return KEYWORDS.platform.all;
  }

  const keywordSet = KEYWORDS[kind];
  if (!keywordSet) return [];

  // Return locale-specific keywords, fallback to English
  const localeKeys = keywordSet[locale as keyof typeof keywordSet] || [];
  const enKeys = keywordSet.en || [];

  // Combine locale-specific and English (for mixed content)
  return locale === "en" ? enKeys : [...localeKeys, ...enKeys];
}

/**
 * Count keyword matches in text (useful for scoring)
 */
export function countKeywordMatches(
  text: string,
  keywords: string[],
  locale: string = "en",
): number {
  const normalized = normalizeText(text, locale);
  return keywords.filter((kw) =>
    normalized.includes(normalizeText(kw, locale)),
  ).length;
}
