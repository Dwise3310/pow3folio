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

const MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
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
        return JSON.parse(cleaned.slice(start, end + 1)) as Record<
          string,
          unknown
        >;
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
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50000);
}

function flatNotionText(node: unknown, out: string[]) {
  if (typeof node === "string") {
    if (node.trim()) out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const x of node) flatNotionText(x, out);
    return;
  }
  if (node && typeof node === "object") {
    for (const v of Object.values(node as Record<string, unknown>)) {
      flatNotionText(v, out);
    }
  }
}

async function fetchNotionText(url: URL): Promise<string | null> {
  const host = url.hostname.toLowerCase();
  if (!host.includes("notion.site") && !host.includes("notion.so")) return null;

  const path = url.pathname;
  const m =
    path.match(/([0-9a-f]{32})(?:\/?$)/i) ||
    path.match(
      /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
    );
  if (!m) return null;

  let pageId = m[1].replace(/-/g, "").toLowerCase();
  if (pageId.length !== 32) return null;
  const uuid = `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20)}`;

  const texts: string[] = [];
  let cursor: unknown = { stack: [] };
  for (let chunk = 0; chunk < 8; chunk++) {
    const res = await fetch("https://www.notion.so/api/v3/loadPageChunk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; Pow3FolioBot/1.0; +https://pow3folio.vercel.app)",
      },
      body: JSON.stringify({
        pageId: uuid,
        limit: 100,
        cursor,
        chunkNumber: chunk,
        verticalColumns: false,
      }),
      signal: AbortSignal.timeout(18000),
    });
    if (!res.ok) break;
    const data = (await res.json()) as {
      recordMap?: { block?: Record<string, unknown> };
      cursor?: { stack?: unknown[] };
    };
    const blocks = data.recordMap?.block || {};
    for (const wrap of Object.values(blocks)) {
      let node: unknown = wrap;
      for (let i = 0; i < 5; i++) {
        if (node && typeof node === "object" && "value" in (node as object)) {
          node = (node as { value: unknown }).value;
        } else break;
      }
      if (!node || typeof node !== "object") continue;
      const props = (node as { properties?: Record<string, unknown> })
        .properties;
      if (!props) continue;
      for (const key of Object.keys(props)) {
        const out: string[] = [];
        flatNotionText(props[key], out);
        const t = out.join("").trim();
        if (t && t.length > 1) texts.push(t);
      }
    }
    const stack = data.cursor?.stack;
    if (!stack || !Array.isArray(stack) || stack.length === 0) break;
    cursor = data.cursor;
  }

  const joined = texts.join("\n").trim();
  return joined.length >= 40 ? joined.slice(0, 50000) : null;
}

type GhRepo = {
  title: string;
  role: string;
  platform: string;
  description: string;
  url: string;
  category: "built";
};

async function fetchGitHubRepos(user: string): Promise<GhRepo[]> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(user)}/repos?type=owner&sort=updated&per_page=30`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Pow3FolioBot/1.0",
        },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      name?: string;
      description?: string | null;
      html_url?: string;
      fork?: boolean;
      language?: string | null;
    }>;
    if (!Array.isArray(data)) return [];
    return data
      .filter((r) => r && r.fork === false && r.name && r.html_url)
      .slice(0, 15)
      .map((r) => {
        const desc =
          (r.description && r.description.trim()) ||
          (r.language ? `${r.language} project` : "Personal GitHub repository");
        return {
          title: String(r.name).slice(0, 120),
          role: "Builder",
          platform: "GitHub",
          description: desc.slice(0, 300),
          url: String(r.html_url),
          category: "built" as const,
        };
      });
  } catch {
    return [];
  }
}

async function fetchGitHubText(
  url: URL
): Promise<{ text: string | null; repos: GhRepo[] }> {
  const host = url.hostname.toLowerCase();
  if (!host.includes("github.com")) return { text: null, repos: [] };
  const parts = url.pathname.split("/").filter(Boolean);
  if (!parts.length) return { text: null, repos: [] };
  const user = parts[0];
  if (["settings", "orgs", "marketplace", "topics", "explore"].includes(user))
    return { text: null, repos: [] };

  const profileUrl = `https://github.com/${encodeURIComponent(user)}`;
  let text = "";
  try {
    const res = await fetch(profileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) text = htmlToText(await res.text());
  } catch {
    /* ignore */
  }

  let readme = "";
  for (const branch of ["main", "master"]) {
    try {
      const rm = await fetch(
        `https://raw.githubusercontent.com/${encodeURIComponent(user)}/${encodeURIComponent(user)}/${branch}/README.md`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (rm.ok) {
        readme = (await rm.text()).slice(0, 15000);
        break;
      }
    } catch {
      /* ignore */
    }
  }

  const repos = await fetchGitHubRepos(user);
  const repoBlock =
    repos.length > 0
      ? "\n\nOwned repositories (not forks):\n" +
        repos
          .map((r) => `- ${r.title}: ${r.description} (${r.url})`)
          .join("\n")
      : "";

  const combined = [`GitHub profile: ${profileUrl}`, text, readme, repoBlock]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 50000);
  const ok = combined.replace(/\s+/g, " ").trim().length >= 40;
  return { text: ok ? combined : null, repos };
}

async function fetchGenericText(url: URL): Promise<string | null> {
  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const raw = await res.text();
  const pageText = ct.includes("html") ? htmlToText(raw) : raw.slice(0, 50000);
  return pageText.replace(/\s/g, "").length >= 40 ? pageText : null;
}

const EXTRACT_PROMPT = `Extract structured profile data for Pow3Folio (Web3 proof of work portfolio for builders, traders, community leads, researchers).
Return ONLY a JSON object (no markdown fences) with any keys you can infer:
{
  "display_name": string,
  "bio": string (max 160 chars, no URLs),
  "long_bio": string,
  "skills": [{"name": string, "description": string max 85 chars}],
  "work_experience": [{"company": string, "role": string, "description": string, "url": string, "employment_type": "full-time" or "part-time", "start_date": "YYYY-MM", "end_date": "YYYY-MM" or null}],
  "education": [{"institution": string, "degree": string, "field_of_study": string, "country": string, "start_year": string, "end_year": string}],
  "website_url": string,
  "github_url": string,
  "x_url": string,
  "telegram_url": string,
  "linkedin_url": string,
  "location_country": string,
  "location_region": string,
  "community": [{"title": string, "role": string, "platform": string, "description": string, "url": string, "category": "built" or "collaboration" or "community"}],
  "writings": [{"title": string, "url": string, "description": string}]
}
Rules:
- Max 8 skills, 5 work, 12 community, 6 writings.
- Map founder roles, community building, Discord/Telegram mods, campaign leads, testnet contributions into "community".
- GitHub repositories listed as "Owned repositories" MUST each become a community item with category "built", role "Builder", platform "GitHub", title = repo name, description = repo summary, url = repo link.
- Map articles, threads, research posts into "writings" when URLs exist.
- Prefer concrete facts only. Omit unknown keys. Be thorough.`;

async function callGemini(apiKey: string, model: string, pageText: string, sourceUrl: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${EXTRACT_PROMPT}\n\nSource URL: ${sourceUrl}\n\nPage text:\n${pageText}`,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
    }),
  });
  const raw = await res.text();
  let data: {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  } = {};
  try {
    data = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, data, raw: raw.slice(0, 400) };
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
      return NextResponse.json(
        { error: "Too many link imports. Wait a minute." },
        { status: 429 }
      );
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

    let pageText: string | null = null;
    let ghRepos: GhRepo[] = [];
    let fetchErr = "";

    try {
      if (host.includes("notion.site") || host.includes("notion.so")) {
        pageText = await fetchNotionText(parsed);
        if (!pageText) {
          fetchErr =
            "Could not read this Notion page. Make sure share is set to Public and the link includes the full page id.";
        }
      } else if (host.includes("github.com")) {
        const gh = await fetchGitHubText(parsed);
        pageText = gh.text;
        ghRepos = gh.repos;
        if (!pageText && ghRepos.length === 0) {
          fetchErr = "Could not read this GitHub profile. Check the username is correct and public.";
        }
        if (!pageText && ghRepos.length > 0) {
          pageText = `GitHub profile for ${parsed.pathname.split("/").filter(Boolean)[0]}\nOwned repositories:\n${ghRepos
            .map((r) => `- ${r.title}: ${r.description} (${r.url})`)
            .join("\n")}`;
        }
      } else {
        pageText = await fetchGenericText(parsed);
        if (!pageText) {
          fetchErr =
            "Page returned almost no text. It may need a login or is mostly JavaScript. Try Notion public share, GitHub, or a static about page.";
        }
      }
    } catch (e) {
      console.error("autofill-link fetch", e);
      fetchErr = "Could not fetch this link. Check it is public and try again.";
    }

    if (!pageText) {
      return NextResponse.json({ error: fetchErr || "Could not read link" }, { status: 400 });
    }

    const preferred = (process.env.GEMINI_MODEL || "").trim();
    const models = preferred
      ? [preferred, ...MODELS.filter((m) => m !== preferred)]
      : MODELS;

    let lastErr = "";
    for (const model of models) {
      const result = await callGemini(apiKey, model, pageText, parsed.toString());
      if (!result.ok) {
        lastErr = result.data.error?.message || result.raw || `HTTP ${result.status}`;
        console.error("autofill-link model", model, result.status, lastErr.slice(0, 200));
        continue;
      }
      const outText =
        result.data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
        "";
      const profile = extractJson(outText);
      if (!profile) {
        lastErr = "Could not structure profile from this link";
        continue;
      }

      if (ghRepos.length) {
        const existing = Array.isArray(profile.community)
          ? (profile.community as Record<string, unknown>[])
          : [];
        const seen = new Set(
          existing
            .map((c) => String(c.url || c.title || "").toLowerCase())
            .filter(Boolean)
        );
        for (const r of ghRepos) {
          const key = r.url.toLowerCase();
          if (seen.has(key) || seen.has(r.title.toLowerCase())) continue;
          existing.push({ ...r });
          seen.add(key);
        }
        profile.community = existing.slice(0, 15);
      }

      if (Array.isArray(profile.skills)) profile.skills = profile.skills.slice(0, 8);
      if (Array.isArray(profile.work_experience))
        profile.work_experience = profile.work_experience.slice(0, 5);
      if (Array.isArray(profile.community)) profile.community = profile.community.slice(0, 15);
      if (Array.isArray(profile.writings)) profile.writings = profile.writings.slice(0, 6);
      if (typeof profile.bio === "string") profile.bio = profile.bio.slice(0, 160);

      if (!profile.website_url && !host.includes("github.com") && !host.includes("notion.")) {
        profile.website_url = parsed.toString();
      }
      if (host.includes("github.com") && !profile.github_url) {
        profile.github_url = parsed.toString().split("?")[0];
      }

      return NextResponse.json({
        profile,
        source: parsed.toString(),
        model,
        github_repos: ghRepos.length,
      });
    }

    return NextResponse.json(
      {
        error: "AI could not parse this page. Try again or upload a CV.",
        detail: lastErr.slice(0, 180),
      },
      { status: 502 }
    );
  } catch (e) {
    console.error("autofill-link", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
