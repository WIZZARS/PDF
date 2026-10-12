// ─── PDF Overlay Editor ───────────────────────────────────────────────────────
// Applies cover-and-overlay edits to a PDF document using pdf-lib.
// Runs on the main thread; move to a Worker only if > 10 s on 50-page PDFs.

import { PDFDocument, rgb, StandardFonts, type RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Region, StandardFont } from '@/types';
import { isSubsetFont } from '@/lib/fonts/fontMatcher';

export interface ExportOptions {
  regions: Region[];
  totalPages: number;
  onProgress?: (pct: number) => void;
  onFontWarning?: (msg: string) => void;
}

/** Hex colour string → pdf-lib RGB (0–1 range) */
function hexToRgb(hex: string): RGB {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

/** Map our StandardFont names to pdf-lib StandardFonts enum values */
function toPdfLibFont(name: StandardFont | 'custom'): keyof typeof StandardFonts {
  const map: Record<string, keyof typeof StandardFonts> = {
    'Helvetica': 'Helvetica',
    'Helvetica-Bold': 'HelveticaBold',
    'Times-Roman': 'TimesRoman',
    'Times-Bold': 'TimesBold',
    'Courier': 'Courier',
    'Courier-Bold': 'CourierBold',
  };
  return map[name] ?? 'Helvetica';
}

/**
 * Determine which page numbers a rule targets.
 */
export function resolvePages(pageTarget: Region['rule']['pageTarget'], total: number): number[] {
  switch (pageTarget.type) {
    case 'all':
      return Array.from({ length: total }, (_, i) => i + 1);
    case 'odd':
      return Array.from({ length: total }, (_, i) => i + 1).filter((n) => n % 2 !== 0);
    case 'even':
      return Array.from({ length: total }, (_, i) => i + 1).filter((n) => n % 2 === 0);
    case 'range':
      return Array.from(
        { length: pageTarget.to - pageTarget.from + 1 },
        (_, i) => pageTarget.from + i
      );
    case 'specific':
      return pageTarget.pages;
  }
}

/**
 * Apply all regions to a copy of the PDF bytes and return the new bytes.
 *
 * ⚠️ Cover-and-overlay limitation: the original text is visually hidden but
 * remains in the PDF text layer (selectable/searchable). The UI must display
 * a notice to the user.
 */
export async function applyRegionsToPdf(
  sourceBytes: ArrayBuffer,
  options: ExportOptions
): Promise<Uint8Array> {
  const { regions, totalPages, onProgress, onFontWarning } = options;

  const pdfDoc = await PDFDocument.load(sourceBytes);
  pdfDoc.registerFontkit(fontkit);

  const pages = pdfDoc.getPages();
  const total = regions.length;
  let done = 0;

  for (const region of regions) {
    const rule = region.rule;
    const targetPages = resolvePages(rule.pageTarget, totalPages);

    // Warn about subset fonts once per unique font
    if (isSubsetFont(rule.fontFamily as string)) {
      const fallbackName = (rule.fontFamily as StandardFont | 'custom') === 'custom'
        ? 'Helvetica'
        : rule.fontFamily;
      const msg = `Original font may be a subset. Falling back to ${fallbackName}.`;
      onFontWarning?.(msg);
    }

    const fontKey = toPdfLibFont(rule.fontFamily as StandardFont | 'custom');
    const embeddedFont = await pdfDoc.embedFont(StandardFonts[fontKey]);

    for (const pageNum of targetPages) {
      if (pageNum < 1 || pageNum > pages.length) continue;
      const page = pages[pageNum - 1];
      const { height: pageH } = page.getSize();

      // PDF-lib uses bottom-left origin — same as our stored coords ✓
      const x = region.x;
      const y = region.y;
      const w = region.width;
      const h = region.height;

      // 1. Cover old text with a white rectangle (matching background)
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color: rgb(1, 1, 1), // white
        opacity: 1,
      });

      // 2. Draw replacement text
      const effectiveColor = !rule.color || rule.color.toLowerCase() === '#ffffff' ? '#000000' : rule.color;
      const textColor = hexToRgb(effectiveColor);
      const fontSize = rule.fontSize;
      const textWidth = embeddedFont.widthOfTextAtSize(rule.replacementText, fontSize);

      let textX = x;
      if (rule.alignment === 'center') textX = x + (w - textWidth) / 2;
      if (rule.alignment === 'right') textX = x + w - textWidth;
      // Vertically centre within the box
      const textY = y + (h - fontSize) / 2;

      page.drawText(rule.replacementText, {
        x: Math.max(x, textX),
        y: Math.max(pageH * 0, textY), // clamp to page
        font: embeddedFont,
        size: fontSize,
        color: textColor,
      });
    }

    done++;
    onProgress?.(Math.round((done / total) * 100));
  }

  return pdfDoc.save();
}
