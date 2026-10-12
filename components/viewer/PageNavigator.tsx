"use client";

import { useAppStore } from "@/store/appStore";

export default function PageNavigator() {
  const { currentPage, totalPages, setCurrentPage } = useAppStore();

  const go = (n: number) => {
    const clamped = Math.max(1, Math.min(totalPages, n));
    setCurrentPage(clamped);
  };

  return (
    <div
      className="flex items-center gap-3 rounded-full px-4 py-1.5 text-sm"
      style={{
        background: "var(--color-surface-2)",
        border: "1px solid oklch(1 0 0 / 0.08)",
        color: "var(--color-text-secondary)",
      }}
    >
      <button
        className="btn btn-ghost text-xs px-2 py-0.5"
        onClick={() => go(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous page"
      >
        ‹
      </button>

      <div className="flex items-center gap-1.5">
        <input
          id="page-input"
          type="number"
          min={1}
          max={totalPages}
          value={currentPage}
          onChange={(e) => go(parseInt(e.target.value) || 1)}
          className="w-10 text-center rounded px-1 py-0.5 text-xs"
          style={{
            background: "var(--color-surface-3)",
            border: "1px solid oklch(1 0 0 / 0.1)",
            color: "var(--color-text-primary)",
          }}
          aria-label="Current page number"
        />
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>/ {totalPages}</span>
      </div>

      <button
        className="btn btn-ghost text-xs px-2 py-0.5"
        onClick={() => go(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}
