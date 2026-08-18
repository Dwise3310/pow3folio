"use client";

type Props = {
  username: string;
};

export default function ResumeDownload({ username }: Props) {
  return (
    <a
      href={`/${username}/resume`}
      className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-xs font-medium transition-all hover:border-primary/40 hover:text-primary"
    >
      Download CV
    </a>
  );
}
