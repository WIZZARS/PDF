"use client";

import { useCallback, useRef, useState } from "react";
import type { PageViewport } from "pdfjs-dist";
import { useAppStore } from "@/store/appStore";
import { cssToPdfRect, pdfRectToCss } from "@/lib/pdf/coordinates";
import { getFontCss } from "@/lib/fonts/fontMatcher";
import { resolvePages } from "@/lib/pdf/editor";
import type { Region } from "@/types";
import { nanoid } from "@/lib/utils";

interface Props {
  viewport: PageViewport;
  canvasWidth: number;
  canvasHeight: number;
  currentPage: number;
}

export default function RegionOverlay({ viewport, canvasWidth, canvasHeight, currentPage }: Props) {
  const {
    regions,
    totalPages,
    addRegion,
    selectRegion,
    selectedRegionId,
    removeRegion,
    previewMode,
  } = useAppStore();
  const overlayRef = useRef<SVGSVGElement>(null);

  // ── Drawing state ──────────────────────────────────────────────────────────
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });

  // Regions targeting this page (either created here or matching pageTarget)
  const pageRegions = regions.filter((r) => {
    if (r.pageNumber === currentPage) return true;
    const targeted = resolvePages(r.rule.pageTarget, totalPages);
    return targeted.includes(currentPage);
  });

  const getRelativePos = (e: React.PointerEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (previewMode) return;
    if ((e.target as SVGElement).closest(".region-handle-el")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = getRelativePos(e);
    setDrawing(true);
    setDrawStart(pos);
    setDrawCurrent(pos);
    selectRegion(null);
  }, [previewMode, selectRegion]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawing || previewMode) return;
    setDrawCurrent(getRelativePos(e));
  }, [drawing, previewMode]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!drawing || previewMode) return;
    setDrawing(false);
    const pos = getRelativePos(e);

    const cssLeft = Math.min(drawStart.x, pos.x);
    const cssTop = Math.min(drawStart.y, pos.y);
    const cssW = Math.abs(pos.x - drawStart.x);
    const cssH = Math.abs(pos.y - drawStart.y);

    if (cssW < 8 || cssH < 8) return; // too small — ignore

    const pdfRect = cssToPdfRect(cssLeft, cssTop, cssW, cssH, viewport);

    const region: Region = {
      id: nanoid(),
      pageNumber: currentPage,
      ...pdfRect,
      source: "manual-draw",
      rule: {
        originalText: "",
        replacementText: "",
        fontFamily: "Helvetica",
        fontSize: 10,
        fontSizeSource: "manual",
        color: "#000000",
        alignment: "left",
        pageTarget: { type: "all" },
      },
    };
    addRegion(region);
    selectRegion(region.id);
  }, [drawing, previewMode, drawStart, viewport, currentPage, addRegion, selectRegion]);

  // Preview rect while drawing
  const previewCssLeft = Math.min(drawStart.x, drawCurrent.x);
  const previewCssTop = Math.min(drawStart.y, drawCurrent.y);
  const previewCssW = Math.abs(drawCurrent.x - drawStart.x);
  const previewCssH = Math.abs(drawCurrent.y - drawStart.y);

  return (
    <svg
      ref={overlayRef}
      id="region-overlay"
      className="absolute inset-0"
      width={canvasWidth}
      height={canvasHeight}
      style={{
        cursor: previewMode ? "default" : "crosshair",
        touchAction: "none",
        pointerEvents: previewMode && pageRegions.length === 0 ? "none" : "auto",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Existing regions */}
      {pageRegions.map((region) => {
        const css = pdfRectToCss(region, viewport);
        const isSelected = region.id === selectedRegionId;
        const fontStyle = getFontCss(region.rule.fontFamily);
        const fontSizePx = (region.rule.fontSize || 10) * viewport.scale;

        // Fallback color from white to black so it remains visible against white paper
        const effectiveColor =
          !region.rule.color || region.rule.color.toLowerCase() === "#ffffff"
            ? "#000000"
            : region.rule.color;

        let textX = css.left + 3;
        let textAnchor: "start" | "middle" | "end" = "start";

        if (region.rule.alignment === "center") {
          textX = css.left + css.width / 2;
          textAnchor = "middle";
        } else if (region.rule.alignment === "right") {
          textX = css.left + css.width - 3;
          textAnchor = "end";
        }

        const textY = css.top + css.height / 2;
        const hasText = Boolean(region.rule.replacementText && region.rule.replacementText.trim().length > 0);

        return (
          <g key={region.id}>
            <defs>
              <clipPath id={`clip-${region.id}`}>
                <rect x={css.left} y={css.top} width={css.width} height={css.height} />
              </clipPath>
            </defs>

            {/* 1. Whiteout Cover: covers original text underneath */}
            <rect
              className={previewMode ? "" : "region-handle-el"}
              x={css.left}
              y={css.top}
              width={css.width}
              height={css.height}
              fill={hasText || previewMode ? "#ffffff" : isSelected ? "oklch(0.55 0.22 260 / 0.15)" : "oklch(0.55 0.22 260 / 0.08)"}
              style={{ cursor: previewMode ? "default" : "pointer" }}
              onClick={(e) => {
                if (previewMode) return;
                e.stopPropagation();
                selectRegion(region.id);
              }}
            />

            {/* 2. Replacement Text: rendered live in place */}
            {hasText ? (
              <g clipPath={`url(#clip-${region.id})`}>
                <text
                  x={textX}
                  y={textY}
                  fontSize={fontSizePx}
                  fill={effectiveColor}
                  fontFamily={fontStyle.fontFamily}
                  fontWeight={fontStyle.fontWeight}
                  textAnchor={textAnchor}
                  dominantBaseline="central"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {region.rule.replacementText}
                </text>
              </g>
            ) : !previewMode ? (
              <text
                x={css.left + 4}
                y={textY}
                fontSize={Math.max(9, Math.min(12, fontSizePx))}
                fill="oklch(0.55 0.22 260)"
                fontStyle="italic"
                dominantBaseline="central"
                style={{ pointerEvents: "none", userSelect: "none", opacity: 0.7 }}
              >
                Enter text in sidebar…
              </text>
            ) : null}

            {/* 3. Editor UI handles (hidden in Preview Mode) */}
            {!previewMode && (
              <>
                {/* Outline stroke */}
                <rect
                  x={css.left}
                  y={css.top}
                  width={css.width}
                  height={css.height}
                  fill="none"
                  stroke={isSelected ? "oklch(0.65 0.18 260)" : "oklch(0.55 0.22 260 / 0.45)"}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray={isSelected ? undefined : "4 3"}
                  rx={2}
                  style={{ pointerEvents: "none" }}
                />

                {/* Selection badge */}
                {isSelected && (
                  <g style={{ pointerEvents: "none" }}>
                    <rect
                      x={css.left}
                      y={css.top - 18}
                      width={hasText ? 82 : 74}
                      height={16}
                      rx={3}
                      fill="oklch(0.55 0.22 260)"
                    />
                    <text
                      x={css.left + 6}
                      y={css.top - 6}
                      fontSize={10}
                      fill="#ffffff"
                      fontWeight="500"
                      style={{ userSelect: "none" }}
                    >
                      {hasText ? "Live Preview" : "Empty Box"}
                    </text>
                  </g>
                )}

                {/* Delete button */}
                {isSelected && (
                  <g
                    className="region-handle-el"
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRegion(region.id);
                    }}
                  >
                    <circle cx={css.left + css.width} cy={css.top} r={9} fill="oklch(0.65 0.22 25)" />
                    <text
                      x={css.left + css.width}
                      y={css.top + 3.5}
                      textAnchor="middle"
                      fontSize={11}
                      fill="white"
                      fontWeight="bold"
                      style={{ pointerEvents: "none" }}
                    >
                      ×
                    </text>
                  </g>
                )}
              </>
            )}
          </g>
        );
      })}

      {/* Drawing preview */}
      {drawing && !previewMode && previewCssW > 4 && previewCssH > 4 && (
        <rect
          x={previewCssLeft}
          y={previewCssTop}
          width={previewCssW}
          height={previewCssH}
          fill="oklch(0.55 0.22 260 / 0.12)"
          stroke="oklch(0.65 0.18 260)"
          strokeWidth={1.5}
          strokeDasharray="5 3"
          rx={2}
          style={{ pointerEvents: "none" }}
        />
      )}
    </svg>
  );
}
