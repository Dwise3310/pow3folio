import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AirdropManager from "@/components/airdrops/AirdropManager";
import BrandMark from "@/components/ui/BrandMark";
import type { Airdrop } from "@/types/database";

export default async function AirdropsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: items } = await supabase
    .from("airdrops")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="container-app flex h-14 items-center justify-between">
          <BrandMark />
          <Link href="/dashboard" className="btn-ghost text-sm">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="container-app max-w-3xl py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Airdrops</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Campaigns you farmed, qualified for, or claimed. Proof of the hunt.
          </p>
        </div>
        <div className="card">
          <AirdropManager userId={user.id} initialItems={(items as Airdrop[]) ?? []} />
        </div>
      </main>
    </div>
  );
}
