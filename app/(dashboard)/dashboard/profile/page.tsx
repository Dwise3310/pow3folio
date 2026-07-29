import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/profile/ProfileForm";
import type { Profile } from "@/types/database";

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return (
      <div className="container-app py-10">
        <p className="text-danger">Profile not found. Contact support or re-run backfill.</p>
        <Link href="/dashboard" className="btn-secondary mt-4 inline-flex">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="container-app flex h-14 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
              <span className="text-xs font-bold">P3</span>
            </div>
            <span className="font-semibold">
              Pow<span className="text-primary">3</span>Folio
            </span>
          </Link>
          <Link href="/dashboard" className="btn-ghost text-sm">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="container-app max-w-2xl py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Edit profile</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            This powers your public page at{" "}
            <span className="text-primary">/{profile.username}</span>
          </p>
        </div>

        <div className="card">
          <ProfileForm profile={profile as Profile} />
        </div>

        <p className="mt-6 text-center text-sm text-foreground-muted">
          <Link
            href={`/${profile.username}`}
            className="text-primary hover:underline"
            target="_blank"
          >
            View public profile →
          </Link>
        </p>
      </main>
    </div>
  );
}
