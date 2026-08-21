"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { connectEthereumWallet } from "@/lib/wallet";
import type { ExtraWallet } from "@/types/database";

export default function ExtraWallets({
  profileId,
  initial,
}: {
  profileId: string;
  initial: ExtraWallet[];
}) {
  const router = useRouter();
  const [wallets, setWallets] = useState(initial);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(next: ExtraWallet[]) {
    const supabase = createClient();
    const { error: err } = await supabase.from("profiles").update({ extra_wallets: next }).eq("id", profileId);
    if (err) {
      setError(
        err.message.includes("column") || err.code === "42703"
          ? "Run supabase/extra_wallets.sql in Supabase first."
          : err.message
      );
      return false;
    }
    setWallets(next);
    router.refresh();
    return true;
  }

  async function addWallet() {
    setBusy(true);
    setError(null);
    try {
      const address = await connectEthereumWallet();
      if (wallets.some((w) => w.address.toLowerCase() === address)) {
        setError("That wallet is already added.");
        setBusy(false);
        return;
      }
      await persist([...wallets, { address, label: label.trim() || `Wallet ${wallets.length + 2}` }]);
      setLabel("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect wallet");
    }
    setBusy(false);
  }

  async function removeWallet(address: string) {
    await persist(wallets.filter((w) => w.address !== address));
  }

  return (
    <div className="card space-y-2 p-3 mb-6">
      <h3 className="section-heading">More wallets</h3>
      <p className="text-[11px] text-foreground-subtle">
        Connect another wallet and give it a name. Public Onchain Stats will show mini tabs for each one.
      </p>
      {wallets.map((w) => (
        <div key={w.address} className="flex items-center justify-between gap-2 text-xs">
          <span className="min-w-0 truncate">
            <span className="font-medium">{w.label}</span>{" "}
            <span className="font-mono text-foreground-subtle">{w.address.slice(0, 6)}...{w.address.slice(-4)}</span>
          </span>
          <button type="button" className="btn-ghost text-danger text-[11px]" onClick={() => removeWallet(w.address)}>
            Remove
          </button>
        </div>
      ))}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className="input text-sm" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Name this wallet" />
        <button type="button" className="btn-secondary text-xs shrink-0" disabled={busy} onClick={addWallet}>
          {busy ? "Connecting…" : "Connect & add"}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
