import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPT } from "@/lib/ai/knowledge";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

const PRIMARY = (process.env.GEMINI_MODEL || "gemini-2.5-flash-lite").trim();
const FALLBACKS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
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

async function callGemini(
  apiKey: string,
  model: string,
  systemText: string,
  history: { role: string; parts: { text: string }[] }[]
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
  return { ok: res.ok, status: res.status, raw: raw.slice(0, 600), data };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
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

    const models = [PRIMARY, ...FALLBACKS.filter((m) => m !== PRIMARY)];
    let lastErr = "";

    for (const model of models) {
      const result = await callGemini(apiKey, model, systemText, history);
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
      lastErr = result.raw || `HTTP ${result.status}`;
      if (result.status === 429) {
        return NextResponse.json(
          { error: "Gemini rate limit. Wait a minute and try again." },
          { status: 429 }
        );
      }
      if (result.status !== 404 && result.status !== 400) break;
    }

    console.error("Gemini failed", lastErr);
    let hint = "";
    if (lastErr.includes("API_KEY") || lastErr.includes("API key")) {
      hint = " Check GEMINI_API_KEY in Vercel Production env and redeploy.";
    } else if (lastErr.includes("not found") || lastErr.includes("NOT_FOUND")) {
      hint = " Try GEMINI_MODEL=gemini-2.0-flash in Vercel env.";
    }
    return NextResponse.json(
      { error: `Pow3Bot could not reach Gemini.${hint}` },
      { status: 502 }
    );
  } catch (e) {
    console.error("Pow3Bot route", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
