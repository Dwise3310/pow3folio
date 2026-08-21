import type { Credential } from "@/types/database";

export const DOC_KINDS = [
  "CV",
  "Resume",
  "Certificate",
  "Transcript",
  "Award",
  "License",
  "Portfolio",
  "Other",
] as const;

export type DocKind = (typeof DOC_KINDS)[number];

export function encodeFileType(kind: string, mime: string | null) {
  const tag = kind.trim() || "Document";
  const rest = (mime || "").trim();
  if (!rest) return tag;
  if (rest.startsWith(`${tag}|`)) return rest;
  return `${tag}|${rest}`;
}

export function credentialKind(doc: Pick<Credential, "kind" | "file_type" | "title" | "file_name">): string {
  if (doc.kind?.trim()) return doc.kind.trim();
  const stored = (doc.file_type || "").split("|")[0];
  if ((DOC_KINDS as readonly string[]).includes(stored)) return stored;
  const hay = `${doc.title || ""} ${doc.file_name || ""}`.toLowerCase();
  if (/\bcv\b|curriculum/.test(hay)) return "CV";
  if (/resume/.test(hay)) return "Resume";
  if (/certif/.test(hay)) return "Certificate";
  if (/transcript/.test(hay)) return "Transcript";
  if (/award|badge/.test(hay)) return "Award";
  if (/licen[cs]e/.test(hay)) return "License";
  if (/portfolio/.test(hay)) return "Portfolio";
  return "Document";
}
