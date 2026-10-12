"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useAppStore } from "@/store/appStore";

export default function HomePage() {
  const router = useRouter();
  const { setPDF } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [uploadFileName, setUploadFileName] = useState<string>("");

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
        setError("Please upload a PDF file.");
        return;
      }
      if (file.size > 60 * 1024 * 1024) {
        setError("File is too large (max 60 MB).");
        return;
      }

      setIsUploading(true);
      setUploadFileName(file.name);
      setUploadStatus("Reading file…");

      try {
        setUploadStatus("Initializing PDF engine…");
        // Dynamically import pdfjs only in the browser
        const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
        GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        setUploadStatus("Loading document bytes…");
        const bytes = await file.arrayBuffer();

        setUploadStatus("Parsing PDF pages & fonts…");
        const doc = await getDocument({ data: bytes }).promise;

        // Request persistent storage (Safari may evict otherwise)
        if (navigator.storage?.persist) {
          await navigator.storage.persist();
        }

        setUploadStatus("Opening editor…");
        setPDF(file, doc);
        router.push("/editor");
      } catch (err: unknown) {
        setIsUploading(false);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("password")) {
          setError("This PDF is password-protected. Please remove the password first.");
        } else {
          setError(`Could not open PDF: ${msg}`);
        }
      }
    },
    [setPDF, router]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
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
            Add your name &amp; roll number to lab record templates — in under a minute
          </p>
        </div>

        {/* Drop zone */}
        <div
          id="drop-zone"
          role="button"
          tabIndex={0}
          aria-label={isUploading ? "Uploading PDF" : "Upload PDF file"}
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
                  Uploading &amp; Processing PDF…
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
                    width: "100%",
                    animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                  }}
                />
              </div>

              <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                Processing document in your browser. Preparing editor…
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
                <p className="text-base font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
                  {dragging ? "Drop it here!" : "Drop your PDF here"}
                </p>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  or click to browse · up to 60 MB
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary px-6 py-2 text-sm rounded-lg"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              >
                Choose PDF
              </button>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            disabled={isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
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
          🔒 Your files stay on your device. Nothing is uploaded.
        </p>

        {/* Feature pills */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {["No sign-up", "Works offline", "All pages at once", "Saves your profile"].map((f) => (
            <span
              key={f}
              className="text-xs px-3 py-1 rounded-full"
              style={{
                background: "var(--color-surface-2)",
                color: "var(--color-text-secondary)",
                border: "1px solid oklch(1 0 0 / 0.07)",
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
