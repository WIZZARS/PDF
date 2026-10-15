// ─── Zustand App Store ────────────────────────────────────────────────────────
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Region, Profile, Template, PDFItem } from '@/types';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { nanoid } from '@/lib/utils';

interface AppStore {
  // ── Multi-PDF documents ───────────────────────────────────────────────────
  pdfFiles: PDFItem[];
  activePdfId: string | null;

  // ── Active PDF document (synced with activePdfId) ─────────────────────────
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
  exportStatusText: string;
  fontWarnings: string[];
  previewMode: boolean;

  // ── Saved data ────────────────────────────────────────────────────────────
  profiles: Profile[];
  templates: Template[];

  // ── PDF Actions ───────────────────────────────────────────────────────────
  setPDF: (file: File, doc: PDFDocumentProxy) => void;
  setPDFs: (items: PDFItem[], activeId?: string) => void;
  addPDFs: (items: PDFItem[]) => void;
  removePDF: (id: string) => void;
  setActivePDF: (id: string) => void;
  clearPDF: () => void;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  setPreviewMode: (val: boolean) => void;

  // ── Region Actions ────────────────────────────────────────────────────────
  addRegion: (region: Region) => void;
  updateRegion: (id: string, patch: Partial<Region>) => void;
  removeRegion: (id: string) => void;
  setRegions: (regions: Region[]) => void;
  selectRegion: (id: string | null) => void;

  // ── UI Actions ────────────────────────────────────────────────────────────
  setExporting: (val: boolean, progress?: number, statusText?: string) => void;
  addFontWarning: (msg: string) => void;
  clearFontWarnings: () => void;

  // ── Saved Data Actions ────────────────────────────────────────────────────
  setProfiles: (profiles: Profile[]) => void;
  setTemplates: (templates: Template[]) => void;
}

export const useAppStore = create<AppStore>()(
  devtools(
    (set) => ({
      // ── Initial state ──────────────────────────────────────────────────────
      pdfFiles: [],
      activePdfId: null,
      pdfFile: null,
      pdfDoc: null,
      totalPages: 0,
      currentPage: 1,
      zoom: 1.0,
      regions: [],
      selectedRegionId: null,
      isExporting: false,
      exportProgress: 0,
      exportStatusText: '',
      fontWarnings: [],
      previewMode: false,
      profiles: [],
      templates: [],

      // ── PDF actions ────────────────────────────────────────────────────────
      setPDF: (file, doc) => {
        const item: PDFItem = {
          id: nanoid(),
          file,
          name: file.name,
          doc,
          totalPages: doc.numPages,
          size: file.size,
        };
        set({
          pdfFiles: [item],
          activePdfId: item.id,
          pdfFile: file,
          pdfDoc: doc,
          totalPages: doc.numPages,
          currentPage: 1,
          regions: [],
        });
      },

      setPDFs: (items, activeId) => {
        const activeItem = items.find((i) => i.id === activeId) ?? items[0] ?? null;
        set({
          pdfFiles: items,
          activePdfId: activeItem ? activeItem.id : null,
          pdfFile: activeItem ? activeItem.file : null,
          pdfDoc: activeItem ? activeItem.doc : null,
          totalPages: activeItem ? activeItem.totalPages : 0,
          currentPage: 1,
          regions: [],
        });
      },

      addPDFs: (newItems) =>
        set((s) => {
          const merged = [...s.pdfFiles, ...newItems];
          if (!s.activePdfId && merged.length > 0) {
            const first = merged[0];
            return {
              pdfFiles: merged,
              activePdfId: first.id,
              pdfFile: first.file,
              pdfDoc: first.doc,
              totalPages: first.totalPages,
              currentPage: 1,
            };
          }
          return { pdfFiles: merged };
        }),

      setActivePDF: (id) =>
        set((s) => {
          const found = s.pdfFiles.find((i) => i.id === id);
          if (!found) return s;
          return {
            activePdfId: id,
            pdfFile: found.file,
            pdfDoc: found.doc,
            totalPages: found.totalPages,
            currentPage: 1,
            selectedRegionId: null,
          };
        }),

      removePDF: (id) =>
        set((s) => {
          const nextList = s.pdfFiles.filter((i) => i.id !== id);
          if (nextList.length === 0) {
            return {
              pdfFiles: [],
              activePdfId: null,
              pdfFile: null,
              pdfDoc: null,
              totalPages: 0,
              currentPage: 1,
              regions: [],
            };
          }
          if (s.activePdfId === id) {
            const nextActive = nextList[0];
            return {
              pdfFiles: nextList,
              activePdfId: nextActive.id,
              pdfFile: nextActive.file,
              pdfDoc: nextActive.doc,
              totalPages: nextActive.totalPages,
              currentPage: 1,
              selectedRegionId: null,
            };
          }
          return { pdfFiles: nextList };
        }),

      clearPDF: () =>
        set({
          pdfFiles: [],
          activePdfId: null,
          pdfFile: null,
          pdfDoc: null,
          totalPages: 0,
          currentPage: 1,
          regions: [],
        }),

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
      setExporting: (val, progress = 0, statusText = '') =>
        set({ isExporting: val, exportProgress: progress, exportStatusText: statusText }),

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
