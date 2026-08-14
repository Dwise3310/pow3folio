import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPT } from "@/lib/ai/knowledge";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

/** Current free-tier friendly IDs (2.0 flash was shut down June 2026). */
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

async function listGenerateModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`,
      { next: { revalidate: 0 } }
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
        temperature: 0.55,
        maxOutputTokens: 1024,
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
    const messages = (body?.messages as ChatMessage[] | undefined) ?? [];
    const context = typeof body?.context === "string" ? body.context.slice(0, 6000) : "";

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const last = messages[messages.length - 1];
    if (!last || last.role !== "user" || !last.content?.trim()) {
      return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
    }
    if (last.content.length > MAX_USER_CHARS) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

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

    const trimmed = messages
      .filter((m, i) => !(i === 0 && m.role === "assistant"))
      .slice(-MAX_HISTORY);

    const history = trimmed.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.slice(0, MAX_USER_CHARS) }],
    }));

    while (history.length && history[0].role !== "user") history.shift();
    if (!history.length) {
      return NextResponse.json({ error: "Empty conversation" }, { status: 400 });
    }

    const systemText =
      SYSTEM_PROMPT +
      (context ? `\n\n## Current builder context (may be partial)\n${context}` : "") +
      (userId ? "\nSigned-in builder session." : "\nGuest session.");

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
        const text =
          parts
            ?.map((p) => p.text || "")
            .join("")
            .trim() || "I could not form a reply. Try rephrasing.";
        return NextResponse.json({ reply: text, model });
      }

      if (result.status === 429) {
        return NextResponse.json(
          { error: "Gemini rate limit. Wait a minute and try again." },
          { status: 429 }
        );
      }

      // Invalid API key: stop immediately
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

      // Try next model on not found / bad request
      if (result.status !== 404 && result.status !== 400) break;
    }

    console.error("Gemini failed", lastStatus, lastErr);

    if (lastStatus === 403) {
      return NextResponse.json(
        {
          error:
            "Gemini returned 403. Enable Generative Language API for this Google project, or create a new API key in AI Studio.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Pow3Bot could not reach Gemini. Set GEMINI_MODEL=gemini-2.5-flash in Vercel, confirm the key is for AI Studio (not Vertex), and redeploy.",
      },
      { status: 502 }
    );
  } catch (e) {
    console.error("Pow3Bot route", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
