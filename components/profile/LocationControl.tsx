"use client";

import { useState } from "react";

type Props = {
  country: string;
  region: string;
  onChange: (country: string, region: string) => void;
};

type GeoResult = { country: string; region: string };

async function fromCoords(latitude: number, longitude: number): Promise<GeoResult> {
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
  );
  if (!res.ok) throw new Error("Could not resolve location");
  const data = (await res.json()) as {
    countryName?: string;
    principalSubdivision?: string;
  };
  const country = data.countryName?.trim() || "";
  if (!country) throw new Error("Could not detect country");
  return { country, region: data.principalSubdivision?.trim() || "" };
}

async function fromIp(): Promise<GeoResult> {
  try {
    const res = await fetch(
      "https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en"
    );
    if (res.ok) {
      const data = (await res.json()) as {
        countryName?: string;
        principalSubdivision?: string;
      };
      if (data.countryName?.trim()) {
        return {
          country: data.countryName.trim(),
          region: data.principalSubdivision?.trim() || "",
        };
      }
    }
  } catch {
    /* try next */
  }

  const res = await fetch("https://ipapi.co/json/");
  if (!res.ok) throw new Error("Could not detect location from network");
  const data = (await res.json()) as {
    country_name?: string;
    region?: string;
  };
  const country = data.country_name?.trim() || "";
  if (!country) throw new Error("Could not detect country");
  return { country, region: data.region?.trim() || "" };
}

export default function LocationControl({ country, region, onChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function detect() {
    setError(null);
    setLoading(true);

    const apply = (result: GeoResult) => {
      onChange(result.country, result.region);
      setLoading(false);
    };

    const failToIp = async (reason?: string) => {
      try {
        apply(await fromIp());
      } catch {
        setLoading(false);
        setError(reason || "Could not detect location. Type country and state below.");
      }
    };

    if (!navigator.geolocation) {
      await failToIp();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          apply(await fromCoords(pos.coords.latitude, pos.coords.longitude));
        } catch {
          await failToIp("GPS lookup failed. Using network location.");
        }
      },
      async (err) => {
        const hint =
          err.code === err.PERMISSION_DENIED
            ? "Location permission was blocked. Using network location instead."
            : "Device GPS unavailable. Using network location instead.";
        await failToIp(hint);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 }
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
            {label || "Country and state only, not an exact pin"}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="label">Country</label>
          <input
            className="input"
            value={country}
            onChange={(e) => onChange(e.target.value, region)}
            placeholder="Nigeria"
          />
        </div>
        <div>
          <label className="label">State / region</label>
          <input
            className="input"
            value={region}
            onChange={(e) => onChange(country, e.target.value)}
            placeholder="Cross River"
          />
        </div>
      </div>

      {error && <p className="text-xs text-danger animate-fade-in">{error}</p>}
    </div>
  );
}
