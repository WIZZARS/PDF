// ─── Core Types — PDF Personalizer ────────────────────────────────────────────
// Regions are stored exclusively in PDF coordinate space (points, origin at
// bottom-left of the CropBox). Display positions are computed at render time.

export type StandardFont =
  | 'Helvetica'
  | 'Helvetica-Bold'
  | 'Times-Roman'
  | 'Times-Bold'
  | 'Courier'
  | 'Courier-Bold';

export type PageTarget =
  | { type: 'all' }
  | { type: 'odd' }
  | { type: 'even' }
  | { type: 'range'; from: number; to: number }
  | { type: 'specific'; pages: number[] };

export interface Rule {
  originalText: string;       // text the user typed to find
  replacementText: string;    // what replaces it
  fontFamily: StandardFont | 'custom';
  fontSize: number;           // points
  fontSizeSource: 'detected' | 'manual';
  color: string;              // hex e.g. '#1a1a1a'
  alignment: 'left' | 'center' | 'right';
  pageTarget: PageTarget;
  /** Set when the detected font is a subset and we fell back to a standard one */
  fontWarning?: string;
}

export interface Region {
  id: string;
  pageNumber: number;         // 1-indexed PDF page

  // PDF-space rectangle (points). Origin: bottom-left of CropBox.
  // Populated via viewport.convertToPdfPoint — never store canvas px here.
  x: number;
  y: number;
  width: number;
  height: number;

  rule: Rule;
  /** How this region was created */
  source: 'text-match' | 'manual-draw';
}

export interface Profile {
  id: string;
  label: string;       // e.g. "My Details"
  name: string;
  rollNumber: string;
  batch: string;
  department: string;
  createdAt: string;   // ISO 8601
}

export interface Template {
  id: string;
  label: string;       // e.g. "CS Lab Manual"
  /** Region positions saved without rule text — reusable layout only */
  regions: Omit<Region, 'rule'>[];
  createdAt: string;   // ISO 8601
}

/** Shape of the JSON file produced by data-export */
export interface BackupFile {
  version: 1;
  exportedAt: string;
  profiles: Profile[];
  templates: Template[];
}

/** Text item returned by pdfjs getTextContent(), enriched with page info */
export interface TextItem {
  str: string;
  fontName: string;
  fontSize: number;
  /** PDF-space bounding box [x, y, width, height] */
  bbox: [number, number, number, number];
  pageNumber: number;
}

/** A contiguous run of matched text items forming one hit */
export interface TextMatch {
  pageNumber: number;
  items: TextItem[];
  /** Union bounding box of all items in this match */
  bbox: [number, number, number, number];
  fontName: string;
  fontSize: number;
}
