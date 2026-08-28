"use client";

import { useState } from "react";
import type { MarketSnapshot, UsMarketSnapshot, MarketId } from "@/types";
import type { UsMarketDailySnapshot, UsMarketMonthlyFlow } from "@/lib/db/schema";
import { type TabId } from "@/lib/constants";
import { ALL_TABS_US, GROUPS_US, type TabIdUS } from "@/lib/constants-us";
import { TabNav } from "@/components/TabNav";
import { ViewToggle } from "@/components/ViewToggle";
import { StalenessIndicator } from "@/components/StalenessIndicator";

// India tab components
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

// US tab components
import { OverviewTabUS } from "@/components/tabs/us/OverviewTabUS";
import { PERatioTabUS } from "@/components/tabs/us/PERatioTabUS";
import { PBRatioTabUS } from "@/components/tabs/us/PBRatioTabUS";
import { DividendYieldTabUS } from "@/components/tabs/us/DividendYieldTabUS";
import { EPSGrowthTabUS } from "@/components/tabs/us/EPSGrowthTabUS";
import { ForwardPETabUS } from "@/components/tabs/us/ForwardPETabUS";
import { UsVsExUsTabUS } from "@/components/tabs/us/UsVsExUsTabUS";
import { ERPTabUS } from "@/components/tabs/us/ERPTabUS";
import { FlowsTabUS } from "@/components/tabs/us/FlowsTabUS";
import { McapGDPTabUS } from "@/components/tabs/us/McapGDPTabUS";
import { RiskSentimentTabUS } from "@/components/tabs/us/RiskSentimentTabUS";
import { CompositeTabUS } from "@/components/tabs/us/CompositeTabUS";

interface DashboardProps {
  snapshots: MarketSnapshot[];
  lastUpdated: string;
  usSnapshots: UsMarketSnapshot[];
  usLastUpdated: string;
  usLatestDaily: Pick<UsMarketDailySnapshot, "vix" | "hySpread" | "yieldCurve10y2y" | "realYield10y"> | null;
  usLatestMonthly: Pick<
    UsMarketMonthlyFlow,
    "aaiiBullishPct" | "aaiiBearishPct" | "aaiiNeutralPct" | "marginDebtBalance" | "top10ConcentrationPct"
  > | null;
}

function MarketSwitcher({ market, onChange }: { market: MarketId; onChange: (m: MarketId) => void }) {
  return (
    <div
      className="flex items-center gap-1 p-1 rounded-lg"
      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      {(["india", "us"] as MarketId[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
          style={{
            background: market === m ? "var(--surface)" : "transparent",
            color: market === m ? "var(--cyan)" : "var(--text-secondary)",
          }}
        >
          {m === "india" ? "🇮🇳 India" : "🇺🇸 US"}
        </button>
      ))}
    </div>
  );
}

export function Dashboard({
  snapshots,
  lastUpdated,
  usSnapshots,
  usLastUpdated,
  usLatestDaily,
  usLatestMonthly,
}: DashboardProps) {
  const [market, setMarket] = useState<MarketId>("india");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [activeTabUS, setActiveTabUS] = useState<TabIdUS>("overview");
  const [view, setView] = useState<"snapshot" | "full">("snapshot");

  const latest = snapshots[snapshots.length - 1];
  const tabProps = { snapshots, view, latest };

  const usLatest = usSnapshots[usSnapshots.length - 1];
  const tabPropsUS = {
    snapshots: usSnapshots,
    view,
    latest: usLatest,
    latestDaily: usLatestDaily,
    latestMonthly: usLatestMonthly,
  };

  function renderIndiaTab() {
    switch (activeTab) {
      case "overview": return <OverviewTab {...tabProps} />;
      case "pe": return <PERatioTab {...tabProps} />;
      case "pb": return <PBRatioTab {...tabProps} />;
      case "dy": return <DividendYieldTab {...tabProps} />;
      case "eps": return <EPSGrowthTab {...tabProps} />;
      case "forwardPe": return <ForwardPETab {...tabProps} />;
      case "indiaVsEm": return <IndiaVsEMTab {...tabProps} />;
      case "erp": return <ERPTab {...tabProps} />;
      case "flows": return <FlowsTab {...tabProps} />;
      case "mcapGdp": return <McapGDPTab {...tabProps} />;
      case "composite": return <CompositeTab {...tabProps} />;
      default: return <OverviewTab {...tabProps} />;
    }
  }

  function renderUsTab() {
    if (!usLatest) {
      return (
        <div className="p-6 text-sm text-text-muted">
          No US data yet — run the migration + historical seed scripts, then the refresh cron.
        </div>
      );
    }
    switch (activeTabUS) {
      case "overview": return <OverviewTabUS {...tabPropsUS} />;
      case "pe": return <PERatioTabUS {...tabPropsUS} />;
      case "pb": return <PBRatioTabUS {...tabPropsUS} />;
      case "dy": return <DividendYieldTabUS {...tabPropsUS} />;
      case "eps": return <EPSGrowthTabUS {...tabPropsUS} />;
      case "forwardPe": return <ForwardPETabUS {...tabPropsUS} />;
      case "usVsExUs": return <UsVsExUsTabUS {...tabPropsUS} />;
      case "erp": return <ERPTabUS {...tabPropsUS} />;
      case "flows": return <FlowsTabUS {...tabPropsUS} />;
      case "mcapGdp": return <McapGDPTabUS {...tabPropsUS} />;
      case "riskSentiment": return <RiskSentimentTabUS {...tabPropsUS} />;
      case "composite": return <CompositeTabUS {...tabPropsUS} />;
      default: return <OverviewTabUS {...tabPropsUS} />;
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
            {market === "india" ? "Indian Market Valuation Dashboard" : "US Market Valuation Dashboard"}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MarketSwitcher market={market} onChange={setMarket} />
          <StalenessIndicator lastUpdated={market === "india" ? lastUpdated : usLastUpdated} />
          <ViewToggle
            view={view}
            onChange={setView}
            snapshotLabel={market === "india" ? "5Y Snapshot" : "Key Eras"}
          />
        </div>
      </header>

      {/* Tab navigation */}
      {market === "india" ? (
        <TabNav activeTab={activeTab} onChange={(t) => setActiveTab(t as TabId)} />
      ) : (
        <TabNav
          activeTab={activeTabUS}
          onChange={(t) => setActiveTabUS(t as TabIdUS)}
          tabs={ALL_TABS_US}
          groups={GROUPS_US}
        />
      )}

      {/* Tab content */}
      <main className="flex-1">{market === "india" ? renderIndiaTab() : renderUsTab()}</main>
    </div>
  );
}
