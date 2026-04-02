"use client";

import { useState } from "react";
import ColorPips from "./ColorPips";
import type { CommanderStats } from "@/lib/types";

type SortKey = keyof Pick<
  CommanderStats,
  "entries" | "topCuts" | "conversionRate" | "winRate" | "metaShare"
>;

interface CommanderTableProps {
  commanders: CommanderStats[];
  totalEntries: number;
  totalTournaments: number;
}

export default function CommanderTable({
  commanders,
  totalEntries,
  totalTournaments,
}: CommanderTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("entries");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...commanders].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortDir === "desc" ? -diff : diff;
  });

  const maxEntries = sorted[0]?.entries ?? 1;

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-gray-600 ml-1">↕</span>;
    return (
      <span className="text-blue-400 ml-1">{sortDir === "desc" ? "↓" : "↑"}</span>
    );
  }

  function Th({ col, label, right }: { col: SortKey; label: string; right?: boolean }) {
    return (
      <th
        className={`px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white select-none whitespace-nowrap ${right ? "text-right" : "text-left"}`}
        onClick={() => handleSort(col)}
      >
        {label}
        <SortIcon col={col} />
      </th>
    );
  }

  return (
    <div>
      {/* Summary */}
      <div className="flex gap-6 mb-4 text-sm text-gray-400">
        <span>
          <span className="text-white font-semibold">{commanders.length}</span> commanders
        </span>
        <span>
          <span className="text-white font-semibold">{totalEntries.toLocaleString()}</span>{" "}
          entries
        </span>
        {totalTournaments !== null && (
          <span>
            <span className="text-white font-semibold">{totalTournaments}</span> tournaments
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[#2a2d3a]">
        <table className="w-full text-sm">
          <thead className="bg-[#1a1d27] border-b border-[#2a2d3a]">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-left w-10">
                #
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-left">
                Commander
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-left">
                Colors
              </th>
              <Th col="entries" label="Entries" right />
              <Th col="topCuts" label="Top Cuts" right />
              <Th col="conversionRate" label="Conv. %" right />
              <Th col="winRate" label="Win %" right />
              <Th col="metaShare" label="Meta Share" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2d3a]">
            {sorted.map((cmd, i) => (
              <tr
                key={cmd.name}
                className="hover:bg-[#1a1d27] transition-colors"
              >
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-3">
                  <a
                    href={`https://edhtop16.com/commander/${encodeURIComponent(cmd.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-blue-400 font-medium transition-colors"
                  >
                    {cmd.name}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <ColorPips colorId={cmd.colorId} />
                </td>
                <td className="px-4 py-3 text-right text-gray-300 font-mono">
                  {cmd.entries.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-gray-300 font-mono">
                  {cmd.topCuts.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-gray-300 font-mono">
                  {cmd.conversionRate.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right text-gray-300 font-mono">
                  {cmd.winRate > 0 ? `${cmd.winRate.toFixed(1)}%` : "—"}
                </td>
                <td className="px-4 py-3 min-w-[160px]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[#2a2d3a] rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{
                          width: `${(cmd.entries / maxEntries) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-gray-300 font-mono text-xs w-12 text-right">
                      {cmd.metaShare.toFixed(2)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="py-16 text-center text-gray-500">
            No commanders found for the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
