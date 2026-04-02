import { SignalBadge } from "./SignalBadge";

interface VerdictCardProps {
  label: string;
  value: string | number | null | undefined;
  subvalue?: string | null;
  signal: string | null | undefined;
  context: string;
}

export function VerdictCard({
  label,
  value,
  subvalue,
  signal,
  context,
}: VerdictCardProps) {
  const displayValue = value !== null && value !== undefined ? String(value) : "—";

  return (
    <div className="verdict-card flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-text-secondary leading-tight">{label}</span>
        <SignalBadge signal={signal} />
      </div>
      <div>
        <div className="mono text-2xl font-semibold text-text-primary leading-none">
          {displayValue}
        </div>
        {subvalue && (
          <div className="mono text-xs text-text-muted mt-0.5">{subvalue}</div>
        )}
      </div>
      <p className="text-xs text-text-muted leading-relaxed">{context}</p>
    </div>
  );
}
