"use client";

import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { searchText, searchTextAcrossDocs } from "@/lib/pdf/textSearch";
import { mapFontName, isSubsetFont } from "@/lib/fonts/fontMatcher";
import { nanoid } from "@/lib/utils";
import type { Region, PageTarget } from "@/types";

export default function TextSearchPanel() {
  const { pdfDoc, pdfFiles, activePdfId, addRegion, addFontWarning } = useAppStore();
  const [oldText, setOldText] = useState("");
  const [newText, setNewText] = useState("");
  const [pageTargetType, setPageTargetType] = useState<PageTarget["type"]>("all");
  const [searchScope, setSearchScope] = useState<"all" | "current">("all");
  const [searching, setSearching] = useState(false);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [matchedDocCount, setMatchedDocCount] = useState<number | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    if (!oldText.trim()) return;
    setSearching(true);
    setNotFound(false);
    setResultCount(null);
    setMatchedDocCount(null);

    const pageTarget: PageTarget = { type: pageTargetType } as PageTarget;

    if (searchScope === "all" && pdfFiles.length > 0) {
      const matches = await searchTextAcrossDocs(pdfFiles, oldText.trim());
      setSearching(false);

      if (matches.length === 0) {
        setNotFound(true);
        return;
      }

      const uniqueFiles = new Set(matches.map((m) => m.fileId));

      for (const match of matches) {
        const [x, y, width, height] = match.bbox;
        const fontFamily = mapFontName(match.fontName);

        if (isSubsetFont(match.fontName)) {
          addFontWarning(`Font "${match.fontName.replace(/^[A-Z]{6}\+/, "")}" is a subset — falling back to ${fontFamily}.`);
        }

        const region: Region = {
          id: nanoid(),
          pageNumber: match.pageNumber,
          x, y, width, height,
          source: "text-match",
          fileTarget: match.fileId,
          rule: {
            originalText: oldText.trim(),
            replacementText: newText,
            fontFamily,
            fontSize: Math.round(match.fontSize) || 10,
            fontSizeSource: "detected",
            color: "#000000",
            alignment: "left",
            pageTarget,
          },
        };
        addRegion(region);
      }

      setResultCount(matches.length);
      setMatchedDocCount(uniqueFiles.size);
    } else {
      if (!pdfDoc) {
        setSearching(false);
        return;
      }
      const matches = await searchText(pdfDoc, oldText.trim());
      setSearching(false);

      if (matches.length === 0) {
        setNotFound(true);
        return;
      }

      for (const match of matches) {
        const [x, y, width, height] = match.bbox;
        const fontFamily = mapFontName(match.fontName);

        if (isSubsetFont(match.fontName)) {
          addFontWarning(`Font "${match.fontName.replace(/^[A-Z]{6}\+/, "")}" is a subset — falling back to ${fontFamily}.`);
        }

        const region: Region = {
          id: nanoid(),
          pageNumber: match.pageNumber,
          x, y, width, height,
          source: "text-match",
          fileTarget: activePdfId || "all",
          rule: {
            originalText: oldText.trim(),
            replacementText: newText,
            fontFamily,
            fontSize: Math.round(match.fontSize) || 10,
            fontSizeSource: "detected",
            color: "#000000",
            alignment: "left",
            pageTarget,
          },
        };
        addRegion(region);
      }

      setResultCount(matches.length);
      setMatchedDocCount(1);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-3.5">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-xs shadow-sm"
            style={{
              background: "linear-gradient(135deg, var(--color-brand-600), #6366f1)",
              color: "white",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-primary)" }}>
            Find &amp; Replace
          </span>
        </div>

        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{
            background: "oklch(0.55 0.22 260 / 0.15)",
            color: "var(--color-brand-400)",
            border: "1px solid oklch(0.55 0.22 260 / 0.25)",
          }}
        >
          Auto Detect
        </span>
      </div>

      {/* ── Find Input ── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="find-text-input" className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Find text in PDF
          </label>
          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono" style={{ color: "var(--color-text-muted)", background: "var(--color-surface-2)" }}>
            exact match
          </span>
        </div>
        <div className="relative flex items-center">
          <span className="absolute left-2.5 pointer-events-none text-xs" style={{ color: "var(--color-text-muted)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            id="find-text-input"
            className="input pl-8 pr-7 text-xs"
            placeholder='e.g. "Name of the Student"'
            value={oldText}
            onChange={(e) => {
              setOldText(e.target.value);
              setNotFound(false);
              setResultCount(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          {oldText && (
            <button
              type="button"
              onClick={() => setOldText("")}
              className="absolute right-2 text-xs opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-text-muted)" }}
              title="Clear"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Replace Input ── */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="replace-text-input" className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
          Replace with
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-2.5 pointer-events-none text-xs" style={{ color: "var(--color-text-muted)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </span>
          <input
            id="replace-text-input"
            className="input pl-8 pr-7 text-xs"
            placeholder="e.g. Student Name - 2024CS01"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          {newText && (
            <button
              type="button"
              onClick={() => setNewText("")}
              className="absolute right-2 text-xs opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-text-muted)" }}
              title="Clear"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Search Scope Selector (Multi-Document) ── */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="search-scope-select" className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
          Search in documents
        </label>
        <div className="relative">
          <select
            id="search-scope-select"
            className="input text-xs cursor-pointer appearance-none pr-8"
            value={searchScope}
            onChange={(e) => setSearchScope(e.target.value as "all" | "current")}
          >
            <option value="all">
              🌐 All uploaded PDFs ({pdfFiles.length > 0 ? pdfFiles.length : 1} file{pdfFiles.length === 1 ? "" : "s"})
            </option>
            <option value="current">
              📄 Current PDF only
            </option>
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Target Pages Selector ── */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="page-target-select" className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
          Apply to pages
        </label>
        <div className="relative">
          <select
            id="page-target-select"
            className="input text-xs cursor-pointer appearance-none pr-8"
            value={pageTargetType}
            onChange={(e) => setPageTargetType(e.target.value as PageTarget["type"])}
          >
            <option value="all">📑 All pages</option>
            <option value="odd">📄 Odd pages only</option>
            <option value="even">📄 Even pages only</option>
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Action Button ── */}
      <button
        id="find-replace-btn"
        className="btn btn-primary w-full py-2.5 text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "linear-gradient(135deg, var(--color-brand-600), #5b54ea)",
        }}
        onClick={handleSearch}
        disabled={searching || !oldText.trim()}
      >
        {searching ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "white", borderTopColor: "transparent" }} />
            <span>Searching PDF{pdfFiles.length > 1 ? "s" : ""}…</span>
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:scale-110">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <span>
              Find &amp; Replace in {searchScope === "all" && pdfFiles.length > 1 ? `All (${pdfFiles.length}) PDFs` : "PDF"}
            </span>
          </>
        )}
      </button>

      {/* ── Success Feedback ── */}
      {resultCount !== null && (
        <div
          className="p-2.5 rounded-lg text-xs flex items-center gap-2 fade-in"
          style={{
            background: "oklch(0.65 0.18 145 / 0.12)",
            border: "1px solid oklch(0.65 0.18 145 / 0.3)",
            color: "var(--color-success)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>
            Found &amp; created <strong>{resultCount}</strong> region{resultCount !== 1 ? "s" : ""}
            {matchedDocCount && matchedDocCount > 1 ? ` across ${matchedDocCount} PDFs` : ""}. Preview updated!
          </span>
        </div>
      )}

      {/* ── Not Found Warning ── */}
      {notFound && (
        <div
          className="p-2.5 rounded-lg text-xs flex items-start gap-2 fade-in"
          style={{
            background: "oklch(0.80 0.18 60 / 0.12)",
            border: "1px solid oklch(0.80 0.18 60 / 0.3)",
            color: "var(--color-warning)",
          }}
        >
          <span className="text-sm shrink-0">💡</span>
          <div>
            <p className="font-medium">No matches found for "{oldText.trim()}"</p>
            <p className="text-[11px] opacity-80 mt-0.5">
              Tip: You can also manually draw a box directly on the PDF to replace this text.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
