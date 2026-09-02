import { NextResponse } from "next/server";

export const revalidate = 86400;

type GeoOut = { country: string; region: string; city?: string; source: string };

const NG_CITY_STATE: Record<string, string> = {
  aba: "Abia",
  umuahia: "Abia",
  arochukwu: "Abia",
  ohafia: "Abia",
  bende: "Abia",
  osisioma: "Abia",
  obingwa: "Abia",
  "port harcourt": "Rivers",
  portharcourt: "Rivers",
  yenagoa: "Bayelsa",
  uyo: "Akwa Ibom",
  calabar: "Cross River",
  owerri: "Imo",
  orlu: "Imo",
  okigwe: "Imo",
  enugu: "Enugu",
  nsukka: "Enugu",
  awka: "Anambra",
  onitsha: "Anambra",
  nnewi: "Anambra",
  abakaliki: "Ebonyi",
  asaba: "Delta",
  warri: "Delta",
  "benin city": "Edo",
  lagos: "Lagos",
  ikeja: "Lagos",
  abuja: "FCT",
  kano: "Kano",
  ibadan: "Oyo",
  ilorin: "Kwara",
  jos: "Plateau",
  kaduna: "Kaduna",
  maiduguri: "Borno",
  sokoto: "Sokoto",
  minna: "Niger",
  makurdi: "Benue",
};

function norm(value: string) {
  return value
    .toLowerCase()
    .replace(/\bstate\b/g, "")
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stateFromCity(city: string) {
  const key = norm(city);
  if (!key) return null;
  if (NG_CITY_STATE[key]) return NG_CITY_STATE[key];
  for (const [name, state] of Object.entries(NG_CITY_STATE)) {
    if (name.length < 4) continue;
    if (key === name || key.includes(name)) return state;
  }
  return null;
}

async function fromGoogle(lat: number, lon: number): Promise<GeoOut | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&result_type=administrative_area_level_1|locality|country&key=${key}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    status?: string;
    results?: Array<{ address_components?: Array<{ long_name?: string; types?: string[] }> }>;
  };
  if (json.status !== "OK" || !json.results?.length) return null;
  let country = "";
  let region = "";
  let city = "";
  for (const row of json.results) {
    for (const part of row.address_components || []) {
      const types = part.types || [];
      if (types.includes("country") && part.long_name) country = part.long_name;
      if (types.includes("administrative_area_level_1") && part.long_name) region = part.long_name.replace(/\sState$/i, "");
      if ((types.includes("locality") || types.includes("administrative_area_level_2")) && part.long_name && !city) {
        city = part.long_name;
      }
    }
  }
  if (!country) return null;
  if (norm(country) === "nigeria") region = stateFromCity(city) || region;
  return { country, region, city, source: "google" };
}

async function fromNominatim(lat: number, lon: number): Promise<GeoOut | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&zoom=10&addressdetails=1`,
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
  let region = (addr.state || addr.county || "").replace(/\sState$/i, "");
  if (norm(country) === "nigeria") region = stateFromCity(city) || region;
  return { country, region, city, source: "nominatim" };
}

async function fromBigData(lat: number, lon: number): Promise<GeoOut | null> {
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
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
  let region = (data.principalSubdivision || "").replace(/\sState$/i, "");
  if (norm(country) === "nigeria") region = stateFromCity(city) || region;
  return { country, region, city, source: "bigdata" };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "bad coords" }, { status: 400 });
  }
  const google = await fromGoogle(lat, lon);
  if (google?.country && google.region) return NextResponse.json(google);
  const [nom, big] = await Promise.all([fromNominatim(lat, lon), fromBigData(lat, lon)]);
  const hit = [google, nom, big].filter((x): x is GeoOut => !!x && !!x.country && !!x.region)[0];
  if (!hit) return NextResponse.json({ error: "unresolved" }, { status: 404 });
  return NextResponse.json(hit);
}
