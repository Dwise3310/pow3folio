import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPT } from "@/lib/ai/knowledge";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const MAX_HISTORY = 12;
const MAX_USER_CHARS = 4000;

// Simple in-memory rate limit per IP (best effort on serverless)
const buckets = new Map<string, { count: number; reset: number }>();
const LIMIT = 20;
const WINDOW_MS = 60_000;

function rateLimit(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (b.count >= LIMIT) return false;
  b.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anon";

    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Wait a minute and try again." },
        { status: 429 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Pow3Bot is not configured yet. Add GEMINI_API_KEY in Vercel env.",
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

    // Optional auth: attach username for personalization later
    let who = "guest";
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) who = user.id.slice(0, 8);
    } catch {
      /* guest ok */
    }

    const history = messages.slice(-MAX_HISTORY).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.slice(0, MAX_USER_CHARS) }],
    }));

    // Gemini requires alternating user/model; ensure first is user
    while (history.length && history[0].role !== "user") history.shift();

    const systemText =
      SYSTEM_PROMPT +
      (context
        ? `\n\n## Current builder context (may be partial)\n${context}\nSession: ${who}`
        : `\nSession: ${who}`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: history,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Gemini error", res.status, errText.slice(0, 400));
      if (res.status === 429) {
        return NextResponse.json(
          { error: "Model rate limit hit. Try again shortly." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "Pow3Bot could not respond. Try again." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("")
        .trim() || "I could not form a reply. Try rephrasing.";

    return NextResponse.json({ reply: text, model: MODEL });
  } catch (e) {
    console.error("Pow3Bot route", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
