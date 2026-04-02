"use client";

import { useState } from "react";
import type { MetricExplanation } from "@/lib/content/metric-explanations";

interface InfoCardProps {
  title: string;
  content: MetricExplanation;
}

export function InfoCard({ title, content }: InfoCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="info-card">
      {/* Header — always visible */}
      <button
        className="w-full flex items-center justify-between text-left md:cursor-default"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        <span className="md:hidden text-text-muted text-lg leading-none select-none">
          {expanded ? "−" : "+"}
        </span>
      </button>

      {/* Body — collapsible on mobile, always visible on md+ */}
      <div className={`mt-3 space-y-2.5 ${expanded ? "block" : "hidden"} md:block`}>
        {content.what && (
          <div>
            <span className="section-header">What</span>
            <p className="text-xs text-text-secondary leading-relaxed">{content.what}</p>
          </div>
        )}

        {content.whyUseful && (
          <div>
            <span className="section-header">Why Useful</span>
            <p className="text-xs text-text-secondary leading-relaxed">{content.whyUseful}</p>
          </div>
        )}

        {content.zones && (
          <div>
            <span className="section-header">Zones</span>
            <p className="text-xs text-text-secondary leading-relaxed">{content.zones}</p>
          </div>
        )}

        {content.gotcha && (
          <div>
            <span className="section-header">Gotcha / Watch</span>
            <p className="text-xs text-amber-accent/80 leading-relaxed">{content.gotcha}</p>
          </div>
        )}

        {content.watch && !content.gotcha && (
          <div>
            <span className="section-header">Watch</span>
            <p className="text-xs text-amber-accent/80 leading-relaxed">{content.watch}</p>
          </div>
        )}

        {content.currentContext && (
          <div>
            <span className="section-header">Current Context</span>
            <p className="text-xs text-cyan/80 leading-relaxed">{content.currentContext}</p>
          </div>
        )}

        <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-text-muted">
            <span className="font-medium">Source:</span> {content.source}
          </p>
          <a href="/methodology" className="link-subtle">
            How is this calculated? → Methodology &amp; Sources
          </a>
        </div>
      </div>
    </div>
  );
}
