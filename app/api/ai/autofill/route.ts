import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const buckets = new Map<string, { count: number; reset: number }>();

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

export async function POST(req: NextRequest) {
  try {
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
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
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "File under 4MB" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "application/octet-stream";
    let text = "";

    if (mime.startsWith("text/") || /\.(txt|md)$/i.test(file.name)) {
      text = buf.toString("utf8").slice(0, 40000);
    } else {
      // PDF/DOC: send as inline data for multimodal models
      text = "";
    }

    if (!text && !mime.includes("pdf") && !mime.includes("word") && !mime.includes("document")) {
      // try utf8 anyway
      text = buf.toString("utf8").slice(0, 40000);
      if (!text.replace(/\s/g, "").length) {
        return NextResponse.json(
          { error: "Could not read this file type. Try TXT, MD or PDF." },
          { status: 400 }
        );
      }
    }

    const prompt = `You extract structured profile data for Pow3Folio, a Web3 proof of work portfolio.
Return ONLY valid JSON (no markdown) with optional keys:
{
  "display_name": string,
  "bio": string (max 160 chars, no URLs),
  "long_bio": string,
  "skills": [{"name": string, "description": string max 85 chars}],
  "work_experience": [{"company": string, "role": string, "description": string, "url": string, "employment_type": "full-time"|"part-time", "start_date": "YYYY-MM", "end_date": "YYYY-MM"|null}],
  "education": [{"institution": string, "degree": string, "field_of_study": string, "country": string, "start_year": string, "end_year": string}],
  "website_url": string,
  "github_url": string,
  "x_url": string,
  "location_country": string,
  "location_region": string
}
Max 8 skills, max 5 work entries. Prefer Web3 relevant content. If unknown, omit key.
${text ? "\nDocument text:\n" + text : ""}`;

    const model = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
    const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [
      { text: prompt },
    ];
    if (!text || mime.includes("pdf") || mime.includes("word") || mime.includes("document")) {
      parts.push({
        inlineData: {
          mimeType: mime.includes("pdf") ? "application/pdf" : mime,
          data: buf.toString("base64"),
        },
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2000,
          responseMimeType: "application/json",
        },
      }),
    });

    const raw = await res.text();
    if (!res.ok) {
      console.error("autofill gemini", res.status, raw.slice(0, 400));
      return NextResponse.json(
        { error: "Could not parse document. Try a TXT export of your CV." },
        { status: 502 }
      );
    }

    let data: { candidates?: { content?: { parts?: { text?: string }[] } }[] } = {};
    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Bad AI response" }, { status: 502 });
    }

    const outText =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    let profile: Record<string, unknown> = {};
    try {
      const cleaned = outText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      profile = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Could not structure profile data" }, { status: 502 });
    }

    // Hard caps
    if (Array.isArray(profile.skills)) profile.skills = profile.skills.slice(0, 8);
    if (Array.isArray(profile.work_experience))
      profile.work_experience = profile.work_experience.slice(0, 5);
    if (typeof profile.bio === "string") profile.bio = profile.bio.slice(0, 160);

    return NextResponse.json({ profile });
  } catch (e) {
    console.error("autofill", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
