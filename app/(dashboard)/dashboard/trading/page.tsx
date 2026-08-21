import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TradeManager from "@/components/trading/TradeManager";
import TradingPlatformsManager from "@/components/trading/TradingPlatformsManager";
import BrandMark from "@/components/ui/BrandMark";
import type { Trade, TradingPlatform } from "@/types/database";

export default async function TradingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: items } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("trading_platforms")
    .eq("id", user.id)
    .single();

  const platforms = (profile?.trading_platforms as TradingPlatform[]) ?? [];

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

      <main className="container-app max-w-3xl py-10 space-y-6">
        <div className="mb-2">
          <h1 className="text-2xl font-bold tracking-tight">Trading Record</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Wins, losses, charts and analysis. Your verifiable trading PoW.
          </p>
        </div>

        <div className="card">
          <TradingPlatformsManager userId={user.id} initial={platforms} />
        </div>

        <div className="card">
          <TradeManager userId={user.id} initialItems={(items as Trade[]) ?? []} />
        </div>
      </main>
    </div>
  );
}
