"use client";

import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import type { Region, StandardFont, PageTarget } from "@/types";

const FONTS: StandardFont[] = [
  "Helvetica", "Helvetica-Bold", "Times-Roman", "Times-Bold", "Courier", "Courier-Bold",
];

export default function RulesPanel() {
  const { regions, selectedRegionId, updateRegion, removeRegion, selectRegion, pdfFiles, activePdfId } = useAppStore();
  const [saved, setSaved] = useState(false);

  const selectedRegion = regions.find((r) => r.id === selectedRegionId);
  const pageRegions = regions;

  const update = (patch: Partial<Region["rule"]>) => {
    if (!selectedRegionId) return;
    const region = regions.find((r) => r.id === selectedRegionId);
    if (!region) return;
    updateRegion(selectedRegionId, { rule: { ...region.rule, ...patch } });
  };

  const handleSave = () => {
    if (!selectedRegion) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex flex-col gap-0 overflow-y-auto flex-1">
      {/* Region list */}
      <div className="p-4 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
          Regions ({regions.length})
        </h2>

        {regions.length === 0 && (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Use "Find &amp; Replace" above or draw a box on the page.
          </p>
        )}

        <div className="flex flex-col gap-1">
          {pageRegions.map((r, i) => (
            <button
              key={r.id}
              id={`region-btn-${r.id}`}
              onClick={() => selectRegion(r.id)}
              className="w-full text-left rounded-lg px-3 py-2 text-xs transition-all"
              style={{
                background: r.id === selectedRegionId ? "var(--color-brand-700)" : "var(--color-surface-2)",
                border: `1px solid ${r.id === selectedRegionId ? "var(--color-brand-500)" : "oklch(1 0 0 / 0.07)"}`,
                color: "var(--color-text-primary)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Region {i + 1} · p{r.pageNumber}</span>
                <div className="flex items-center gap-1.5">
                  {r.fileTarget === "all" || !r.fileTarget ? (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{
                        background: "oklch(0.55 0.22 260 / 0.2)",
                        color: "var(--color-brand-400)",
                        border: "1px solid oklch(0.55 0.22 260 / 0.3)",
                      }}
                    >
                      All PDFs
                    </span>
                  ) : (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{
                        background: "var(--color-surface-3)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      1 PDF
                    </span>
                  )}
                  <span style={{ color: "var(--color-text-muted)" }}>
                    {r.source === "text-match" ? "🔍" : "✏️"}
                  </span>
                </div>
              </div>
              <div className="truncate mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                {r.rule.replacementText || <em>no text set</em>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Rule editor for selected region */}
      {selectedRegion && (
        <div
          className="p-4 flex flex-col gap-3 fade-in"
          style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)" }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            Edit Region
          </h3>

          {/* Replacement text */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--color-text-secondary)" }}>Replacement text</label>
            <input
              id="replacement-text-input"
              className="input"
              value={selectedRegion.rule.replacementText}
              onChange={(e) => update({ replacementText: e.target.value })}
              placeholder="Your name, roll number…"
            />
          </div>

          {/* Font + size row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--color-text-secondary)" }}>Font</label>
              <select
                id="font-select"
                className="input"
                value={selectedRegion.rule.fontFamily}
                onChange={(e) => update({ fontFamily: e.target.value as StandardFont, fontSizeSource: "manual" })}
              >
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--color-text-secondary)" }}>
                Size {selectedRegion.rule.fontSizeSource === "detected" && <span style={{ color: "var(--color-brand-400)" }}>(auto)</span>}
              </label>
              <input
                id="font-size-input"
                type="number"
                min={6}
                max={72}
                className="input"
                value={selectedRegion.rule.fontSize}
                onChange={(e) => update({ fontSize: parseFloat(e.target.value) || 10, fontSizeSource: "manual" })}
              />
            </div>
          </div>

          {/* Colour + alignment row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Color</label>
                {selectedRegion.rule.color.toLowerCase() === "#ffffff" && (
                  <button
                    type="button"
                    onClick={() => update({ color: "#000000" })}
                    className="text-[10px] text-amber-400 hover:underline"
                    title="Change white text to black so it is visible against white pages"
                  >
                    Set to Black
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="color-input"
                  type="color"
                  value={selectedRegion.rule.color}
                  onChange={(e) => update({ color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer shrink-0"
                  style={{ border: "1px solid oklch(1 0 0 / 0.1)", background: "none" }}
                />
                <input
                  className="input flex-1"
                  value={selectedRegion.rule.color}
                  onChange={(e) => update({ color: e.target.value })}
                  placeholder="#000000"
                />
              </div>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--color-text-secondary)" }}>Alignment</label>
              <div className="flex gap-1">
                {(["left", "center", "right"] as const).map((a) => (
                  <button
                    key={a}
                    id={`align-${a}`}
                    className="btn flex-1 text-xs py-1"
                    style={{
                      background: selectedRegion.rule.alignment === a ? "var(--color-brand-600)" : "var(--color-surface-2)",
                      color: selectedRegion.rule.alignment === a ? "white" : "var(--color-text-secondary)",
                      border: "1px solid oklch(1 0 0 / 0.08)",
                    }}
                    onClick={() => update({ alignment: a })}
                  >
                    {a === "left" ? "≤" : a === "center" ? "≡" : "≥"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Multi-document Target */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Apply to documents
              </label>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono" style={{ color: "var(--color-brand-400)", background: "oklch(0.55 0.22 260 / 0.15)" }}>
                {selectedRegion.fileTarget === "all" || !selectedRegion.fileTarget ? "All PDFs" : "Single PDF"}
              </span>
            </div>
            <select
              id="file-target-rule-select"
              className="input text-xs"
              value={selectedRegion.fileTarget || "all"}
              onChange={(e) => updateRegion(selectedRegion.id, { fileTarget: e.target.value })}
            >
              <option value="all">
                🌐 All uploaded PDFs ({pdfFiles.length > 0 ? pdfFiles.length : 1} file{pdfFiles.length === 1 ? "" : "s"})
              </option>
              {activePdfId && (
                <option value={activePdfId}>
                  📄 This PDF only ({pdfFiles.find((p) => p.id === activePdfId)?.name || "Active PDF"})
                </option>
              )}
            </select>
          </div>

          {/* Page target */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--color-text-secondary)" }}>
              Apply to pages
            </label>
            <select
              id="page-target-rule-select"
              className="input text-xs"
              value={selectedRegion.rule.pageTarget.type}
              onChange={(e) => update({ pageTarget: { type: e.target.value as PageTarget["type"] } as PageTarget })}
            >
              <option value="all">📑 All pages in each PDF</option>
              <option value="odd">📄 Odd pages only</option>
              <option value="even">📄 Even pages only</option>
            </select>
          </div>

          {/* Action buttons: Save & Delete */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              id="save-region-btn"
              type="button"
              className="btn btn-primary text-xs w-full py-2.5 flex items-center justify-center gap-1.5 font-medium transition-all shadow-sm"
              style={{
                background: saved ? "oklch(0.65 0.18 145)" : "var(--color-brand-600)",
                color: "white",
              }}
              onClick={handleSave}
            >
              {saved ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>Saved &amp; Applied to PDF!</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  <span>Save Changes</span>
                </>
              )}
            </button>

            {saved && (
              <p className="text-[11px] text-center font-medium fade-in" style={{ color: "var(--color-success)" }}>
                ✓ Region changes saved and updated in the preview
              </p>
            )}

            <button
              id="delete-region-btn"
              type="button"
              className="btn btn-ghost text-xs w-full py-1.5"
              style={{ color: "var(--color-danger)", borderColor: "oklch(0.65 0.22 25 / 0.3)" }}
              onClick={() => removeRegion(selectedRegion.id)}
            >
              🗑 Delete Region
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
