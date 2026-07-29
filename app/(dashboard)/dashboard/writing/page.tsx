import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import WritingManager from "@/components/writing/WritingManager";
import type { Writing } from "@/types/database";

export default async function WritingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: items } = await supabase
    .from("writings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

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
          <h1 className="text-2xl font-bold tracking-tight">Writing</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Articles, threads, Mirror posts, research — anything you write.
          </p>
        </div>

        <WritingManager
          userId={user.id}
          initialItems={(items as Writing[]) ?? []}
        />
      </main>
    </div>
  );
}
