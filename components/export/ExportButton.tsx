"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { applyRegionsToPdf } from "@/lib/pdf/editor";
import { exportBatchPdfs, getRegionsForFile } from "@/lib/export/batchExport";

export default function ExportButton() {
  const {
    pdfFile,
    pdfDoc,
    pdfFiles,
    activePdfId,
    regions,
    isExporting,
    exportProgress,
    exportStatusText,
    setExporting,
    addFontWarning,
  } = useAppStore();

  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMultiPdf = pdfFiles.length > 1;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [dropdownOpen]);

  // Export current active PDF
  const handleExportCurrent = async () => {
    if (!pdfFile || !pdfDoc || regions.length === 0) return;
    setExporting(true, 0, `Processing ${pdfFile.name}…`);
    setDoneMessage(null);
    setDropdownOpen(false);

    try {
      const sourceBytes = await pdfFile.arrayBuffer();
      const fileRegions = getRegionsForFile(regions, activePdfId || "");

      const newBytes = await applyRegionsToPdf(sourceBytes, {
        regions: fileRegions,
        totalPages: pdfDoc.numPages,
        onProgress: (pct) => setExporting(true, pct, `Exporting ${pdfFile.name} (${pct}%)…`),
        onFontWarning: addFontWarning,
      });

      const blob = new Blob([newBytes as unknown as BlobPart], { type: "application/pdf" });
      const baseName = pdfFile.name.replace(/\.pdf$/i, "");
      const fileName = `${baseName}_personalized.pdf`;

      let saved = false;

      // File System Access API
      if ("showSaveFilePicker" in window) {
        try {
          // @ts-expect-error - File System Access API
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: "PDF Document",
                accept: { "application/pdf": [".pdf"] },
              },
            ],
          });
          const writableStream = await fileHandle.createWritable();
          await writableStream.write(blob);
          await writableStream.close();
          saved = true;
        } catch (pickerErr: unknown) {
          if (pickerErr instanceof Error && pickerErr.name === "AbortError") {
            return;
          }
        }
      }

      if (!saved) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 3000);
      }

      setDoneMessage("PDF Saved!");
      setTimeout(() => setDoneMessage(null), 4000);
    } catch (err) {
      console.error("Export current PDF error:", err);
    } finally {
      setExporting(false, 0, "");
    }
  };

  // Export all PDFs as ZIP
  const handleExportBatchZip = async () => {
    if (pdfFiles.length === 0 || regions.length === 0) return;
    setExporting(true, 0, "Initializing batch export…");
    setDoneMessage(null);
    setDropdownOpen(false);

    try {
      await exportBatchPdfs({
        pdfFiles,
        regions,
        fileNaming: "original", // keep original names in the ZIP
        onProgress: (pct, text) => setExporting(true, pct, text),
        onFontWarning: addFontWarning,
      });

      setDoneMessage(`All ${pdfFiles.length} PDFs Saved as ZIP!`);
      setTimeout(() => setDoneMessage(null), 4500);
    } catch (err) {
      console.error("Batch export error:", err);
    } finally {
      setExporting(false, 0, "");
    }
  };

  if (regions.length === 0) {
    return (
      <span
        className="text-xs px-3 py-1.5 rounded-lg"
        style={{ color: "var(--color-text-muted)", background: "var(--color-surface-2)" }}
      >
        Add edits to download
      </span>
    );
  }

  return (
    <div className="relative inline-flex items-center" ref={menuRef}>
      {/* Primary Action Button */}
      <button
        id="export-btn"
        className={`btn btn-primary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all ${
          isMultiPdf ? "rounded-r-none border-r border-white/20" : ""
        }`}
        onClick={isMultiPdf ? handleExportBatchZip : handleExportCurrent}
        disabled={isExporting}
        title={isMultiPdf ? "Download all PDFs bundled into a ZIP file" : "Download edited PDF"}
      >
        {isExporting ? (
          <>
            <div
              className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "white", borderTopColor: "transparent" }}
            />
            <span className="truncate max-w-[150px]">
              {exportStatusText || (exportProgress > 0 ? `${exportProgress}%` : "Preparing…")}
            </span>
          </>
        ) : doneMessage ? (
          <>
            <span>✓</span>
            <span>{doneMessage}</span>
          </>
        ) : isMultiPdf ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <span>Download All as ZIP ({pdfFiles.length})</span>
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download PDF</span>
          </>
        )}
      </button>

      {/* Dropdown Toggle for Batch Options */}
      {isMultiPdf && (
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          disabled={isExporting}
          className="btn btn-primary px-2 py-1.5 text-xs rounded-l-none transition-all flex items-center justify-center"
          title="Export options"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      {/* Export Options Dropdown */}
      {dropdownOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 w-60 rounded-xl shadow-2xl z-50 overflow-hidden fade-in p-1"
          style={{
            background: "var(--color-surface-1)",
            border: "1px solid oklch(1 0 0 / 0.12)",
            boxShadow: "0 12px 36px oklch(0 0 0 / 0.5)",
          }}
        >
          <button
            type="button"
            onClick={handleExportBatchZip}
            className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/5 flex items-center gap-2 text-white font-medium transition-colors"
          >
            <span className="text-sm">📦</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">Download All as ZIP</div>
              <div className="text-[10px] text-gray-400">All {pdfFiles.length} PDFs modified in one ZIP</div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleExportCurrent}
            className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/5 flex items-center gap-2 text-white font-medium transition-colors"
          >
            <span className="text-sm">📄</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">Download Current PDF only</div>
              <div className="text-[10px] text-gray-400 truncate">{pdfFile?.name}</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
