import Link from "next/link";

export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 min-w-0 group">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary transition group-hover:bg-primary/25">
        <span className="text-xs font-bold">P3</span>
      </div>
      <span className={`font-semibold truncate ${compact ? "text-sm sm:text-base" : ""}`}>
        Pow<span className="text-primary">3</span>Folio
      </span>
    </Link>
  );
}
