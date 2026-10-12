// ─── Font Name Mapper ─────────────────────────────────────────────────────────
// PDF fonts often have subset prefixes like "ABCDEF+HelveticaNeue-Regular".
// This strips the prefix and maps to the nearest pdf-lib StandardFont.

import type { StandardFont } from '@/types';

const FONT_MAP: Array<[RegExp, StandardFont]> = [
  [/helvetica|arial|sans/i, 'Helvetica'],
  [/helvetica.*bold|arial.*bold/i, 'Helvetica-Bold'],
  [/times|serif/i, 'Times-Roman'],
  [/times.*bold/i, 'Times-Bold'],
  [/courier|mono|consolas|code/i, 'Courier'],
  [/courier.*bold/i, 'Courier-Bold'],
];

/**
 * Given a raw PDF font name (possibly subset-prefixed), return the closest
 * pdf-lib StandardFont name, or 'Helvetica' as a safe fallback.
 */
export function mapFontName(rawFontName: string): StandardFont {
  // Strip subset prefix "XXXXXX+"
  const clean = rawFontName.replace(/^[A-Z]{6}\+/, '');

  for (const [pattern, font] of FONT_MAP) {
    if (pattern.test(clean)) return font;
  }
  return 'Helvetica'; // safe fallback
}

/**
 * Returns true if the font name looks like a subset-embedded font
 * (6 uppercase letters followed by +), which means glyphs may be missing.
 */
export function isSubsetFont(rawFontName: string): boolean {
  return /^[A-Z]{6}\+/.test(rawFontName);
}

/**
 * Returns CSS font family and font weight for previewing rendered text on screen.
 */
export function getFontCss(fontName: string): { fontFamily: string; fontWeight: string } {
  switch (fontName) {
    case 'Helvetica-Bold':
      return { fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 'bold' };
    case 'Helvetica':
      return { fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 'normal' };
    case 'Times-Bold':
      return { fontFamily: '"Times New Roman", Times, serif', fontWeight: 'bold' };
    case 'Times-Roman':
      return { fontFamily: '"Times New Roman", Times, serif', fontWeight: 'normal' };
    case 'Courier-Bold':
      return { fontFamily: '"Courier New", Courier, monospace', fontWeight: 'bold' };
    case 'Courier':
      return { fontFamily: '"Courier New", Courier, monospace', fontWeight: 'normal' };
    default:
      return { fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 'normal' };
  }
}
