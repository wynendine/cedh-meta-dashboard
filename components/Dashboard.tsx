"use client";

import { useState, useEffect, useCallback } from "react";
import FilterBar from "./FilterBar";
import CommanderTable from "./CommanderTable";
import type { Filters, MetaResponse, LocationsResponse } from "@/lib/types";

const DEFAULT_FILTERS: Filters = {
  timePeriod: "THREE_MONTHS",
  country: "",
  region: "",
  state: "",
  city: "",
  venue: "",
  minSize: 60,
};

function buildQuery(filters: Filters): string {
  const params = new URLSearchParams();
  params.set("timePeriod", filters.timePeriod);
  if (filters.country) params.set("country", filters.country);
  if (filters.region) params.set("region", filters.region);
  if (filters.state) params.set("state", filters.state);
  if (filters.city) params.set("city", filters.city);
  if (filters.venue) params.set("venue", filters.venue);
  if (filters.minSize > 0) params.set("minSize", String(filters.minSize));
  return params.toString();
}

export default function Dashboard() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [locations, setLocations] = useState<LocationsResponse | null>(null);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeta = useCallback(async (f: Filters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta?${buildQuery(f)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMeta(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLocations = useCallback(async (timePeriod: string) => {
    setLocationsLoading(true);
    // Retry up to 3 times — locations can time out on cold start
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`/api/locations?timePeriod=${timePeriod}`);
        if (res.ok) {
          const data = await res.json();
          if (data.countries?.length > 0) {
            setLocations(data);
            setLocationsLoading(false);
            return;
          }
        }
      } catch {
        // continue to retry
      }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 3000));
    }
    setLocationsLoading(false);
  }, []);

  useEffect(() => {
    fetchMeta(filters);
  }, [filters, fetchMeta]);

  useEffect(() => {
    fetchLocations(filters.timePeriod);
  }, [filters.timePeriod, fetchLocations]);

  function handleFilterChange(updated: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...updated }));
  }

  // Location breadcrumb
  const locationParts = [filters.country, filters.region, filters.state, filters.city, filters.venue].filter(Boolean);
  const locationLabel = locationParts.length > 0 ? locationParts.join(" › ") : "Global";

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Header */}
      <header className="border-b border-[#2a2d3a] bg-[#0f1117]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">cEDH Meta Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Powered by{" "}
              <a
                href="https://edhtop16.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300 underline"
              >
                edhtop16.com
              </a>{" "}
              &amp;{" "}
              <a
                href="https://topdeck.gg"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300 underline"
              >
                TopDeck.gg
              </a>
            </p>
          </div>
          <div className="text-sm text-gray-400">
            Viewing:{" "}
            <span className="text-white font-medium">{locationLabel}</span>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-[1400px] mx-auto px-6 py-4 border-b border-[#2a2d3a]">
        <FilterBar
          filters={filters}
          locations={locations}
          locationsLoading={locationsLoading}
          onChange={handleFilterChange}
          loading={loading}
        />
      </div>

      {/* Content */}
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
            Error: {error}
          </div>
        ) : loading && !meta ? (
          <div className="space-y-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded bg-[#1a1d27] animate-pulse"
                style={{ opacity: 1 - i * 0.04 }}
              />
            ))}
          </div>
        ) : meta ? (
          <CommanderTable
            commanders={meta.commanders}
            totalEntries={meta.totalEntries}
            totalTournaments={meta.totalTournaments}
          />
        ) : null}
      </main>
    </div>
  );
}
