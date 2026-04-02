"use client";

import { SIGNAL_GREEN, SIGNAL_AMBER, SIGNAL_RED } from "@/lib/constants";

interface SignalBadgeProps {
  signal: string | null | undefined;
  className?: string;
}

export function SignalBadge({ signal, className = "" }: SignalBadgeProps) {
  if (!signal) return null;

  let colorClass = "signal-neutral";

  if (SIGNAL_GREEN.has(signal)) {
    colorClass = "signal-green";
  } else if (SIGNAL_AMBER.has(signal)) {
    colorClass = "signal-amber";
  } else if (SIGNAL_RED.has(signal)) {
    colorClass = "signal-red";
  }

  return (
    <span className={`signal-badge ${colorClass} ${className}`}>
      {signal}
    </span>
  );
}
