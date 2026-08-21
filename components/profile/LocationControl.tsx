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
  obubra: "Cross River",
  akpabuyo: "Cross River",
  "port harcourt": "Rivers",
  portharcourt: "Rivers",
  "port-harcourt": "Rivers",
  yenagoa: "Bayelsa",
  uyo: "Akwa Ibom",
  "ikot ekpene": "Akwa Ibom",
  eket: "Akwa Ibom",
  asaba: "Delta",
  warri: "Delta",
  "benin city": "Edo",
  lagos: "Lagos",
  ikeja: "Lagos",
  abuja: "FCT",
  wuse: "FCT",
  garki: "FCT",
};

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/\bstate\b/g, "")
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stateFromCity(city: string): string | null {
  const key = normalizeName(city);
  if (!key) return null;
  if (NG_CITY_STATE[key]) return NG_CITY_STATE[key];
  if (key === "cross river" || key === "crossriver") return "Cross River";
  for (const [name, state] of Object.entries(NG_CITY_STATE)) {
    if (name.length < 4) continue;
    if (key === name || key.startsWith(`${name} `) || key.endsWith(` ${name}`)) return state;
  }
  return null;
}

function stateFromCoords(lat: number, lon: number): string | null {
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  if (lat < 4.0 || lat > 14.0 || lon < 2.6 || lon > 15.0) return null;
  if (lat >= 4.82 && lat <= 5.16 && lon >= 8.15 && lon <= 8.52) return "Cross River";
  if (lat >= 4.65 && lat <= 6.95 && lon >= 8.00 && lon <= 9.55) return "Cross River";
  if (lat >= 4.3 && lat <= 5.75 && lon >= 6.35 && lon <= 7.55) return "Rivers";
  if (lat >= 4.45 && lat <= 5.55 && lon >= 7.45 && lon < 8.0) return "Akwa Ibom";
  if (lat >= 4.55 && lat <= 5.55 && lon >= 5.7 && lon < 6.45) return "Bayelsa";
  return null;
}

function pickState(country: string, region: string, city: string, lat?: number, lon?: number): string {
  if (normalizeName(country) !== "nigeria") return region;
  if (lat != null && lon != null) {
    const fromGps = stateFromCoords(lat, lon);
    if (fromGps) return fromGps;
  }
  const fromCity = city ? stateFromCity(city) : null;
  if (fromCity) return fromCity;
  const fromTyped = region ? stateFromCity(region) : null;
  if (fromTyped) return fromTyped;
  const r = normalizeName(region);
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
    address?: {
      country?: string;
      state?: string;
      city?: string;
      town?: string;
      village?: string;
      county?: string;
    };
  };
  const addr = data.address || {};
  const country = addr.country?.trim() || "";
  if (!country) return null;
  const city = addr.city || addr.town || addr.village || "";
  const region = pickState(country, addr.state || addr.county || "", city, latitude, longitude);
  return { country, region, city, source: "gps" };
}

async function fromBigData(latitude: number, longitude: number): Promise<GeoResult | null> {
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    countryName?: string;
    principalSubdivision?: string;
    city?: string;
    locality?: string;
  };
  const country = data.countryName?.trim() || "";
  if (!country) return null;
  const city = data.city || data.locality || "";
  const region = pickState(country, data.principalSubdivision || "", city, latitude, longitude);
  return { country, region, city, source: "gps" };
}

async function fromCoords(latitude: number, longitude: number): Promise<GeoResult> {
  const gpsState = stateFromCoords(latitude, longitude);
  const results = await Promise.allSettled([fromNominatim(latitude, longitude), fromBigData(latitude, longitude)]);
  const ok = results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((v): v is GeoResult => !!v);

  if (!ok.length) {
    if (gpsState) return { country: "Nigeria", region: gpsState, source: "gps" };
    throw new Error("Could not resolve location");
  }

  const preferred =
    ok.find((r) => /calabar/i.test(r.city || "") || r.region === "Cross River") ||
    ok.find((r) => r.region) ||
    ok[0];

  return {
    country: preferred.country,
    region: pickState(preferred.country, preferred.region, preferred.city || "", latitude, longitude),
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
      setError("This browser cannot share GPS. Allow location in your device settings and try again.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const result = await fromCoords(pos.coords.latitude, pos.coords.longitude);
          onChange(result.country, result.region);
          if (result.city) setHint(`Detected ${result.city}, ${result.region}`);
          else setHint(`Detected ${result.region}, ${result.country}`);
        } catch {
          setError("Could not resolve GPS. Allow precise location and tap Detect again.");
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
            {label || "Uses device GPS only. Manual typing is off so the state stays accurate."}
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
