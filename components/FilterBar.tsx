"use client";

import type { Filters, LocationsResponse, TimePeriod } from "@/lib/types";
import { REGIONS } from "@/lib/regions";

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: "ONE_MONTH", label: "1 Month" },
  { value: "THREE_MONTHS", label: "3 Months" },
  { value: "SIX_MONTHS", label: "6 Months" },
  { value: "ONE_YEAR", label: "1 Year" },
  { value: "ALL_TIME", label: "All Time" },
];

const MIN_SIZES = [
  { value: 0, label: "Any Size" },
  { value: 16, label: "16+" },
  { value: 32, label: "32+" },
  { value: 64, label: "64+" },
  { value: 100, label: "100+" },
];

interface FilterBarProps {
  filters: Filters;
  locations: LocationsResponse | null;
  onChange: (updated: Partial<Filters>) => void;
  loading: boolean;
}

export default function FilterBar({ filters, locations, onChange, loading }: FilterBarProps) {
  const filteredStates = locations?.states.filter(
    (s) => !filters.region || s.region === filters.region
  ) ?? [];

  const filteredCities = locations?.cities.filter(
    (c) => !filters.state || c.state === filters.state
  ) ?? [];

  const filteredVenues = locations?.venues.filter(
    (v) =>
      (!filters.state || v.state === filters.state) &&
      (!filters.city || v.city === filters.city)
  ) ?? [];

  const hasLocationData = locations && locations.states.length > 0;

  function Select({
    value,
    onChange: onSelectChange,
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
        onChange={(e) => onSelectChange(e.target.value)}
        disabled={disabled}
        className="bg-[#1a1d27] border border-[#2a2d3a] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed min-w-[130px]"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Time Period — pill buttons */}
      <div className="flex items-center gap-1 bg-[#1a1d27] rounded-md p-1 border border-[#2a2d3a]">
        {TIME_PERIODS.map((tp) => (
          <button
            key={tp.value}
            onClick={() => onChange({ timePeriod: tp.value })}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              filters.timePeriod === tp.value
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tp.label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-[#2a2d3a]" />

      {/* Min Size */}
      <Select
        value={String(filters.minSize)}
        onChange={(v) => onChange({ minSize: parseInt(v, 10) })}
        options={MIN_SIZES.map((m) => ({ value: String(m.value), label: m.label }))}
        placeholder="Any Size"
      />

      {!hasLocationData ? (
        <span className="text-xs text-yellow-500/70 italic">
          Location filters require a TopDeck API key
        </span>
      ) : (
        <>
          <div className="w-px h-6 bg-[#2a2d3a]" />

          {/* Region */}
          <Select
            value={filters.region}
            onChange={(v) => onChange({ region: v, state: "", city: "", venue: "" })}
            options={REGIONS.map((r) => ({ value: r, label: r }))}
            placeholder="All Regions"
          />

          {/* State */}
          <Select
            value={filters.state}
            onChange={(v) => onChange({ state: v, city: "", venue: "" })}
            options={filteredStates.map((s) => ({ value: s.value, label: s.label }))}
            placeholder="All States"
            disabled={filteredStates.length === 0}
          />

          {/* City */}
          <Select
            value={filters.city}
            onChange={(v) => onChange({ city: v, venue: "" })}
            options={filteredCities.map((c) => ({ value: c.value, label: c.label }))}
            placeholder="All Cities"
            disabled={filteredCities.length === 0}
          />

          {/* Venue / Store */}
          <Select
            value={filters.venue}
            onChange={(v) => onChange({ venue: v })}
            options={filteredVenues.map((v) => ({ value: v.value, label: v.label }))}
            placeholder="All Stores"
            disabled={filteredVenues.length === 0}
          />

          {(filters.region || filters.state || filters.city || filters.venue) && (
            <button
              onClick={() =>
                onChange({ region: "", state: "", city: "", venue: "" })
              }
              className="text-xs text-gray-500 hover:text-white underline"
            >
              Clear location
            </button>
          )}
        </>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      )}
    </div>
  );
}
