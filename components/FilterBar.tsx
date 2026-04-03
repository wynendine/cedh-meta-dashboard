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
  { value: 32, label: "32+ players" },
  { value: 60, label: "60+ players" },
  { value: 100, label: "100+ players" },
  { value: 150, label: "150+ players" },
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
  options: { value: string; label: string; title?: string }[];
  disabled?: boolean;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="bg-[#1a1d27] border border-[#2a2d3a] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed min-w-[140px]"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value} title={o.title}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function FilterBar({ filters, locations, locationsLoading, onChange, loading }: FilterBarProps) {
  const hasLocationData = locations && locations.countries.length > 0;
  const isUS = filters.country === "United States";

  // Cascade filtering
  const filteredStates = locations?.states.filter((s) => {
    if (filters.country && s.country !== filters.country) return false;
    if (isUS && filters.region && s.region !== filters.region) return false;
    return true;
  }) ?? [];

  const filteredCities = locations?.cities.filter((c) => {
    if (filters.country && c.country !== filters.country) return false;
    if (filters.state && c.state !== filters.state) return false;
    return true;
  }) ?? [];

  const filteredVenues = locations?.venues.filter((v) => {
    if (filters.country && v.country !== filters.country) return false;
    if (filters.state && v.state !== filters.state) return false;
    if (filters.city && v.city !== filters.city) return false;
    return true;
  }) ?? [];

  const hasActiveLocation = filters.country || filters.region || filters.state || filters.city || filters.venue;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Time Period pills */}
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
        placeholder="Min Size"
      />

      {!hasLocationData ? (
        <span className="text-xs text-gray-500 italic">
          {locationsLoading ? "Loading location filters…" : "No location data available"}
        </span>
      ) : (
        <>
          <div className="w-px h-6 bg-[#2a2d3a]" />

          {/* Country */}
          <Select
            value={filters.country}
            onChange={(v) => onChange({ country: v, region: "", state: "", city: "", venue: "" })}
            options={locations.countries.map((c) => ({ value: c, label: c }))}
            placeholder="All Countries"
          />

          {/* Region — only for US */}
          {isUS && (
            <Select
              value={filters.region}
              onChange={(v) => onChange({ region: v, state: "", city: "", venue: "" })}
              options={REGIONS.map((r) => ({ value: r, label: r }))}
              placeholder="All Regions"
            />
          )}

          {/* State / Province */}
          <Select
            value={filters.state}
            onChange={(v) => onChange({ state: v, city: "", venue: "" })}
            options={filteredStates.map((s) => ({ value: s.value, label: s.label }))}
            placeholder={isUS ? "All States" : "All Provinces"}
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
            options={filteredVenues.map((v) => ({ value: v.value, label: v.label, title: v.address ?? v.value }))}
            placeholder="All Stores"
            disabled={filteredVenues.length === 0}
          />

          {hasActiveLocation && (
            <button
              onClick={() => onChange({ country: "", region: "", state: "", city: "", venue: "" })}
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
