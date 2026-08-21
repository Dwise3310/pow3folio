import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/profile/ProfileForm";
import CredentialsManager from "@/components/profile/CredentialsManager";
import ProfileExtrasManager from "@/components/profile/ProfileExtrasManager";
import DeleteAccount from "@/components/profile/DeleteAccount";
import BrandMark from "@/components/ui/BrandMark";
import type { Profile, Credential, WorkExperience, Education } from "@/types/database";

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (error || !profile) {
    return (
      <div className="container-app py-10">
        <p className="text-danger">Profile not found. Contact support or re-run backfill.</p>
        <Link href="/dashboard" className="btn-secondary mt-4 inline-flex">Back</Link>
      </div>
    );
  }

  const { data: credentials } = await supabase
    .from("credentials")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const identities = (user.identities ?? []).map((i) => i.provider);
  const work = (profile.work_experience as WorkExperience[]) ?? [];
  const education = (profile.education as Education[]) ?? [];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="border-b border-border">
        <div className="container-app flex h-14 items-center justify-between gap-2">
          <BrandMark />
          <Link href="/dashboard" className="btn-ghost text-xs sm:text-sm shrink-0">← Dashboard</Link>
        </div>
      </header>
      <main className="container-app max-w-2xl py-6 sm:py-8 space-y-5 sm:space-y-6 px-3 sm:px-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Edit profile</h1>
          <p className="mt-1 text-sm text-foreground-muted break-words">
            Powers your public page at <span className="text-primary">/{profile.username}</span>
          </p>
          <Link href="/dashboard/resume" className="btn-secondary mt-3 inline-flex text-xs">
            Download CV / PDF
          </Link>
        </div>
        <section className="card overflow-hidden space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle px-1">Identity & autofill</h2>
          <ProfileForm profile={profile as Profile} email={user.email ?? null} linkedProviders={identities} />
        </section>
        <section className="card overflow-hidden">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-subtle">Work experience & education</h2>
          <ProfileExtrasManager userId={user.id} initialWork={work} initialEducation={education} />
        </section>
        <section className="card overflow-hidden">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-subtle">Docs & credentials</h2>
          <CredentialsManager userId={user.id} initialItems={(credentials as Credential[]) ?? []} />
        </section>
        <p className="text-center text-sm text-foreground-muted">
          <Link href={`/${profile.username}`} className="text-primary hover:underline" target="_blank">
            View public profile →
          </Link>
        </p>
        <DeleteAccount email={user.email ?? null} />
      </main>
    </div>
  );
}
