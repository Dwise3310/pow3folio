import Link from "next/link";

type Props = {
  isOwner?: boolean;
};

export default function PublicProfileCta({ isOwner }: Props) {
  return (
    <p className="mt-10 mb-4 text-center text-xs text-foreground-subtle leading-relaxed">
      Built with{" "}
      <Link href="/" className="text-foreground-muted hover:text-primary transition-colors">
        Pow3Folio
      </Link>
      {" · "}
      {isOwner ? (
        <Link href="/dashboard" className="text-foreground-muted hover:text-primary transition-colors">
          Open dashboard
        </Link>
      ) : (
        <>
          <Link href="/signup" className="text-foreground-muted hover:text-primary transition-colors">
            Create your profile
          </Link>
          {" · "}
          <Link href="/login" className="text-foreground-muted hover:text-primary transition-colors">
            Log in
          </Link>
        </>
      )}
      {" · "}
      <Link href="/talents" className="text-foreground-muted hover:text-primary transition-colors">
        View talents
      </Link>
    </p>
  );
}
