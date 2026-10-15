"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import { nanoid, formatBytes } from "@/lib/utils";
import type { PDFItem } from "@/types";

export default function DocumentSelector() {
  const { pdfFiles, activePdfId, setActivePDF, removePDF, addPDFs } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeItem = pdfFiles.find((p) => p.id === activePdfId) ?? pdfFiles[0];
  const activeIndex = pdfFiles.findIndex((p) => p.id === activePdfId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const handleAddFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsAdding(true);

      try {
        const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
        GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const newItems: PDFItem[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) continue;

          const bytes = await file.arrayBuffer();
          const doc = await getDocument({ data: bytes }).promise;

          newItems.push({
            id: nanoid(),
            file,
            name: file.name,
            doc,
            totalPages: doc.numPages,
            size: file.size,
          });
        }

        if (newItems.length > 0) {
          addPDFs(newItems);
        }
      } catch (err) {
        console.error("Error adding PDF files:", err);
      } finally {
        setIsAdding(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [addPDFs]
  );

  if (!activeItem) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        id="document-selector-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group"
        style={{
          background: isOpen ? "var(--color-surface-3)" : "var(--color-surface-2)",
          border: `1px solid ${isOpen ? "var(--color-brand-500)" : "oklch(1 0 0 / 0.1)"}`,
          color: "var(--color-text-primary)",
        }}
        title="Switch active document or add more PDFs"
      >
        <span className="text-sm">📄</span>
        <span className="truncate max-w-[140px] sm:max-w-[200px] text-left">
          {activeItem.name}
        </span>

        {pdfFiles.length > 1 && (
          <span
            className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold"
            style={{
              background: "oklch(0.55 0.22 260 / 0.25)",
              color: "var(--color-brand-400)",
            }}
          >
            {activeIndex + 1}/{pdfFiles.length}
          </span>
        )}

        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform opacity-70 group-hover:opacity-100 ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Hidden File Input for Adding PDFs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => handleAddFiles(e.target.files)}
      />

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1.5 w-80 max-w-[90vw] rounded-xl shadow-2xl z-50 overflow-hidden fade-in"
          style={{
            background: "var(--color-surface-1)",
            border: "1px solid oklch(1 0 0 / 0.12)",
            boxShadow: "0 12px 36px oklch(0 0 0 / 0.5)",
          }}
        >
          {/* Header */}
          <div
            className="px-3.5 py-2.5 flex items-center justify-between border-b"
            style={{
              background: "var(--color-surface-2)",
              borderColor: "oklch(1 0 0 / 0.08)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                Batch Documents ({pdfFiles.length})
              </span>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAdding}
              className="text-[11px] font-medium text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
              style={{ color: "var(--color-brand-400)" }}
            >
              <span>+ Add PDF</span>
            </button>
          </div>

          {/* List of PDFs */}
          <div className="max-h-64 overflow-y-auto p-1.5 flex flex-col gap-1">
            {pdfFiles.map((item, idx) => {
              const isCurrent = item.id === activePdfId;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all group ${
                    isCurrent ? "font-medium" : "cursor-pointer hover:bg-white/5"
                  }`}
                  style={{
                    background: isCurrent ? "var(--color-brand-700)" : "transparent",
                    color: isCurrent ? "white" : "var(--color-text-primary)",
                  }}
                  onClick={() => {
                    setActivePDF(item.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <span className="opacity-70">{idx + 1}.</span>
                    <span className="truncate" title={item.name}>
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[10px]"
                      style={{ color: isCurrent ? "white" : "var(--color-text-muted)" }}
                    >
                      {item.totalPages}p · {formatBytes(item.size)}
                    </span>

                    {/* Delete button (only if > 1 PDF) */}
                    {pdfFiles.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePDF(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded transition-opacity"
                        title="Remove from batch"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Note */}
          <div
            className="p-2.5 text-[11px] text-center border-t"
            style={{
              background: "var(--color-surface-2)",
              borderColor: "oklch(1 0 0 / 0.08)",
              color: "var(--color-text-muted)",
            }}
          >
            💡 Edits marked <strong className="text-brand-400">All PDFs</strong> apply automatically to every document!
          </div>
        </div>
      )}
    </div>
  );
}
