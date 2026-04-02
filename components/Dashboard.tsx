"use client";

import { useState } from "react";
import type { MarketSnapshot } from "@/types";
import { type TabId } from "@/lib/constants";
import { TabNav } from "@/components/TabNav";
import { ViewToggle } from "@/components/ViewToggle";
import { StalenessIndicator } from "@/components/StalenessIndicator";

// Tab components
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { PERatioTab } from "@/components/tabs/PERatioTab";
import { PBRatioTab } from "@/components/tabs/PBRatioTab";
import { DividendYieldTab } from "@/components/tabs/DividendYieldTab";
import { EPSGrowthTab } from "@/components/tabs/EPSGrowthTab";
import { ForwardPETab } from "@/components/tabs/ForwardPETab";
import { IndiaVsEMTab } from "@/components/tabs/IndiaVsEMTab";
import { ERPTab } from "@/components/tabs/ERPTab";
import { FlowsTab } from "@/components/tabs/FlowsTab";
import { McapGDPTab } from "@/components/tabs/McapGDPTab";
import { CompositeTab } from "@/components/tabs/CompositeTab";

interface DashboardProps {
  snapshots: MarketSnapshot[];
  lastUpdated: string;
}

export function Dashboard({ snapshots, lastUpdated }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [view, setView] = useState<"snapshot" | "full">("snapshot");

  const latest = snapshots[snapshots.length - 1];
  const tabProps = { snapshots, view, latest };

  function renderTab() {
    switch (activeTab) {
      case "overview":
        return <OverviewTab {...tabProps} />;
      case "pe":
        return <PERatioTab {...tabProps} />;
      case "pb":
        return <PBRatioTab {...tabProps} />;
      case "dy":
        return <DividendYieldTab {...tabProps} />;
      case "eps":
        return <EPSGrowthTab {...tabProps} />;
      case "forwardPe":
        return <ForwardPETab {...tabProps} />;
      case "indiaVsEm":
        return <IndiaVsEMTab {...tabProps} />;
      case "erp":
        return <ERPTab {...tabProps} />;
      case "flows":
        return <FlowsTab {...tabProps} />;
      case "mcapGdp":
        return <McapGDPTab {...tabProps} />;
      case "composite":
        return <CompositeTab {...tabProps} />;
      default:
        return <OverviewTab {...tabProps} />;
    }
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Top bar */}
      <header
        className="px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--cyan)" }}>
            NiftyLens
          </h1>
          <span className="text-xs text-text-muted hidden sm:inline">
            Indian Market Valuation Dashboard
          </span>
        </div>
        <div className="flex items-center gap-4">
          <StalenessIndicator lastUpdated={lastUpdated} />
          <ViewToggle view={view} onChange={setView} />
        </div>
      </header>

      {/* Tab navigation */}
      <TabNav activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <main className="flex-1">{renderTab()}</main>
    </div>
  );
}
