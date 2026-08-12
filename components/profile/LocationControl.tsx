"use client";

import { useState } from "react";

type Props = {
  country: string;
  region: string;
  onChange: (country: string, region: string) => void;
};

export default function LocationControl({ country, region, onChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function detect() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Location is not supported on this device/browser.");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Coarse reverse geocode: country + region only (no street)
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (!res.ok) throw new Error("Could not resolve location");
          const data = (await res.json()) as {
            countryName?: string;
            principalSubdivision?: string;
          };
          const c = data.countryName?.trim() || "";
          const r = data.principalSubdivision?.trim() || "";
          if (!c) throw new Error("Could not detect country");
          onChange(c, r);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Location lookup failed");
        }
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Allow location access in your browser, then try again.");
        } else {
          setError("Could not get device location.");
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60_000 }
    );
  }

  const label =
    country && region ? `${region}, ${country}` : country || region || null;

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <span className="location-dot" aria-hidden />
            Location
          </p>
          <p className="text-xs text-foreground-muted truncate">
            {label || "Country & state only, not exact pin"}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" className="btn-secondary text-xs" disabled={loading} onClick={detect}>
            {loading ? "Detecting…" : label ? "Update" : "Detect"}
          </button>
          {label && (
            <button
              type="button"
              className="btn-ghost text-xs text-danger"
              onClick={() => onChange("", "")}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="text-xs text-danger animate-fade-in">{error}</p>
      )}
    </div>
  );
}
