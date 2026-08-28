"use client";

import type { UsMarketSnapshot } from "@/types";

interface MarketNarrativeUSProps {
  latest: UsMarketSnapshot;
  prev: UsMarketSnapshot | null;
}

function fmt(v: number | null, decimals = 1): string {
  if (v === null || v === undefined) return "—";
  return v.toFixed(decimals);
}

export function MarketNarrativeUS({ latest }: MarketNarrativeUSProps) {
  const pe = latest.sp500PeTrailing;
  const pb = latest.sp500Pb;
  const cape = latest.capeRatio;
  const trailingErp = latest.trailingErp;
  const score = latest.compositeScore;
  const zone = latest.compositeZone;

  let peLabel: string;
  if (pe === null) peLabel = "trading at unknown valuation";
  else if (pe < 17) peLabel = "trading cheap on trailing metrics";
  else if (pe <= 22) peLabel = "near fair value on trailing metrics";
  else peLabel = "expensive on trailing metrics vs. the modern-regime range";

  const peStr =
    pe !== null && pb !== null
      ? `US large-cap equities are ${peLabel} (PE ~${fmt(pe)}x, PB ${fmt(pb, 2)}x).`
      : `US large-cap equities are ${peLabel}.`;

  let fwdStr = "";
  if (cape !== null && pe !== null) {
    const gap = cape - pe;
    fwdStr =
      gap > 10
        ? `The Shiller CAPE (${fmt(cape)}x) reads notably richer than trailing PE — the earnings-smoothing lens sees more froth.`
        : `Shiller CAPE (${fmt(cape)}x) is broadly in line with trailing PE, not flagging extra froth.`;
  }

  const tensions: string[] = [];
  if (trailingErp !== null && trailingErp < 0) {
    tensions.push(
      `10-year Treasuries currently offer a better yield than equity earnings (trailing ERP ${fmt(trailingErp, 2)}%).`
    );
  }

  const tensionStr = tensions[0] ?? "";

  const compositeStr =
    score !== null ? `Composite score: ${fmt(score)}/10 — ${zone ?? "—"}.` : "";

  const sentences = [peStr, fwdStr, tensionStr, compositeStr].filter(Boolean);

  return (
    <p
      className="text-xs leading-relaxed pl-3"
      style={{ color: "var(--text-secondary)", borderLeft: "2px solid rgba(34,211,238,0.4)" }}
    >
      {sentences.map((s, i) => (
        <span key={i}>
          {s}
          {i < sentences.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
