"use client";

import { useState } from "react";
import TextSearchPanel from "@/components/editor/TextSearchPanel";
import RulesPanel from "@/components/editor/RulesPanel";
import { useAppStore } from "@/store/appStore";

export default function BottomSheet() {
  const { regions } = useAppStore();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger button — only visible on small screens */}
      <div
        className="lg:hidden flex items-center justify-between px-4 py-2 shrink-0"
        style={{
          background: "var(--color-surface-1)",
          borderTop: "1px solid oklch(1 0 0 / 0.07)",
        }}
      >
        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {regions.length} region{regions.length !== 1 ? "s" : ""} created
        </span>
        <button
          id="bottom-sheet-toggle"
          className="btn btn-primary text-xs px-3 py-1.5"
          onClick={() => setOpen(true)}
        >
          ⚙ Edit Rules
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: "oklch(0 0 0 / 0.5)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sheet */}
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-y-auto ${open ? "slide-up" : ""}`}
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid oklch(1 0 0 / 0.1)",
          maxHeight: "80vh",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: open ? "none" : "transform 0.25s ease",
          willChange: "transform",
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "oklch(1 0 0 / 0.15)" }}
          />
        </div>

        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Edit Rules</h2>
          <button className="btn btn-ghost text-xs px-2 py-1" onClick={() => setOpen(false)}>Close</button>
        </div>

        <TextSearchPanel />
        <div style={{ height: "1px", background: "oklch(1 0 0 / 0.06)" }} />
        <RulesPanel />

        {/* Bottom padding for safe area */}
        <div className="h-8" />
      </div>
    </>
  );
}
