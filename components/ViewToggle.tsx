"use client";

interface ViewToggleProps {
  view: "snapshot" | "full";
  onChange: (v: "snapshot" | "full") => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div
      className="flex items-center gap-1 p-1 rounded-lg"
      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      <button
        onClick={() => onChange("snapshot")}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          view === "snapshot"
            ? "bg-surface text-cyan border border-cyan/20"
            : "text-text-secondary hover:text-text-primary"
        }`}
        style={view === "snapshot" ? { background: "var(--surface)" } : undefined}
      >
        5Y Snapshot
      </button>
      <button
        onClick={() => onChange("full")}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          view === "full"
            ? "bg-surface text-cyan border border-cyan/20"
            : "text-text-secondary hover:text-text-primary"
        }`}
        style={view === "full" ? { background: "var(--surface)" } : undefined}
      >
        Full History
      </button>
    </div>
  );
}
