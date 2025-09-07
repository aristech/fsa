/**
 * Comprehensive slugify utility with Greek transliteration support
 * Converts text to URL-friendly slugs with proper internationalization
 */

// Greek to Latin transliteration map
const GREEK_TO_LATIN: Record<string, string> = {
  // Uppercase Greek letters
  Α: "A",
  Β: "B",
  Γ: "G",
  Δ: "D",
  Ε: "E",
  Ζ: "Z",
  Η: "I",
  Θ: "TH",
  Ι: "I",
  Κ: "K",
  Λ: "L",
  Μ: "M",
  Ν: "N",
  Ξ: "X",
  Ο: "O",
  Π: "P",
  Ρ: "R",
  Σ: "S",
  Τ: "T",
  Υ: "Y",
  Φ: "F",
  Χ: "CH",
  Ψ: "PS",
  Ω: "O",

  // Lowercase Greek letters
  α: "a",
  β: "b",
  γ: "g",
  δ: "d",
  ε: "e",
  ζ: "z",
  η: "i",
  θ: "th",
  ι: "i",
  κ: "k",
  λ: "l",
  μ: "m",
  ν: "n",
  ξ: "x",
  ο: "o",
  π: "p",
  ρ: "r",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "y",
  φ: "f",
  χ: "ch",
  ψ: "ps",
  ω: "o",

  // Greek diacritics and combinations
  ά: "a",
  έ: "e",
  ή: "i",
  ί: "i",
  ό: "o",
  ύ: "y",
  ώ: "o",
  Ά: "A",
  Έ: "E",
  Ή: "I",
  Ί: "I",
  Ό: "O",
  Ύ: "Y",
  Ώ: "O",
  ϊ: "i",
  ϋ: "y",
  ΐ: "i",
  ΰ: "y",
  Ϊ: "I",
  Ϋ: "Y",

  // Common Greek digraphs
  ου: "ou",
  ΟΥ: "OU",
  Ου: "Ou",
  αι: "ai",
  ΑΙ: "AI",
  Αι: "Ai",
  ει: "ei",
  ΕΙ: "EI",
  Ει: "Ei",
  οι: "oi",
  ΟΙ: "OI",
  Οι: "Oi",
  υι: "yi",
  ΥΙ: "YI",
  Υι: "Yi",
  αυ: "av",
  ΑΥ: "AV",
  Αυ: "Av",
  ευ: "ev",
  ΕΥ: "EV",
  Ευ: "Ev",
};

// Extended transliteration for other languages
const EXTENDED_TRANSLITERATION: Record<string, string> = {
  // Cyrillic (Russian/Bulgarian)
  А: "A",
  Б: "B",
  В: "V",
  Г: "G",
  Д: "D",
  Е: "E",
  Ё: "Yo",
  Ж: "Zh",
  З: "Z",
  И: "I",
  Й: "Y",
  К: "K",
  Л: "L",
  М: "M",
  Н: "N",
  О: "O",
  П: "P",
  Р: "R",
  С: "S",
  Т: "T",
  У: "U",
  Ф: "F",
  Х: "Kh",
  Ц: "Ts",
  Ч: "Ch",
  Ш: "Sh",
  Щ: "Shch",
  Ъ: "",
  Ы: "Y",
  Ь: "",
  Э: "E",
  Ю: "Yu",
  Я: "Ya",

  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",

  // Arabic
  ا: "a",
  ب: "b",
  ت: "t",
  ث: "th",
  ج: "j",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "dh",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "d",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "q",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  و: "w",
  ي: "y",

  // Hebrew
  א: "a",
  ב: "b",
  ג: "g",
  ד: "d",
  ה: "h",
  ו: "v",
  ז: "z",
  ח: "ch",
  ט: "t",
  י: "y",
  כ: "k",
  ל: "l",
  מ: "m",
  נ: "n",
  ס: "s",
  ע: "a",
  פ: "p",
  צ: "ts",
  ק: "q",
  ר: "r",
  ש: "sh",
  ת: "t",

  // Chinese (Pinyin approximation)
  一: "yi",
  二: "er",
  三: "san",
  四: "si",
  五: "wu",
  六: "liu",
  七: "qi",
  八: "ba",
  九: "jiu",
  十: "shi",

  // Japanese (Hiragana/Katakana to Romaji)
  あ: "a",
  い: "i",
  う: "u",
  え: "e",
  お: "o",
  か: "ka",
  き: "ki",
  く: "ku",
  け: "ke",
  こ: "ko",
  さ: "sa",
  し: "shi",
  す: "su",
  せ: "se",
  そ: "so",
  た: "ta",
  ち: "chi",
  つ: "tsu",
  て: "te",
  と: "to",
  な: "na",
  に: "ni",
  ぬ: "nu",
  ね: "ne",
  の: "no",
  は: "ha",
  ひ: "hi",
  ふ: "fu",
  へ: "he",
  ほ: "ho",
  ま: "ma",
  み: "mi",
  む: "mu",
  め: "me",
  も: "mo",
  や: "ya",
  ゆ: "yu",
  よ: "yo",
  ら: "ra",
  り: "ri",
  る: "ru",
  れ: "re",
  ろ: "ro",
  わ: "wa",
  を: "wo",
  ん: "n",

  // Korean (Hangul to Romanization)
  ㄱ: "g",
  ㄴ: "n",
  ㄷ: "d",
  ㄹ: "r",
  ㅁ: "m",
  ㅂ: "b",
  ㅅ: "s",
  ㅇ: "ng",
  ㅈ: "j",
  ㅊ: "ch",
  ㅋ: "k",
  ㅌ: "t",
  ㅍ: "p",
  ㅎ: "h",
  ㅏ: "a",
  ㅓ: "eo",
  ㅗ: "o",
  ㅜ: "u",
  ㅡ: "eu",
  ㅣ: "i",
};

// Combine all transliteration maps
const TRANSLITERATION_MAP = { ...GREEK_TO_LATIN, ...EXTENDED_TRANSLITERATION };

/**
 * Transliterates text from various scripts to Latin characters
 * @param text - The text to transliterate
 * @returns Transliterated text
 */
function transliterate(text: string): string {
  let result = text;

  // Handle Greek digraphs first (longer patterns first)
  const greekDigraphs = [
    ["ου", "ou"],
    ["ΟΥ", "OU"],
    ["Ου", "Ou"],
    ["αι", "ai"],
    ["ΑΙ", "AI"],
    ["Αι", "Ai"],
    ["ει", "ei"],
    ["ΕΙ", "EI"],
    ["Ει", "Ei"],
    ["οι", "oi"],
    ["ΟΙ", "OI"],
    ["Οι", "Oi"],
    ["υι", "yi"],
    ["ΥΙ", "YI"],
    ["Υι", "Yi"],
    ["αυ", "av"],
    ["ΑΥ", "AV"],
    ["Αυ", "Av"],
    ["ευ", "ev"],
    ["ΕΥ", "EV"],
    ["Ευ", "Ev"],
  ];

  for (const [greek, latin] of greekDigraphs) {
    result = result.replace(new RegExp(greek, "g"), latin);
  }

  // Handle individual characters
  for (const [char, replacement] of Object.entries(TRANSLITERATION_MAP)) {
    result = result.replace(new RegExp(char, "g"), replacement);
  }

  return result;
}

/**
 * Converts text to a URL-friendly slug
 * @param text - The text to slugify
 * @param options - Configuration options
 * @returns URL-friendly slug
 */
export function slugify(
  text: string,
  options: {
    separator?: string;
    lower?: boolean;
    strict?: boolean;
    trim?: boolean;
  } = {}
): string {
  const {
    separator = "-",
    lower = true,
    strict = false,
    trim = true,
  } = options;

  if (!text) return "";

  let slug = text;

  // Trim whitespace
  if (trim) {
    slug = slug.trim();
  }

  // Transliterate non-Latin characters
  slug = transliterate(slug);

  // Convert to lowercase if requested
  if (lower) {
    slug = slug.toLowerCase();
  }

  // Replace spaces and underscores with separator
  slug = slug.replace(/[\s_]+/g, separator);

  // Remove or replace special characters
  if (strict) {
    // Only allow alphanumeric characters and separators
    slug = slug.replace(/[^a-z0-9\-]/g, "");
  } else {
    // Allow more characters but clean up
    slug = slug.replace(/[^\w\-\.~]/g, "");
  }

  // Replace multiple separators with single separator
  slug = slug.replace(new RegExp(`\\${separator}+`, "g"), separator);

  // Remove leading/trailing separators
  slug = slug.replace(new RegExp(`^\\${separator}+|\\${separator}+$`, "g"), "");

  return slug;
}

/**
 * Generates a unique slug by appending a number if the slug already exists
 * @param baseSlug - The base slug to make unique
 * @param existingSlugs - Array of existing slugs to check against
 * @param separator - Separator to use for the number suffix
 * @returns Unique slug
 */
export function makeUniqueSlug(
  baseSlug: string,
  existingSlugs: string[],
  separator: string = "-"
): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  let uniqueSlug = `${baseSlug}${separator}${counter}`;

  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}${separator}${counter}`;
  }

  return uniqueSlug;
}

/**
 * Validates if a slug is valid
 * @param slug - The slug to validate
 * @returns True if valid, false otherwise
 */
export function isValidSlug(slug: string): boolean {
  if (!slug) return false;

  // Check if slug contains only allowed characters
  const validSlugRegex = /^[a-z0-9\-]+$/;
  return validSlugRegex.test(slug);
}

// Export default slugify function
export default slugify;
