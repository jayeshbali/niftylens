"use client";

import { POST_CONSOLIDATION_YEARS } from "@/lib/constants";

export interface TableRow {
  label: string;
  values: (string | number | null | undefined)[];
  getCellClass?: (val: string | number | null | undefined, year: string) => string;
  isYearTinted?: boolean;
  mono?: boolean;
  isSignal?: boolean;
}

interface DataTableProps {
  years: string[];
  rows: TableRow[];
  highlightYears?: string[];
  sectionTitle?: string;
}

function formatValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
}

export function DataTable({
  years,
  rows,
  highlightYears = POST_CONSOLIDATION_YEARS,
  sectionTitle,
}: DataTableProps) {
  return (
    <div className="mb-6">
      {sectionTitle && (
        <h3
          className="text-xs font-semibold uppercase tracking-widest mb-2 px-1"
          style={{ color: "var(--text-muted)" }}
        >
          {sectionTitle}
        </h3>
      )}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Metric</th>
              {years.map((year) => (
                <th
                  key={year}
                  className={highlightYears.includes(year) ? "cell-tint-orange" : ""}
                  style={{ color: highlightYears.includes(year) ? "var(--orange)" : undefined }}
                >
                  {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td title={row.label}>{row.label}</td>
                {years.map((year, colIdx) => {
                  const val = row.values[colIdx];
                  const displayVal = formatValue(val);
                  const baseTint = row.isYearTinted && highlightYears.includes(year)
                    ? "cell-tint-orange"
                    : "";
                  const extraClass = row.getCellClass
                    ? row.getCellClass(val, year)
                    : "";
                  const isMono = row.mono !== false;

                  return (
                    <td
                      key={year}
                      className={`${baseTint} ${extraClass}`}
                    >
                      <span className={isMono ? "mono" : ""}>{displayVal}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
