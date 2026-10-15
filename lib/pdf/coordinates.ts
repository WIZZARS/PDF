// ─── Coordinate Conversion ────────────────────────────────────────────────────
// Uses PDF.js's own viewport methods — handles rotation, CropBox offsets,
// and zoom scale automatically. Do NOT hand-roll these conversions.

import type { PageViewport } from 'pdfjs-dist';

export interface PDFRect {
  x: number;      // bottom-left origin (PDF convention)
  y: number;
  width: number;
  height: number;
}

export interface CSSRect {
  left: number;   // top-left origin (CSS convention)
  top: number;
  width: number;
  height: number;
}

/**
 * Convert a rectangle drawn in CSS pixel space (from Pointer Events) to
 * PDF point space. The viewport already encodes scale, rotation, and CropBox.
 *
 * Input coordinates must be relative to the top-left corner of the rendered
 * canvas element in CSS pixels (i.e. subtract the canvas's getBoundingClientRect).
 */
export function cssToPdfRect(
  cssLeft: number,
  cssTop: number,
  cssWidth: number,
  cssHeight: number,
  viewport: PageViewport
): PDFRect {
  // Convert the two corner points and take the union
  const [x1, y1] = viewport.convertToPdfPoint(cssLeft, cssTop);
  const [x2, y2] = viewport.convertToPdfPoint(cssLeft + cssWidth, cssTop + cssHeight);

  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

/**
 * Convert a PDF-space rect back to CSS pixel coords for rendering SVG overlays.
 * Call this every time the viewport changes (zoom, window resize, rotation).
 */
export function pdfRectToCss(
  rect: PDFRect & { sourcePageHeight?: number },
  viewport: PageViewport
): CSSRect {
  let effectiveY = rect.y;

  // If source page height is known and different from the current page height,
  // anchor header elements relative to the top of the page rather than the bottom.
  if (rect.sourcePageHeight) {
    const currentH = viewport.viewBox
      ? Math.abs(viewport.viewBox[3] - viewport.viewBox[1])
      : viewport.height / viewport.scale;

    if (Math.abs(rect.sourcePageHeight - currentH) > 1) {
      if (rect.y > rect.sourcePageHeight * 0.4) {
        // Upper half (header zone) -> keep distance from top constant
        const distFromTop = rect.sourcePageHeight - (rect.y + rect.height);
        effectiveY = currentH - distFromTop - rect.height;
      }
    }
  }

  const [x1, y1] = viewport.convertToViewportPoint(rect.x, effectiveY);
  const [x2, y2] = viewport.convertToViewportPoint(
    rect.x + rect.width,
    effectiveY + rect.height
  );

  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

/**
 * Convert a single CSS point to PDF point space.
 */
export function cssToPdfPoint(
  cssX: number,
  cssY: number,
  viewport: PageViewport
): [number, number] {
  return viewport.convertToPdfPoint(cssX, cssY) as [number, number];
}
