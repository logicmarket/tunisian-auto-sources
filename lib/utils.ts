/** Small, dependency-free helpers shared by search, filters, and UI. */

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Normalizes Arabic and Latin text for search and filtering:
 * - strips Arabic diacritics (tashkeel) and tatweel
 * - unifies alef / ya / ta-marbuta variants
 * - lowercases Latin text
 * - converts Arabic-Indic digits to ASCII
 */
export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\u0640/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0653-\u0655]/g, "")
    .replace(/[\u0660-\u0669]/g, (digit) =>
      String.fromCharCode(digit.charCodeAt(0) - 0x0660 + 0x30),
    )
    .replace(/[\u06F0-\u06F9]/g, (digit) =>
      String.fromCharCode(digit.charCodeAt(0) - 0x06f0 + 0x30),
    )
    .trim();
}

/** Tokenizer used by MiniSearch (Unicode-aware, unlike the default). */
export function tokenizeForSearch(text: string): string[] {
  return normalizeSearchText(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Stable key for matching API filter values to database values. */
export function toFilterKey(value: string): string {
  return normalizeSearchText(value)
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** Formats counts with Latin digits, which are standard in Tunisia. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Long Arabic date with Latin digits, e.g. "12 نوفمبر 2026". */
export function formatArabicDate(value: string | null | undefined): string {
  if (!value) return "غير متوفر";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ar-TN-u-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

/** Splits a newline-delimited TEXT column into clean display lines. */
export function splitLines(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function formatRating(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
