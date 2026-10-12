"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PDFPageProxy, PageViewport, RenderTask } from "pdfjs-dist";
import { useAppStore } from "@/store/appStore";
import PageNavigator from "./PageNavigator";
import RegionOverlay from "./RegionOverlay";

export default function PDFViewer() {
  const { pdfDoc, currentPage, zoom, setZoom, previewMode, setPreviewMode } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<PageViewport | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const activeRenderTaskRef = useRef<RenderTask | null>(null);
  const renderGenRef = useRef(0);

  useEffect(() => {
    let isCancelled = false;
    const currentGen = ++renderGenRef.current;

    const render = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      // 1. Cancel and await any active render task before starting
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
          await activeRenderTaskRef.current.promise;
        } catch {
          // RenderingCancelledException is expected
        }
        activeRenderTaskRef.current = null;
      }

      // Check if this run was superseded or unmounted while awaiting cancellation
      if (isCancelled || currentGen !== renderGenRef.current) return;

      try {
        const page: PDFPageProxy = await pdfDoc.getPage(currentPage);

        // Check if superseded during async page load
        if (isCancelled || currentGen !== renderGenRef.current) return;
        if (!canvasRef.current) return;

        // In case another task started in the interim, cancel and await it
        const interimTask = activeRenderTaskRef.current as RenderTask | null;
        if (interimTask) {
          try {
            interimTask.cancel();
            await interimTask.promise;
          } catch {
            // Expected
          }
          activeRenderTaskRef.current = null;
        }

        if (isCancelled || currentGen !== renderGenRef.current) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2 for iOS memory
        const vp = page.getViewport({ scale: zoom * dpr });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Physical pixels
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        // CSS size (logical pixels)
        canvas.style.width = `${Math.floor(vp.width / dpr)}px`;
        canvas.style.height = `${Math.floor(vp.height / dpr)}px`;

        setCanvasSize({
          w: Math.floor(vp.width / dpr),
          h: Math.floor(vp.height / dpr),
        });

        // Viewport at CSS scale (without dpr) for coordinate conversions
        const cssViewport = page.getViewport({ scale: zoom });
        setViewport(cssViewport);

        const task = page.render({ canvas, canvasContext: ctx, viewport: vp });
        activeRenderTaskRef.current = task;

        await task.promise;
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          err.name !== "RenderingCancelledException"
        ) {
          console.error("Render error:", err);
        }
      } finally {
        if (currentGen === renderGenRef.current) {
          activeRenderTaskRef.current = null;
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch {
          // Ignore
        }
      }
    };
  }, [pdfDoc, currentPage, zoom]);

  // Scroll the viewer to top on page change
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto flex flex-col items-center"
      style={{
        background: "var(--color-surface-0)",
        padding: "1.25rem",
        gap: "1rem",
      }}
    >
      {/* Page Navigator */}
      <PageNavigator />

      {/* Canvas + Region Overlay wrapper */}
      <div
        className="relative select-none rounded-lg shadow-2xl"
        style={{
          width: canvasSize.w,
          height: canvasSize.h,
          boxShadow: "0 8px 40px oklch(0 0 0 / 0.6)",
        }}
      >
        <canvas
          ref={canvasRef}
          id="pdf-canvas"
          aria-label={`Page ${currentPage} of PDF`}
          className="block rounded-lg"
        />
        {viewport && (
          <RegionOverlay
            viewport={viewport}
            canvasWidth={canvasSize.w}
            canvasHeight={canvasSize.h}
            currentPage={currentPage}
          />
        )}
      </div>

      {/* Zoom control & quick preview toggle */}
      <div className="flex items-center gap-3 pb-4">
        <button
          id="viewer-toggle-preview-btn"
          className="btn btn-ghost text-xs px-2.5 py-1 flex items-center gap-1.5"
          onClick={() => setPreviewMode(!previewMode)}
          style={{
            background: previewMode ? "oklch(0.60 0.18 140 / 0.15)" : undefined,
            color: previewMode ? "oklch(0.85 0.16 140)" : undefined,
            borderColor: previewMode ? "oklch(0.60 0.18 140 / 0.3)" : undefined,
          }}
        >
          <span>{previewMode ? "✏️ Switch to Edit" : "👁️ Full Preview"}</span>
        </button>
        <div style={{ width: "1px", height: "16px", background: "oklch(1 0 0 / 0.12)" }} />
        <button className="btn btn-ghost text-xs px-2 py-1" onClick={() => setZoom(Math.max(0.4, zoom - 0.1))}>−</button>
        <span className="text-xs tabular-nums" style={{ color: "var(--color-text-secondary)", minWidth: "3rem", textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button className="btn btn-ghost text-xs px-2 py-1" onClick={() => setZoom(Math.min(3, zoom + 0.1))}>+</button>
        <button className="btn btn-ghost text-xs px-2 py-1" onClick={() => setZoom(1.0)}>Reset</button>
      </div>
    </div>
  );
}
