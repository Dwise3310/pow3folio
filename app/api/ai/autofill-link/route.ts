import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const buckets = new Map<string, { count: number; reset: number }>();

const BLOCKED_HOSTS = [
  "linkedin.com",
  "www.linkedin.com",
  "facebook.com",
  "www.facebook.com",
  "instagram.com",
  "www.instagram.com",
  "x.com",
  "twitter.com",
  "www.twitter.com",
];

function rateLimit(key: string, limit = 6): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

function extractJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 45000);
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    if (!rateLimit(`link:${user.id}`)) {
      return NextResponse.json({ error: "Too many link imports. Wait a minute." }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
    if (!rawUrl) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Only http(s) links" }, { status: 400 });
    }

    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.some((h) => host === h || host.endsWith("." + h))) {
      return NextResponse.json(
        {
          error:
            "This site blocks public scraping (login wall). Use a public Notion page, GitHub profile, personal site, or upload a PDF/TXT CV instead.",
        },
        { status: 400 }
      );
    }

    let pageText = "";
    try {
      const res = await fetch(parsed.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Pow3FolioBot/1.0; +https://pow3folio.vercel.app)",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        return NextResponse.json(
          {
            error: `Could not open link (HTTP ${res.status}). Make sure the page is public.`,
          },
          { status: 400 }
        );
      }
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const raw = await res.text();
      pageText = ct.includes("html") ? htmlToText(raw) : raw.slice(0, 45000);
    } catch {
      return NextResponse.json(
        { error: "Could not fetch this link. Check it is public and try again." },
        { status: 400 }
      );
    }

    if (pageText.replace(/\s/g, "").length < 40) {
      return NextResponse.json(
        {
          error:
            "Page returned almost no text. It may need a login or is mostly JavaScript. Try Notion public share, GitHub, or a static about page.",
        },
        { status: 400 }
      );
    }

    const model = (process.env.GEMINI_MODEL || "gemini-2.5-flash-lite").trim();
    const prompt = `Extract structured profile data for Pow3Folio from this public page text.
Source URL: ${parsed.toString()}
Return ONLY JSON (no markdown) with optional keys:
{
  "display_name": string,
  "bio": string (max 160, no URLs),
  "long_bio": string,
  "skills": [{"name": string, "description": string max 85}],
  "work_experience": [{"company": string, "role": string, "description": string, "url": string, "employment_type": "full-time"|"part-time", "start_date": "YYYY-MM", "end_date": "YYYY-MM"|null}],
  "education": [{"institution": string, "degree": string, "field_of_study": string, "country": string, "start_year": string, "end_year": string}],
  "website_url": string,
  "github_url": string,
  "x_url": string,
  "telegram_url": string,
  "linkedin_url": string,
  "location_country": string,
  "location_region": string,
  "community": [{"title": string, "role": string, "platform": string, "description": string, "url": string}],
  "writings": [{"title": string, "url": string, "description": string}]
}
Max 8 skills, 5 work, 6 community, 6 writings. Only facts present in the text.

Page text:
${pageText}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
    const aiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2500 },
      }),
    });
    const rawAi = await aiRes.text();
    if (!aiRes.ok) {
      console.error("autofill-link", aiRes.status, rawAi.slice(0, 300));
      return NextResponse.json(
        { error: "AI could not parse this page. Try again or upload a CV." },
        { status: 502 }
      );
    }

    let data: { candidates?: { content?: { parts?: { text?: string }[] } }[] } = {};
    try {
      data = JSON.parse(rawAi);
    } catch {
      return NextResponse.json({ error: "Bad AI response" }, { status: 502 });
    }
    const outText =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    const profile = extractJson(outText);
    if (!profile) {
      return NextResponse.json({ error: "Could not structure profile from this link" }, { status: 502 });
    }

    // Prefer the source URL as website if empty
    if (!profile.website_url && !host.includes("github.com") && !host.includes("notion.")) {
      profile.website_url = parsed.toString();
    }
    if (host.includes("github.com") && !profile.github_url) {
      profile.github_url = parsed.toString();
    }

    return NextResponse.json({ profile, source: parsed.toString() });
  } catch (e) {
    console.error("autofill-link", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
