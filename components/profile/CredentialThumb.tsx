"use client";

import type { Credential } from "@/types/database";

function isImageFile(doc: Credential) {
  const t = (doc.file_type || "").toLowerCase();
  const n = (doc.file_name || "").toLowerCase();
  const u = (doc.file_url || "").toLowerCase();
  return (
    t.includes("image") ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(n) ||
    /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)
  );
}

function isPdf(doc: Credential) {
  const t = (doc.file_type || "").toLowerCase();
  const n = (doc.file_name || "").toLowerCase();
  const u = (doc.file_url || "").toLowerCase();
  return t.includes("pdf") || n.endsWith(".pdf") || u.includes(".pdf");
}

export default function CredentialThumb({
  doc,
  className = "",
}: {
  doc: Credential;
  className?: string;
}) {
  const img = isImageFile(doc);
  const pdf = isPdf(doc);

  return (
    <div className={`relative overflow-hidden bg-surface-elevated ${className}`}>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={doc.file_url} alt={doc.title} className="h-full w-full object-cover" />
      ) : pdf ? (
        <>
          <iframe
            src={`${doc.file_url}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
            title={doc.title}
            className="pointer-events-none absolute inset-0 h-[170%] w-full origin-top scale-[1.02] border-0 bg-white"
            loading="lazy"
          />
          <div className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">
            PDF
          </div>
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-foreground-subtle">
          <span className="text-xs font-semibold uppercase">
            {(doc.file_name || "DOC").split(".").pop()?.slice(0, 4) || "DOC"}
          </span>
          <span className="text-[10px]">Tap to open</span>
        </div>
      )}
    </div>
  );
}
