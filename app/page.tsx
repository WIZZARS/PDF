"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { nanoid } from "@/lib/utils";
import type { PDFItem } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const { setPDFs } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [uploadFileName, setUploadFileName] = useState<string>("");
  const [uploadProgressPct, setUploadProgressPct] = useState<number>(0);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setError(null);
      const rawFiles = Array.from(fileList);
      const pdfFiles = rawFiles.filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
      );

      if (pdfFiles.length === 0) {
        setError("Please upload one or more valid PDF files.");
        return;
      }

      for (const f of pdfFiles) {
        if (f.size > 80 * 1024 * 1024) {
          setError(`File "${f.name}" is too large (max 80 MB per file).`);
          return;
        }
      }

      setIsUploading(true);
      setUploadFileName(
        pdfFiles.length === 1 ? pdfFiles[0].name : `${pdfFiles.length} PDF files`
      );
      setUploadStatus("Initializing PDF engine…");
      setUploadProgressPct(5);

      try {
        // Dynamically import pdfjs only in the browser
        const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
        GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        // Request persistent storage
        if (navigator.storage?.persist) {
          await navigator.storage.persist();
        }

        const items: PDFItem[] = [];

        for (let i = 0; i < pdfFiles.length; i++) {
          const file = pdfFiles[i];
          const pct = Math.round(((i + 1) / pdfFiles.length) * 90);
          setUploadProgressPct(pct);
          setUploadFileName(file.name);
          setUploadStatus(
            pdfFiles.length > 1
              ? `Parsing PDF ${i + 1} of ${pdfFiles.length}: ${file.name}…`
              : "Parsing PDF pages & fonts…"
          );

          const bytes = await file.arrayBuffer();
          const doc = await getDocument({ data: bytes }).promise;

          items.push({
            id: nanoid(),
            file,
            name: file.name,
            doc,
            totalPages: doc.numPages,
            size: file.size,
          });
        }

        setUploadProgressPct(100);
        setUploadStatus("Opening editor…");
        setPDFs(items);
        router.push("/editor");
      } catch (err: unknown) {
        setIsUploading(false);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("password")) {
          setError("One of the PDFs is password-protected. Please remove the password first.");
        } else {
          setError(`Could not open PDF: ${msg}`);
        }
      }
    },
    [setPDFs, router]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) handleFiles(files);
    },
    [handleFiles]
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 30% 40%, oklch(0.55 0.22 260 / 0.12) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 70% 60%, oklch(0.60 0.20 300 / 0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-xl fade-in">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center glow-pulse"
              style={{ background: "var(--color-brand-600)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="8" y1="13" x2="16" y2="13"/>
                <line x1="8" y1="17" x2="12" y2="17"/>
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight gradient-text">
              PDF Personalizer
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Batch personalize lab reports &amp; manuals — edit one page, apply to all pages &amp; all PDFs
          </p>
        </div>

        {/* Drop zone */}
        <div
          id="drop-zone"
          role="button"
          tabIndex={0}
          aria-label={isUploading ? "Uploading PDF" : "Upload PDF files"}
          onDragOver={(e) => {
            if (isUploading) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            if (isUploading) return;
            onDrop(e);
          }}
          onClick={() => {
            if (!isUploading) inputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (!isUploading && e.key === "Enter") inputRef.current?.click();
          }}
          className={`glass rounded-2xl p-10 text-center transition-all duration-200 select-none ${
            isUploading ? "cursor-wait" : "cursor-pointer"
          } ${dragging ? "drop-active" : ""}`}
          style={{
            border: isUploading ? "2px solid var(--color-brand-500)" : "2px dashed oklch(1 0 0 / 0.12)",
          }}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-4 py-2 fade-in">
              {/* Spinner icon */}
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-2xl animate-spin"
                  style={{
                    border: "3px solid transparent",
                    borderTopColor: "var(--color-brand-400)",
                    borderRightColor: "var(--color-brand-600)",
                  }}
                />
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center glow-pulse"
                  style={{ background: "var(--color-brand-700)" }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                </div>
              </div>

              <div>
                <p className="text-base font-semibold mb-1 truncate max-w-sm" style={{ color: "var(--color-text-primary)" }}>
                  Processing PDF Document{uploadFileName.includes("files") ? "s" : ""}…
                </p>
                <p className="text-xs font-mono truncate max-w-xs mx-auto mb-2" style={{ color: "var(--color-brand-400)" }}>
                  {uploadFileName}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <p className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                    {uploadStatus}
                  </p>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full max-w-xs h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-3)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    background: "linear-gradient(90deg, var(--color-brand-500), #8b5cf6, var(--color-brand-400))",
                    width: `${Math.max(10, uploadProgressPct)}%`,
                  }}
                />
              </div>

              <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                Parsing completely in your browser. Preparing editor…
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-200"
                style={{
                  background: dragging
                    ? "var(--color-brand-600)"
                    : "var(--color-surface-3)",
                  transform: dragging ? "scale(1.08)" : "scale(1)",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: dragging ? "white" : "var(--color-text-secondary)" }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>

              <div>
                <p className="text-base font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                  {dragging ? "Drop your PDF files here!" : "Drop your PDF file(s) here"}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Upload one or numerous PDFs · up to 80 MB each
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-primary px-6 py-2 text-sm rounded-lg shadow-md hover:shadow-lg transition-all"
                  onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                >
                  Choose PDF(s)
                </button>
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf"
            className="hidden"
            disabled={isUploading}
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) handleFiles(files);
              e.target.value = "";
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div
            className="mt-4 p-3 rounded-lg text-sm fade-in"
            style={{
              background: "oklch(0.65 0.22 25 / 0.15)",
              border: "1px solid oklch(0.65 0.22 25 / 0.4)",
              color: "var(--color-danger)",
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Privacy note */}
        <p className="mt-6 text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
          🔒 Your files stay private on your device. Everything runs in your browser.
        </p>

        {/* Feature pills */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {[
            "Batch Multiple PDFs",
            "Apply Region to All PDFs",
            "All Pages at Once",
            "Export as ZIP Archive",
            "100% Client-Side",
          ].map((f) => (
            <span
              key={f}
              className="text-xs px-3 py-1 rounded-full font-medium"
              style={{
                background: "var(--color-surface-2)",
                color: "var(--color-text-secondary)",
                border: "1px solid oklch(1 0 0 / 0.08)",
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
