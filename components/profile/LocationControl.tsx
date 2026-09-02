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
  const [hint, setHint] = useState<string | null>(null);

  async function detect() {
    setError(null);
    setHint(null);

    if (!navigator.geolocation) {
      setError("This browser cannot share GPS. Allow location in your device settings and try again.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const qs = new URLSearchParams({
            lat: String(pos.coords.latitude),
            lon: String(pos.coords.longitude),
          });
          const res = await fetch(`/api/geo/reverse?${qs.toString()}`);
          const json = (await res.json()) as {
            country?: string;
            region?: string;
            city?: string;
            error?: string;
          };
          if (!res.ok || !json.country) {
            throw new Error(json.error || "unresolved");
          }
          onChange(json.country, json.region || "");
          if (json.city && json.region) setHint(`Detected ${json.city}, ${json.region}`);
          else setHint(`Detected ${json.region || json.country}, ${json.country}`);
        } catch {
          setError("Could not resolve GPS to a state. Allow precise location and tap Update again.");
        }
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location permission was blocked. Enable it for this site, then tap Detect.");
        } else {
          setError("GPS timed out. Move somewhere with a clearer signal and tap Detect again.");
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

  const label = country && region ? `${region}, ${country}` : country || region || null;

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <span className="location-dot" aria-hidden />
            Location
          </p>
          <p className="text-xs text-foreground-muted truncate">
            {label || "Uses device GPS. State and country come from the geocoder, not a guessed box."}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" className="btn-secondary text-xs" disabled={loading} onClick={detect}>
            {loading ? "Detecting…" : label ? "Update" : "Detect"}
          </button>
          {label && (
            <button type="button" className="btn-ghost text-xs text-danger" onClick={() => onChange("", "")}>
              Clear
            </button>
          )}
        </div>
      </div>
      {hint && <p className="text-xs text-foreground-muted">{hint}</p>}
      {error && <p className="text-xs text-danger animate-fade-in">{error}</p>}
    </div>
  );
}
