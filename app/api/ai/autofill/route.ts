import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const buckets = new Map<string, { count: number; reset: number }>();

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-flash-latest",
];

function rateLimit(key: string, limit = 8): boolean {
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

function detectMime(name: string, declared: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".txt")) return "text/plain";
  if (n.endsWith(".md")) return "text/markdown";
  if (n.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (n.endsWith(".doc")) return "application/msword";
  if (declared && declared !== "application/octet-stream") return declared;
  return "application/octet-stream";
}

function isTextMime(mime: string, name: string) {
  return (
    mime.startsWith("text/") ||
    /\.(txt|md)$/i.test(name)
  );
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

async function callGemini(
  apiKey: string,
  model: string,
  parts: { text?: string; inlineData?: { mimeType: string; data: string } }[]
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2500,
      },
    }),
  });
  const raw = await res.text();
  let data: {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    error?: { message?: string };
  } = {};
  try {
    data = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, raw: raw.slice(0, 600), data };
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

    if (!rateLimit(`autofill:${user.id}`)) {
      return NextResponse.json({ error: "Too many uploads. Wait a minute." }, { status: 429 });
    }

    const form = await req.formData();
    const entry = form.get("file");
    // Next/Node may give File or Blob
    if (!entry || typeof entry === "string") {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    const blob = entry as Blob;
    const fileName =
      typeof (entry as File).name === "string" && (entry as File).name
        ? (entry as File).name
        : "upload.bin";

    if (blob.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "File under 4MB" }, { status: 400 });
    }
    if (blob.size < 20) {
      return NextResponse.json({ error: "File looks empty" }, { status: 400 });
    }

    const buf = Buffer.from(await blob.arrayBuffer());
    const mime = detectMime(fileName, blob.type || "");

    const allowed =
      isTextMime(mime, fileName) ||
      mime === "application/pdf" ||
      mime.includes("word") ||
      mime.includes("document") ||
      /\.(pdf|doc|docx|txt|md)$/i.test(fileName);

    if (!allowed) {
      return NextResponse.json(
        { error: "Use PDF, TXT, MD, DOC or DOCX" },
        { status: 400 }
      );
    }

    let text = "";
    if (isTextMime(mime, fileName)) {
      text = buf.toString("utf8").slice(0, 50000);
      // strip nulls from binary mislabeled as text
      if (text.includes("\u0000")) text = "";
    }

    const prompt = `You extract structured profile data for Pow3Folio (Web3 proof of work portfolio).
Return ONLY a JSON object (no markdown fences) with any of these keys you can infer:
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
  "location_country": string,
  "location_region": string
}
Max 8 skills, max 5 work entries. Prefer concrete facts from the document. Omit unknown keys.
${text ? "\nDocument text:\n" + text : "\nThe document is attached. Read it and extract the fields."}`;

    const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [
      { text: prompt },
    ];

    // Attach binary for PDF (and try DOC/DOCX if Gemini accepts)
    if (!text) {
      let attachMime = mime;
      if (/\.pdf$/i.test(fileName) || mime === "application/pdf") {
        attachMime = "application/pdf";
      }
      parts.push({
        inlineData: {
          mimeType: attachMime,
          data: buf.toString("base64"),
        },
      });
    }

    const preferred = (process.env.GEMINI_MODEL || "").trim();
    const models = preferred
      ? [preferred, ...MODELS.filter((m) => m !== preferred)]
      : MODELS;

    let lastErr = "";
    for (const model of models) {
      const result = await callGemini(apiKey, model, parts);
      if (!result.ok) {
        lastErr = result.data.error?.message || result.raw || `HTTP ${result.status}`;
        console.error("autofill model fail", model, result.status, lastErr.slice(0, 200));
        // try next model on 404/400
        if (result.status === 429) {
          return NextResponse.json(
            { error: "AI rate limit. Wait a minute and try again." },
            { status: 429 }
          );
        }
        continue;
      }

      const outText =
        result.data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
        "";
      if (!outText.trim()) {
        lastErr = "Empty model reply";
        continue;
      }

      const profile = extractJson(outText);
      if (!profile || typeof profile !== "object") {
        lastErr = "Could not parse JSON from model";
        continue;
      }

      if (Array.isArray(profile.skills)) profile.skills = profile.skills.slice(0, 8);
      if (Array.isArray(profile.work_experience))
        profile.work_experience = profile.work_experience.slice(0, 5);
      if (typeof profile.bio === "string") profile.bio = profile.bio.slice(0, 160);

      return NextResponse.json({ profile, model });
    }

    // If PDF/binary failed, surface a clear message
    return NextResponse.json(
      {
        error:
          lastErr.includes("inline") || lastErr.includes("mime") || lastErr.includes("Unsupported")
            ? "This file type failed with Gemini. Export your CV as PDF or plain TXT and try again."
            : "Could not read document. Try PDF or TXT under 4MB.",
        detail: lastErr.slice(0, 180),
      },
      { status: 502 }
    );
  } catch (e) {
    console.error("autofill", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
