import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/profile/ProfileForm";
import CredentialsManager from "@/components/profile/CredentialsManager";
import type { Profile, Credential } from "@/types/database";

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

  const { data: credentials } = await supabase
    .from("credentials")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const identities = (user.identities ?? []).map((i) => i.provider);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="border-b border-border">
        <div className="container-app flex h-14 items-center justify-between gap-2">
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <span className="text-xs font-bold">P3</span>
            </div>
            <span className="font-semibold truncate">
              Pow<span className="text-primary">3</span>Folio
            </span>
          </Link>
          <Link href="/dashboard" className="btn-ghost text-xs sm:text-sm shrink-0">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="container-app max-w-2xl py-6 sm:py-10 space-y-6 sm:space-y-8 px-3 sm:px-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Edit profile</h1>
          <p className="mt-1 text-sm text-foreground-muted break-words">
            This powers your public page at{" "}
            <span className="text-primary">/{profile.username}</span>
          </p>
        </div>

        <div className="card overflow-hidden">
          <ProfileForm
            profile={profile as Profile}
            email={user.email ?? null}
            linkedProviders={identities}
          />
        </div>

        <div className="card overflow-hidden">
          <CredentialsManager
            userId={user.id}
            initialItems={(credentials as Credential[]) ?? []}
          />
        </div>

        <p className="text-center text-sm text-foreground-muted">
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
