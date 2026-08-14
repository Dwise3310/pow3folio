import Link from "next/link";

type Props = {
  isOwner?: boolean;
};

export default function PublicProfileCta({ isOwner }: Props) {
  return (
    <div className="mt-10 mb-6 rounded-xl border border-border bg-surface/80 px-4 py-5 text-center">
      <p className="text-sm text-foreground-muted leading-relaxed">
        This profile was built on{" "}
        <span className="font-semibold text-foreground">
          Pow<span className="text-primary">3</span>Folio
        </span>
        . Create your own public proof of work portfolio for Web3.
      </p>
      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
        {isOwner ? (
          <Link href="/dashboard" className="btn-primary text-xs px-4 py-2">
            Open dashboard
          </Link>
        ) : (
          <>
            <Link href="/signup" className="btn-primary text-xs px-4 py-2">
              Create your profile
            </Link>
            <Link href="/login" className="btn-secondary text-xs px-4 py-2">
              Log in
            </Link>
          </>
        )}
        <Link href="/talents" className="btn-ghost text-xs px-3 py-2">
          View talents
        </Link>
      </div>
    </div>
  );
}
