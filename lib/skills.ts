import type { Skill } from "@/types/database";

function parseMaybeJsonSkill(value: unknown): Skill | null {
  if (!value) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("{") && /["']name["']/.test(trimmed)) {
      try {
        return parseMaybeJsonSkill(JSON.parse(trimmed));
      } catch {
        return { name: trimmed.slice(0, 60), description: "" };
      }
    }
    return { name: trimmed.slice(0, 60), description: "" };
  }

  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const name = String(rec.name ?? "").trim();
    if (!name || name.startsWith("{")) {
      if (typeof rec.name === "string" && rec.name.trim().startsWith("{")) {
        return parseMaybeJsonSkill(rec.name);
      }
      return null;
    }
    return {
      name: name.slice(0, 60),
      description: String(rec.description ?? "").trim().slice(0, 250),
    };
  }

  return null;
}

export function normalizeSkills(raw: unknown): Skill[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const out: Skill[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const skill = parseMaybeJsonSkill(item);
    if (!skill?.name) continue;
    const key = skill.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
  }
  return out;
}

export function cleanPlainText(input: string | null | undefined, max = 600): string {
  if (!input) return "";
  let s = String(input);
  s = s.replace(/orbdisc:[A-Za-z0-9+/=]+/gi, " ");
  s = s.replace(/0x[a-fA-F0-9]{20,}/g, " ");
  s = s.replace(/https?:\/\/\S+/g, (url) => url);
  s = s.replace(/[\u{1D400}-\u{1D7FF}]/gu, "");
  s = s.replace(/[{}\[\]"]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > max) s = `${s.slice(0, max).trim()}…`;
  return s;
}
