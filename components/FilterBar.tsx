"use client";

import type { Filters, LocationsResponse, TimePeriod } from "@/lib/types";
import { REGIONS } from "@/lib/regions";

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: "ONE_MONTH", label: "1M" },
  { value: "THREE_MONTHS", label: "3M" },
  { value: "SIX_MONTHS", label: "6M" },
  { value: "ONE_YEAR", label: "1Y" },
  { value: "ALL_TIME", label: "All" },
];

const TIME_PERIODS_FULL: { value: TimePeriod; label: string }[] = [
  { value: "ONE_MONTH", label: "1 Month" },
  { value: "THREE_MONTHS", label: "3 Months" },
  { value: "SIX_MONTHS", label: "6 Months" },
  { value: "ONE_YEAR", label: "1 Year" },
  { value: "ALL_TIME", label: "All Time" },
];

const MIN_SIZES = [
  { value: 16, label: "16+ players" },
  { value: 30, label: "30+ players" },
  { value: 50, label: "50+ players" },
  { value: 100, label: "100+ players" },
  { value: 250, label: "250+ players" },
];

interface FilterBarProps {
  filters: Filters;
  locations: LocationsResponse | null;
  locationsLoading: boolean;
  onChange: (updated: Partial<Filters>) => void;
  loading: boolean;
}

function Select({
  value,
  onChange,
  options,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full bg-[#1a1d27] border border-[#2a2d3a] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export default function FilterBar({ filters, locations, locationsLoading, onChange, loading }: FilterBarProps) {
  const hasLocationData = locations && locations.countries.length > 0;
  const isUS = filters.country === "United States";

  const filteredStates = locations?.states.filter((s) => {
    if (filters.country && s.country !== filters.country) return false;
    if (isUS && filters.region && s.region !== filters.region) return false;
    return true;
  }) ?? [];

  const filteredCities = (() => {
    const seen = new Set<string>();
    return (locations?.cities ?? []).filter((c) => {
      if (filters.country && c.country !== filters.country) return false;
      if (filters.state && c.state !== filters.state) return false;
      const key = c.label.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  const hasActiveLocation = filters.country || filters.region || filters.state || filters.city;

  return (
    <div className="space-y-3 lg:space-y-0 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
      {/* Row 1: Time period + loading */}
      <div className="flex items-center justify-between gap-3">
        {/* Time Period pills — abbreviated on mobile, full on desktop */}
        <div className="flex items-center gap-1 bg-[#1a1d27] rounded-md p-1 border border-[#2a2d3a]">
          {TIME_PERIODS.map((tp, i) => (
            <button
              key={tp.value}
              onClick={() => onChange({ timePeriod: tp.value })}
              className={`px-2.5 py-1 text-sm rounded transition-colors lg:hidden ${
                filters.timePeriod === tp.value
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tp.label}
            </button>
          ))}
          {TIME_PERIODS_FULL.map((tp) => (
            <button
              key={tp.value}
              onClick={() => onChange({ timePeriod: tp.value })}
              className={`hidden lg:block px-3 py-1 text-sm rounded transition-colors ${
                filters.timePeriod === tp.value
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tp.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 lg:hidden">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        )}
      </div>

      <div className="hidden lg:block w-px h-6 bg-[#2a2d3a]" />

      {/* Row 2: Dropdowns — 2-col grid on mobile, inline on desktop */}
      <div className="grid grid-cols-2 gap-2 lg:contents">
        <Select
          value={String(filters.minSize)}
          onChange={(v) => onChange({ minSize: v ? parseInt(v, 10) : 0 })}
          options={MIN_SIZES.map((m) => ({ value: String(m.value), label: m.label }))}
          placeholder="Any size"
        />

        {!hasLocationData ? (
          <span className="col-span-2 text-xs text-gray-500 italic self-center">
            {locationsLoading ? "Loading location filters…" : "No location data available"}
          </span>
        ) : (
          <>
            <div className="hidden lg:block w-px h-6 bg-[#2a2d3a]" />

            <Select
              value={filters.country}
              onChange={(v) => onChange({ country: v, region: "", state: "", city: "" })}
              options={locations.countries.map((c) => ({ value: c, label: c }))}
              placeholder="All Countries"
            />

            {isUS && (
              <Select
                value={filters.region}
                onChange={(v) => onChange({ region: v, state: "", city: "" })}
                options={REGIONS.map((r) => ({ value: r, label: r }))}
                placeholder="All Regions"
              />
            )}

            <Select
              value={filters.state}
              onChange={(v) => {
                const stateCountry = locations?.states.find((s) => s.value === v)?.country;
                onChange({ state: v, city: "", ...(stateCountry && !filters.country ? { country: stateCountry } : {}) });
              }}
              options={filteredStates.map((s) => ({ value: s.value, label: s.label }))}
              placeholder={isUS ? "All States" : "All Provinces"}
              disabled={filteredStates.length === 0}
            />

            <Select
              value={filters.city}
              onChange={(v) => onChange({ city: v })}
              options={filteredCities.map((c) => ({ value: c.value, label: c.label }))}
              placeholder="All Cities"
              disabled={filteredCities.length === 0}
            />

            {hasActiveLocation && (
              <button
                onClick={() => onChange({ country: "", region: "", state: "", city: "" })}
                className="col-span-2 lg:col-span-1 text-xs text-gray-500 hover:text-white underline text-left"
              >
                Clear location
              </button>
            )}
          </>
        )}
      </div>

      {/* Loading indicator — desktop only */}
      {loading && (
        <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      )}
    </div>
  );
}
