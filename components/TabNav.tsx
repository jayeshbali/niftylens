"use client";

import { useEffect, useRef, useState } from "react";
import { ALL_TABS, type TabId } from "@/lib/constants";

interface TabNavProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

type GroupId = "overview" | "valuation" | "earnings" | "flows" | "macro" | "composite";

const GROUPS: { id: GroupId; label: string; tabs: TabId[] }[] = [
  { id: "overview", label: "Overview", tabs: ["overview"] },
  { id: "valuation", label: "Valuation", tabs: ["pe", "pb", "dy", "forwardPe"] },
  { id: "earnings", label: "Earnings", tabs: ["eps", "erp"] },
  { id: "flows", label: "Flows", tabs: ["flows", "indiaVsEm"] },
  { id: "macro", label: "Macro", tabs: ["mcapGdp"] },
  { id: "composite", label: "Composite", tabs: ["composite"] },
];

const TAB_LABEL: Record<TabId, string> = Object.fromEntries(
  ALL_TABS.map((t) => [t.id, t.label])
) as Record<TabId, string>;

function groupForTab(tabId: TabId): GroupId {
  for (const g of GROUPS) {
    if ((g.tabs as TabId[]).includes(tabId)) return g.id;
  }
  return "overview";
}

interface GroupButtonProps {
  group: (typeof GROUPS)[number];
  isActive: boolean;
  isOpen: boolean;
  activeTab: TabId;
  onClick: () => void;
  onTabSelect: (tab: TabId) => void;
}

function GroupButton({ group, isActive, isOpen, activeTab, onClick, onTabSelect }: GroupButtonProps) {
  const hasMultiple = group.tabs.length > 1;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  // Measure button position after isOpen becomes true so the fixed dropdown
  // lands directly below the trigger regardless of scroll or overflow containers.
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 4, left: r.left });
    } else {
      setDropdownPos(null);
    }
  }, [isOpen]);

  return (
    <div className="shrink-0">
      <button
        ref={triggerRef}
        onClick={onClick}
        className={`tab-btn flex items-center gap-1 ${isActive ? "tab-btn-active" : ""}`}
      >
        {group.label}
        {hasMultiple && (
          <span
            className="text-xs opacity-60 transition-transform duration-150"
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              display: "inline-block",
            }}
          >
            ▾
          </span>
        )}
      </button>

      {/* position: fixed escapes overflow-x: auto clipping on the nav container */}
      {hasMultiple && isOpen && dropdownPos && (
        <div
          className="rounded-lg py-1 min-w-[160px] shadow-xl"
          style={{
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            zIndex: 200,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
          }}
        >
          {group.tabs.map((tabId) => (
            <button
              key={tabId}
              onClick={() => onTabSelect(tabId)}
              className="w-full text-left px-3 py-2 text-sm transition-colors"
              style={{
                color: activeTab === tabId ? "var(--cyan)" : "var(--text-secondary)",
                background: activeTab === tabId ? "rgba(34,211,238,0.08)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tabId)
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tabId)
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
              }}
            >
              {TAB_LABEL[tabId]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TabNav({ activeTab, onChange }: TabNavProps) {
  const [openGroup, setOpenGroup] = useState<GroupId | null>(null);
  const [flatMode, setFlatMode] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenGroup(null);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const activeGroup = groupForTab(activeTab);
  const activeGroupDef = GROUPS.find((g) => g.id === activeGroup)!;

  function handleGroupClick(group: (typeof GROUPS)[number]) {
    if (group.tabs.length === 1) {
      onChange(group.tabs[0]);
      setOpenGroup(null);
    } else {
      setOpenGroup(openGroup === group.id ? null : group.id);
    }
  }

  function handleTabSelect(tabId: TabId) {
    onChange(tabId);
    setOpenGroup(null);
  }

  return (
    <div
      ref={navRef}
      style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <nav className="flex items-center gap-1 py-2 px-4 overflow-x-auto scrollbar-none">
        {flatMode ? (
          <>
            <button
              onClick={() => setFlatMode(false)}
              className="tab-btn text-xs mr-2 shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              ← Groups
            </button>
            {ALL_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={`tab-btn shrink-0 ${activeTab === tab.id ? "tab-btn-active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </>
        ) : (
          <>
            {GROUPS.map((group) => (
              <GroupButton
                key={group.id}
                group={group}
                isActive={activeGroup === group.id}
                isOpen={openGroup === group.id}
                activeTab={activeTab}
                onClick={() => handleGroupClick(group)}
                onTabSelect={handleTabSelect}
              />
            ))}
            <div className="ml-auto shrink-0">
              <button
                onClick={() => setFlatMode(true)}
                className="tab-btn text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                ≡ All
              </button>
            </div>
          </>
        )}
      </nav>

      {/* Sub-tab strip — shown when the active group has multiple tabs */}
      {!flatMode && activeGroupDef.tabs.length > 1 && (
        <div
          className="flex gap-1 px-4 pb-2 overflow-x-auto scrollbar-none"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {activeGroupDef.tabs.map((tabId) => (
            <button
              key={tabId}
              onClick={() => onChange(tabId)}
              className="text-xs px-3 py-1 rounded-md transition-colors whitespace-nowrap shrink-0"
              style={{
                color: activeTab === tabId ? "var(--cyan)" : "var(--text-muted)",
                background: activeTab === tabId ? "rgba(34,211,238,0.08)" : "transparent",
              }}
            >
              {TAB_LABEL[tabId]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
