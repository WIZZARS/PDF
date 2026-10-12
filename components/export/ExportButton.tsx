"use client";

import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { applyRegionsToPdf } from "@/lib/pdf/editor";

export default function ExportButton() {
  const { pdfFile, pdfDoc, regions, isExporting, exportProgress, setExporting, addFontWarning } = useAppStore();
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    if (!pdfFile || !pdfDoc || regions.length === 0) return;
    setExporting(true, 0);
    setDone(false);

    try {
      const sourceBytes = await pdfFile.arrayBuffer();

      const newBytes = await applyRegionsToPdf(sourceBytes, {
        regions,
        totalPages: pdfDoc.numPages,
        onProgress: (pct) => setExporting(true, pct),
        onFontWarning: addFontWarning,
      });

      const blob = new Blob([newBytes], { type: "application/pdf" });
      const baseName = pdfFile.name.replace(/\.pdf$/i, "");
      const fileName = `${baseName}_personalized.pdf`;

      let saved = false;

      // 1. On desktop (Chrome/Edge/Opera), use File System Access API
      // Opens the native Windows "Save As" dialog so the user can select Desktop directly
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
            // User cancelled the file save dialog
            return;
          }
          // Fall back to direct anchor download if file picker fails
        }
      }

      // 2. Direct browser download directly to computer (No share popup!)
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

      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false, 0);
    }
  };

  if (regions.length === 0) {
    return (
      <span className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "var(--color-text-muted)", background: "var(--color-surface-2)" }}>
        Add regions to download
      </span>
    );
  }

  return (
    <button
      id="export-btn"
      className="btn btn-primary px-4 text-sm font-medium flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
      onClick={handleExport}
      disabled={isExporting}
      title="Save PDF directly to Desktop"
    >
      {isExporting ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "white", borderTopColor: "transparent" }} />
          <span>{exportProgress > 0 ? `${exportProgress}%` : "Preparing…"}</span>
        </>
      ) : done ? (
        <>
          <span>✓</span>
          <span>Saved to Desktop!</span>
        </>
      ) : (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Download PDF ({regions.length})</span>
        </>
      )}
    </button>
  );
}
