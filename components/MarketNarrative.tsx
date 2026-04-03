"use client";

import type { MarketSnapshot } from "@/types";

interface MarketNarrativeProps {
  latest: MarketSnapshot;
  prev: MarketSnapshot | null; // previous annual row for SIP comparison
}

function fmt(v: number | null, decimals = 1): string {
  if (v === null || v === undefined) return "—";
  return v.toFixed(decimals);
}

function fmtFlow(v: number | null): string {
  if (v === null || v === undefined) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "net sellers (−" : "net buyers (+";
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L Cr)`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(0)}K Cr)`;
  return `${sign}₹${abs.toFixed(0)} Cr)`;
}

export function MarketNarrative({ latest, prev }: MarketNarrativeProps) {
  const pe = latest.niftyPeStandalone;
  const pb = latest.niftyPb;
  const forwardPe = latest.forwardPe;
  const trailingErp = latest.trailingErp;
  const fiiNet = latest.fiiNet;
  const sip = latest.sipMonthlyAvg;
  const score = latest.compositeScore;
  const zone = latest.compositeZone;

  // ── Sentence 1: PE assessment ─────────────────────────────────────────────
  let peLabel: string;
  if (pe === null) peLabel = "trading at unknown valuation";
  else if (pe < 17) peLabel = "trading cheap on trailing metrics";
  else if (pe <= 22) peLabel = "near fair value on trailing metrics";
  else if (pe <= 24) peLabel = "slightly above fair value on trailing metrics";
  else peLabel = "expensive on trailing metrics";

  const peStr =
    pe !== null && pb !== null
      ? `Indian large-cap equities are ${peLabel} (PE ~${fmt(pe)}x, PB ${fmt(pb, 2)}x).`
      : `Indian large-cap equities are ${peLabel}.`;

  // ── Sentence 2: forward context ───────────────────────────────────────────
  let fwdStr = "";
  if (forwardPe !== null && pe !== null) {
    let fwdLabel: string;
    if (forwardPe < 17) fwdLabel = "more attractive on a forward basis";
    else if (forwardPe <= 20) fwdLabel = "similar on a forward basis";
    else fwdLabel = "less attractive on a forward basis";
    fwdStr = `They look ${fwdLabel} (forward PE ~${fmt(forwardPe)}x).`;
  }

  // ── Sentence 3: key tension ───────────────────────────────────────────────
  const tensions: string[] = [];

  if (trailingErp !== null && trailingErp < 0) {
    tensions.push(
      `Bonds currently offer a better yield than equities (trailing ERP ${fmt(trailingErp, 2)}%).`
    );
  }
  if (fiiNet !== null && fiiNet < 0) {
    tensions.push(`Foreign institutions are ${fmtFlow(fiiNet)} this fiscal year.`);
  }
  const prevSip = prev?.sipMonthlyAvg ?? null;
  if (sip !== null && sip >= 20000) {
    const sipK = (sip / 1000).toFixed(0);
    if (prevSip !== null && sip > prevSip) {
      tensions.push(
        `SIP flows are at a record ₹${sipK}K Cr/month, providing a strong structural floor.`
      );
    } else {
      tensions.push(`SIP flows of ₹${sipK}K Cr/month continue to provide a structural floor.`);
    }
  }

  const tensionStr = tensions[0] ?? "";

  // ── Closing: composite ────────────────────────────────────────────────────
  const compositeStr =
    score !== null
      ? `Composite score: ${fmt(score)}/10 — ${zone ?? "—"}.`
      : "";

  // Assemble into 2–3 sentences
  const sentences = [peStr, fwdStr, tensionStr, compositeStr].filter(Boolean);

  return (
    <p
      className="text-xs leading-relaxed pl-3"
      style={{
        color: "var(--text-secondary)",
        borderLeft: "2px solid rgba(34,211,238,0.4)",
      }}
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
