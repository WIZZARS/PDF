"use client";

import { useAppStore } from "@/store/appStore";

export default function FontWarningBanner() {
  const { fontWarnings, clearFontWarnings } = useAppStore();
  if (fontWarnings.length === 0) return null;

  return (
    <div
      className="flex items-start justify-between gap-3 px-4 py-2 text-xs fade-in"
      style={{
        background: "oklch(0.80 0.18 60 / 0.1)",
        borderBottom: "1px solid oklch(0.80 0.18 60 / 0.25)",
        color: "oklch(0.80 0.18 60)",
      }}
    >
      <div className="flex flex-col gap-0.5">
        {fontWarnings.map((w, i) => (
          <p key={i}>⚠ {w}</p>
        ))}
      </div>
      <button
        onClick={clearFontWarnings}
        className="shrink-0 text-xs opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss font warnings"
      >
        ✕
      </button>
    </div>
  );
}
