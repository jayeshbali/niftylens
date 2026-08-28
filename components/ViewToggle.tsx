"use client";

interface ViewToggleProps {
  view: "snapshot" | "full";
  onChange: (v: "snapshot" | "full") => void;
  snapshotLabel?: string;
  fullLabel?: string;
}

export function ViewToggle({
  view,
  onChange,
  snapshotLabel = "5Y Snapshot",
  fullLabel = "Full History",
}: ViewToggleProps) {
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
        {snapshotLabel}
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
        {fullLabel}
      </button>
    </div>
  );
}
