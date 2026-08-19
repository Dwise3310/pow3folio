"use client";

import { useState } from "react";

type Props = {
  country: string;
  region: string;
  onChange: (country: string, region: string) => void;
};

type GeoResult = { country: string; region: string; city?: string; source: string };

const NG_CITY_STATE: Record<string, string> = {
  calabar: "Cross River",
  "calabar municipal": "Cross River",
  "calabar south": "Cross River",
  akamkpa: "Cross River",
  ogoja: "Cross River",
  ikom: "Cross River",
  ugep: "Cross River",
  obudu: "Cross River",
  "port harcourt": "Rivers",
  portharcourt: "Rivers",
  "port-harcourt": "Rivers",
  yenagoa: "Bayelsa",
  uyo: "Akwa Ibom",
  "ikot ekpene": "Akwa Ibom",
  asaba: "Delta",
  warri: "Delta",
  "benin city": "Edo",
  benin: "Edo",
  lagos: "Lagos",
  ikeja: "Lagos",
  abuja: "FCT",
};

function normalizeName(value: string) {
  return value.toLowerCase().replace(/\bstate\b/g, "").replace(/[^a-z\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function stateFromCity(city: string): string | null {
  const key = normalizeName(city);
  if (NG_CITY_STATE[key]) return NG_CITY_STATE[key];
  for (const [name, state] of Object.entries(NG_CITY_STATE)) {
    if (key.includes(name) || name.includes(key)) return state;
  }
  return null;
}

function pickState(country: string, region: string, city: string): string {
  if (normalizeName(country) !== "nigeria") return region;
  const fromCity = city ? stateFromCity(city) : null;
  if (fromCity) return fromCity;
  const r = normalizeName(region);
  if (r === "rivers" && city && /calabar|ikom|ogoja|ugep|obudu/.test(normalizeName(city))) return "Cross River";
  if (r === "cross river" || r === "crossriver") return "Cross River";
  return region;
}

async function fromNominatim(latitude: number, longitude: number): Promise<GeoResult | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&zoom=10&addressdetails=1`,
    { headers: { Accept: "application/json", "User-Agent": "Pow3Folio/1.0 (location)" } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    address?: { country?: string; state?: string; city?: string; town?: string; village?: string; county?: string };
  };
  const addr = data.address || {};
  const country = addr.country?.trim() || "";
  if (!country) return null;
  const city = addr.city || addr.town || addr.village || "";
  return { country, region: pickState(country, addr.state || addr.county || "", city), city, source: "gps" };
}

async function fromBigData(latitude: number, longitude: number): Promise<GeoResult | null> {
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { countryName?: string; principalSubdivision?: string; city?: string; locality?: string };
  const country = data.countryName?.trim() || "";
  if (!country) return null;
  const city = data.city || data.locality || "";
  return { country, region: pickState(country, data.principalSubdivision || "", city), city, source: "gps" };
}

async function fromCoords(latitude: number, longitude: number): Promise<GeoResult> {
  const results = await Promise.allSettled([fromNominatim(latitude, longitude), fromBigData(latitude, longitude)]);
  const ok = results.map((r) => (r.status === "fulfilled" ? r.value : null)).filter((v): v is GeoResult => !!v);
  if (!ok.length) throw new Error("Could not resolve location");
  const preferred =
    ok.find((r) => normalizeName(r.country) === "nigeria" && /calabar/i.test(r.city || "")) ||
    ok.find((r) => r.region) ||
    ok[0];
  return {
    country: preferred.country,
    region: pickState(preferred.country, preferred.region, preferred.city || ""),
    city: preferred.city,
    source: "gps",
  };
}

export default function LocationControl({ country, region, onChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  async function detect() {
    setError(null);
    setHint(null);
    if (!navigator.geolocation) {
      setError("Allow location on this device, or type country and state. Network detect often picks the wrong Nigerian state.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const result = await fromCoords(pos.coords.latitude, pos.coords.longitude);
          onChange(result.country, result.region);
          if (result.city) setHint(`Detected ${result.city}, ${result.region}`);
        } catch {
          setError("Could not resolve GPS. Type your state below.");
        }
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was blocked. Type country and state. IP lookup is skipped because it often reports Rivers instead of Cross River."
            : "GPS timed out. Type your state below."
        );
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
          <p className="text-xs text-foreground-muted truncate">{label || "Country and state only. Uses GPS, not your network."}</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="label">Country</label>
          <input className="input" value={country} onChange={(e) => onChange(e.target.value, region)} placeholder="Nigeria" />
        </div>
        <div>
          <label className="label">State / region</label>
          <input className="input" value={region} onChange={(e) => onChange(country, e.target.value)} placeholder="Cross River" />
        </div>
      </div>
      {hint && <p className="text-xs text-foreground-muted">{hint}</p>}
      {error && <p className="text-xs text-danger animate-fade-in">{error}</p>}
    </div>
  );
}
