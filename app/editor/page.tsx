"use client";

import dynamic from "next/dynamic";
import { useAppStore } from "@/store/appStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Heavy components loaded client-side only
const PDFViewer = dynamic(() => import("@/components/viewer/PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: "var(--color-brand-500)", borderTopColor: "transparent" }} />
        <p className="text-sm">Loading viewer…</p>
      </div>
    </div>
  ),
});

const RulesPanel = dynamic(() => import("@/components/editor/RulesPanel"), { ssr: false });
const TextSearchPanel = dynamic(() => import("@/components/editor/TextSearchPanel"), { ssr: false });
const ExportButton = dynamic(() => import("@/components/export/ExportButton"), { ssr: false });
const DocumentSelector = dynamic(() => import("@/components/editor/DocumentSelector"), { ssr: false });
const FontWarningBanner = dynamic(() => import("@/components/ui/FontWarningBanner"), { ssr: false });
const BottomSheet = dynamic(() => import("@/components/ui/BottomSheet"), { ssr: false });

export default function EditorPage() {
  const router = useRouter();
  const { pdfDoc, pdfFile, fontWarnings, previewMode, setPreviewMode } = useAppStore();

  // Redirect to home if no PDF loaded (e.g. direct URL access or page refresh)
  useEffect(() => {
    if (!pdfDoc) router.replace("/");
  }, [pdfDoc, router]);

  if (!pdfDoc || !pdfFile) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--color-surface-0)" }}>
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-4 py-2 shrink-0 gap-2"
        style={{
          background: "var(--color-surface-1)",
          borderBottom: "1px solid oklch(1 0 0 / 0.07)",
          height: "3.25rem",
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/")}
            className="btn btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1"
            aria-label="Back to home"
            title="Upload more or new PDFs"
          >
            <span>←</span>
            <span className="hidden sm:inline">Add PDFs</span>
          </button>
          <DocumentSelector />
        </div>

        {/* ── Mode Toggle: Edit vs Preview ─────────────────────────────────── */}
        <div
          className="flex items-center p-0.5 rounded-lg"
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid oklch(1 0 0 / 0.08)",
          }}
        >
          <button
            id="mode-edit-btn"
            onClick={() => setPreviewMode(false)}
            className="px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
            style={{
              background: !previewMode ? "var(--color-brand-600)" : "transparent",
              color: !previewMode ? "white" : "var(--color-text-secondary)",
              boxShadow: !previewMode ? "0 1px 3px oklch(0 0 0 / 0.3)" : "none",
            }}
          >
            <span>✏️</span>
            <span>Edit Mode</span>
          </button>
          <button
            id="mode-preview-btn"
            onClick={() => setPreviewMode(true)}
            className="px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
            style={{
              background: previewMode ? "var(--color-brand-600)" : "transparent",
              color: previewMode ? "white" : "var(--color-text-secondary)",
              boxShadow: previewMode ? "0 1px 3px oklch(0 0 0 / 0.3)" : "none",
            }}
          >
            <span>👁️</span>
            <span>Preview Changes</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton />
        </div>
      </header>

      {/* ── Font warning banner (full width below header) ──────────────────── */}
      {fontWarnings.length > 0 && <FontWarningBanner />}

      {/* ── Text layer notice / preview status banner ──────────────────────── */}
      <div
        className="px-4 py-1 text-xs text-center shrink-0 flex items-center justify-center gap-2"
        style={{
          background: previewMode
            ? "oklch(0.60 0.18 140 / 0.1)"
            : "oklch(0.65 0.18 60 / 0.08)",
          borderBottom: previewMode
            ? "1px solid oklch(0.60 0.18 140 / 0.25)"
            : "1px solid oklch(0.65 0.18 60 / 0.2)",
          color: previewMode
            ? "oklch(0.85 0.16 140)"
            : "oklch(0.80 0.18 60)",
        }}
      >
        {previewMode ? (
          <span>
            ✓ <strong>Preview Mode:</strong> Changes are displayed exactly as they will look in the downloaded PDF.
          </span>
        ) : (
          <span>
            ⚡ <strong>Live Preview Active:</strong> Text changes are rendered directly in the PDF below.
          </span>
        )}
      </div>

      {/* ── Main 3-panel layout ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: search + rules — hidden on mobile */}
        <aside
          className="hidden lg:flex flex-col w-72 shrink-0 overflow-y-auto panel"
          style={{ gap: 0 }}
        >
          <TextSearchPanel />
          <div style={{ height: "1px", background: "oklch(1 0 0 / 0.06)" }} />
          <RulesPanel />
        </aside>

        {/* Centre: PDF viewer */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <PDFViewer />
        </main>
      </div>

      {/* ── Mobile bottom sheet (< lg) ────────────────────────────────────── */}
      <BottomSheet />
    </div>
  );
}
