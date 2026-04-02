"use client";

import { ALL_TABS, type TabId } from "@/lib/constants";

interface TabNavProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

export function TabNav({ activeTab, onChange }: TabNavProps) {
  return (
    <nav
      className="flex flex-wrap gap-1 py-3 px-4"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
    >
      {ALL_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`tab-btn ${activeTab === tab.id ? "tab-btn-active" : ""}`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
