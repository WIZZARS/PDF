// ─── Zustand App Store ────────────────────────────────────────────────────────
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Region, Profile, Template } from '@/types';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface AppStore {
  // ── PDF document ──────────────────────────────────────────────────────────
  pdfFile: File | null;
  pdfDoc: PDFDocumentProxy | null;
  totalPages: number;
  currentPage: number;
  zoom: number; // 0.5 – 3.0

  // ── Regions ───────────────────────────────────────────────────────────────
  regions: Region[];
  selectedRegionId: string | null;

  // ── UI state ──────────────────────────────────────────────────────────────
  isExporting: boolean;
  exportProgress: number; // 0–100
  fontWarnings: string[];
  previewMode: boolean;

  // ── Saved data ────────────────────────────────────────────────────────────
  profiles: Profile[];
  templates: Template[];

  // ── Actions ───────────────────────────────────────────────────────────────
  setPDF: (file: File, doc: PDFDocumentProxy) => void;
  clearPDF: () => void;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  setPreviewMode: (val: boolean) => void;

  addRegion: (region: Region) => void;
  updateRegion: (id: string, patch: Partial<Region>) => void;
  removeRegion: (id: string) => void;
  setRegions: (regions: Region[]) => void;
  selectRegion: (id: string | null) => void;

  setExporting: (val: boolean, progress?: number) => void;
  addFontWarning: (msg: string) => void;
  clearFontWarnings: () => void;

  setProfiles: (profiles: Profile[]) => void;
  setTemplates: (templates: Template[]) => void;
}

export const useAppStore = create<AppStore>()(
  devtools(
    (set) => ({
      // ── Initial state ──────────────────────────────────────────────────────
      pdfFile: null,
      pdfDoc: null,
      totalPages: 0,
      currentPage: 1,
      zoom: 1.0,
      regions: [],
      selectedRegionId: null,
      isExporting: false,
      exportProgress: 0,
      fontWarnings: [],
      previewMode: false,
      profiles: [],
      templates: [],

      // ── PDF actions ────────────────────────────────────────────────────────
      setPDF: (file, doc) =>
        set({ pdfFile: file, pdfDoc: doc, totalPages: doc.numPages, currentPage: 1, regions: [] }),

      clearPDF: () =>
        set({ pdfFile: null, pdfDoc: null, totalPages: 0, currentPage: 1, regions: [] }),

      setCurrentPage: (page) => set({ currentPage: page }),
      setZoom: (zoom) => set({ zoom }),

      // ── Region actions ─────────────────────────────────────────────────────
      addRegion: (region) => set((s) => ({ regions: [...s.regions, region] })),

      updateRegion: (id, patch) =>
        set((s) => ({
          regions: s.regions.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      removeRegion: (id) =>
        set((s) => ({
          regions: s.regions.filter((r) => r.id !== id),
          selectedRegionId: s.selectedRegionId === id ? null : s.selectedRegionId,
        })),

      setRegions: (regions) => set({ regions }),
      selectRegion: (id) => set({ selectedRegionId: id }),

      // ── UI actions ─────────────────────────────────────────────────────────
      setExporting: (val, progress = 0) =>
        set({ isExporting: val, exportProgress: progress }),

      setPreviewMode: (previewMode) => set({ previewMode }),

      addFontWarning: (msg) =>
        set((s) => ({
          fontWarnings: s.fontWarnings.includes(msg) ? s.fontWarnings : [...s.fontWarnings, msg],
        })),

      clearFontWarnings: () => set({ fontWarnings: [] }),

      // ── Saved data actions ─────────────────────────────────────────────────
      setProfiles: (profiles) => set({ profiles }),
      setTemplates: (templates) => set({ templates }),
    }),
    { name: 'pdf-personalizer' }
  )
);
