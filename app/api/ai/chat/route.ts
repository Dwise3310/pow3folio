import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPT } from "@/lib/ai/knowledge";
import { buildProfileContext, computeScores } from "@/lib/ai/scores";
import type {
  Profile,
  Writing,
  Trade,
  CommunityItem,
  Airdrop,
  Collectible,
  Credential,
} from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

const DEFAULT_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
];

const MAX_HISTORY = 12;
const MAX_USER_CHARS = 4000;

const buckets = new Map<string, { count: number; reset: number }>();
const LIMIT_GUEST = 12;
const LIMIT_USER = 40;
const WINDOW_MS = 60_000;

function rateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** Strip common prompt-injection markers from untrusted client strings. */
function sanitizeClientText(raw: string, max: number): string {
  return raw
    .slice(0, max)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/system\s*:/gi, "")
    .replace(/ignore\s+(all\s+)?(previous|prior)\s+instructions/gi, "")
    .replace(/you\s+are\s+now/gi, "")
    .trim();
}

async function listGenerateModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };
    const names: string[] = [];
    for (const m of data.models || []) {
      const methods = m.supportedGenerationMethods || [];
      if (!methods.includes("generateContent")) continue;
      const id = (m.name || "").replace(/^models\//, "");
      if (!id || id.includes("embed") || id.includes("image") || id.includes("tts")) continue;
      names.push(id);
    }
    return names;
  } catch {
    return [];
  }
}

async function loadBuilderContext(userId: string): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) return "";

    const p = profile as Profile;
    const [
      { data: writings },
      { data: trades },
      { data: community },
      { data: airdrops },
      { data: collectibles },
      { data: credentials },
    ] = await Promise.all([
      supabase.from("writings").select("*").eq("user_id", p.id),
      supabase.from("trades").select("*").eq("user_id", p.id),
      supabase.from("community_items").select("*").eq("user_id", p.id),
      supabase.from("airdrops").select("*").eq("user_id", p.id),
      supabase.from("collectibles").select("*").eq("user_id", p.id),
      supabase.from("credentials").select("*").eq("user_id", p.id),
    ]);

    const input = {
      profile: p,
      writings: (writings as Writing[]) ?? [],
      trades: (trades as Trade[]) ?? [],
      community: (community as CommunityItem[]) ?? [],
      airdrops: (airdrops as Airdrop[]) ?? [],
      nfts: (collectibles as Collectible[]) ?? [],
      credentials: (credentials as Credential[]) ?? [],
    };
    const scores = computeScores(input);
    return buildProfileContext({ ...input, scores });
  } catch {
    return "";
  }
}

async function callGemini(
  apiKey: string,
  model: string,
  systemText: string,
  history: { role: string; parts: { text: string }[] }[]
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemText }] },
      contents: history,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1400,
      },
    }),
  });
  const raw = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, raw: raw.slice(0, 800), data };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Pow3Bot is not configured. Add GEMINI_API_KEY on Vercel (Production + Preview) and redeploy.",
        },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const rawMessages = (body as { messages?: unknown }).messages;
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const messages: ChatMessage[] = [];
    for (const m of rawMessages.slice(-MAX_HISTORY - 2)) {
      if (!m || typeof m !== "object") continue;
      const role = (m as { role?: string }).role;
      const content = (m as { content?: unknown }).content;
      if (role !== "user" && role !== "assistant") continue;
      if (typeof content !== "string") continue;
      const cleaned = sanitizeClientText(content, MAX_USER_CHARS);
      if (!cleaned) continue;
      messages.push({ role, content: cleaned });
    }

    if (!messages.length) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const last = messages[messages.length - 1];
    if (!last || last.role !== "user") {
      return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
    }

    const clientContext =
      typeof (body as { context?: unknown }).context === "string"
        ? sanitizeClientText((body as { context: string }).context, 2000)
        : "";

    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      /* guest */
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anon";
    const limitKey = userId ? `u:${userId}` : `ip:${ip}`;
    const limit = userId ? LIMIT_USER : LIMIT_GUEST;
    if (!rateLimit(limitKey, limit)) {
      return NextResponse.json(
        {
          error: userId
            ? "Rate limit: max 40 messages per minute for signed-in builders."
            : "Rate limit: sign in for higher limits, or wait a minute.",
        },
        { status: 429 }
      );
    }

    const profileContext = userId ? await loadBuilderContext(userId) : "";

    const history = messages
      .filter((m, i) => !(i === 0 && m.role === "assistant"))
      .slice(-MAX_HISTORY)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    while (history.length && history[0].role !== "user") history.shift();
    if (!history.length) {
      return NextResponse.json({ error: "Empty conversation" }, { status: 400 });
    }

    let systemText = SYSTEM_PROMPT;
    if (profileContext) {
      systemText +=
        "\n\n## Live profile of the signed-in builder (use this for analysis, shortfalls, and rewrites)\n" +
        profileContext +
        "\nYou CAN see this profile. Never say you cannot access it. Quote concrete gaps and give paste-ready replacements.";
    } else if (clientContext) {
      systemText += "\n\n## Context (untrusted client notes)\n" + clientContext;
    } else {
      systemText +=
        "\n\nNo signed-in profile loaded. If they ask to analyse their profile, ask them to log in on Pow3Folio first.";
    }

    const preferred = (process.env.GEMINI_MODEL || "").trim();
    const discovered = await listGenerateModels(apiKey);
    const models: string[] = [];
    if (preferred) models.push(preferred);
    for (const m of DEFAULT_MODELS) if (!models.includes(m)) models.push(m);
    for (const m of discovered) if (!models.includes(m)) models.push(m);

    let lastErr = "";
    let lastStatus = 0;

    for (const model of models.slice(0, 8)) {
      const result = await callGemini(apiKey, model, systemText, history);
      lastStatus = result.status;
      lastErr = result.raw || `HTTP ${result.status}`;

      if (result.ok) {
        const parts = (
          result.data as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          }
        )?.candidates?.[0]?.content?.parts;
        let text =
          parts
            ?.map((p) => p.text || "")
            .join("")
            .trim() || "I could not form a reply. Try rephrasing.";
        text = text
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/\*([^*]+)\*/g, "$1")
          .replace(/__([^_]+)__/g, "$1")
          .replace(/`([^`]+)`/g, "$1");
        return NextResponse.json({ reply: text, model, hasProfile: !!profileContext });
      }

      if (result.status === 429) {
        return NextResponse.json(
          { error: "Gemini rate limit. Wait a minute and try again." },
          { status: 429 }
        );
      }

      if (
        result.status === 400 &&
        (lastErr.includes("API_KEY_INVALID") || lastErr.includes("API key not valid"))
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid GEMINI_API_KEY. Create a key at aistudio.google.com/apikey, paste it in Vercel Production env (no quotes), redeploy.",
          },
          { status: 502 }
        );
      }

      if (result.status !== 404 && result.status !== 400) break;
    }

    console.error("Gemini failed", lastStatus, lastErr);
    return NextResponse.json(
      {
        error:
          "Pow3Bot could not reach Gemini. Set GEMINI_MODEL=gemini-2.5-flash in Vercel and redeploy.",
      },
      { status: 502 }
    );
  } catch (e) {
    console.error("Pow3Bot route", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
