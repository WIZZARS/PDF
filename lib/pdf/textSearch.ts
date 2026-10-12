// ─── Text Search — Primary Replacement Flow ───────────────────────────────────
// Searches all pages for a query string using getTextContent() and returns
// matched regions with their bounding boxes in PDF coordinate space.

import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextMatch, TextItem } from '@/types';
import { mapFontName } from '@/lib/fonts/fontMatcher';

interface PdfJsTextItem {
  str: string;
  dir?: string;
  transform: number[];
  width?: number;
  height?: number;
  fontName?: string;
  hasEOL?: boolean;
}

/**
 * Search every page in the document for `query` (case-insensitive).
 * Returns one TextMatch per contiguous occurrence, with a union bounding box.
 */
export async function searchText(
  pdfDoc: PDFDocumentProxy,
  query: string
): Promise<TextMatch[]> {
  if (!query.trim()) return [];
  const needle = query.toLowerCase();
  const matches: TextMatch[] = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 }); // PDF points
    const content = await page.getTextContent();

    // Build a flat list of enriched items for this page
    const items: TextItem[] = [];
    for (const raw of content.items) {
      const item = raw as PdfJsTextItem;
      if (!('str' in item) || !item.str) continue;

      // item.transform = [scaleX, skewX, skewY, scaleY, tx, ty]
      const [, , , scaleY, tx, ty] = item.transform;
      const fontSize = Math.abs(scaleY);
      const w = item.width ?? fontSize * item.str.length * 0.6;
      const h = fontSize;

      // PDF.js uses PDF coordinate space (origin bottom-left) at scale 1
      // We want [x, y, width, height] with origin at bottom-left as well
      items.push({
        str: item.str,
        fontName: item.fontName ?? '',
        fontSize,
        bbox: [tx, ty, w, h],
        pageNumber: pageNum,
      });

      void viewport; // viewport not needed here; coords already in PDF space
    }

    // Concatenate all item strings and find needle occurrences
    const fullText = items.map((i) => i.str).join('');
    const fullLower = fullText.toLowerCase();

    let searchStart = 0;
    while (true) {
      const idx = fullLower.indexOf(needle, searchStart);
      if (idx === -1) break;

      // Map character index back to item indices
      const hitItems = charIndexToItems(items, idx, needle.length);
      if (hitItems.length > 0) {
        const bbox = unionBbox(hitItems.map((i) => i.bbox));
        const firstItem = hitItems[0];
        matches.push({
          pageNumber: pageNum,
          items: hitItems,
          bbox,
          fontName: mapFontName(firstItem.fontName),
          fontSize: firstItem.fontSize,
        });
      }
      searchStart = idx + needle.length;
    }
  }

  return matches;
}

/** Find the text items that cover character positions [start, start+length). */
function charIndexToItems(
  items: TextItem[],
  start: number,
  length: number
): TextItem[] {
  let cursor = 0;
  const result: TextItem[] = [];
  let remaining = length;

  for (const item of items) {
    const end = cursor + item.str.length;
    if (end <= start) { cursor = end; continue; }
    if (cursor >= start + length) break;

    result.push(item);
    remaining -= Math.min(end, start + length) - Math.max(cursor, start);
    cursor = end;
    if (remaining <= 0) break;
  }
  return result;
}

/** Compute the bounding-box union of an array of [x,y,w,h] rects. */
function unionBbox(
  bboxes: Array<[number, number, number, number]>
): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y, w, h] of bboxes) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }
  return [minX, minY, maxX - minX, maxY - minY];
}
