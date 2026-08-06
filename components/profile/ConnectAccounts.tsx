"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { connectEthereumWallet } from "@/lib/wallet";
import { startXAuth } from "@/lib/x-oauth";
import type { Provider } from "@supabase/supabase-js";

type Props = {
  profileId: string;
  email: string | null;
  linkedProviders: string[];
  xUrl: string;
  githubUrl: string;
  websiteUrl: string;
  telegramUrl: string;
  ensName: string;
  walletAddress: string;
  secondaryEmail: string;
  showPrimaryEmail: boolean;
  showSecondaryEmail: boolean;
  onChange: (key: string, value: string | boolean) => void;
};

function Feedback({ text, tone }: { text: string | null; tone: "ok" | "err" }) {
  if (!text) return null;
  const cls =
    tone === "ok"
      ? "border-primary/30 bg-primary/10 text-primary"
      : "border-danger/30 bg-danger/10 text-danger";
  return (
    <div className={`mt-2 rounded-md border px-2.5 py-1.5 text-xs animate-fade-in ${cls}`}>
      {text}
    </div>
  );
}

function PublicToggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
        on
          ? "bg-primary/15 text-primary border border-primary/30"
          : "bg-surface-elevated text-foreground-subtle border border-border"
      }`}
    >
      {on ? "ON" : "OFF"}
    </button>
  );
}

export default function ConnectAccounts({
  profileId,
  email,
  linkedProviders,
  xUrl,
  githubUrl,
  websiteUrl,
  telegramUrl,
  ensName,
  walletAddress,
  secondaryEmail,
  showPrimaryEmail,
  showSecondaryEmail,
  onChange,
}: Props) {
  const router = useRouter();
  const [linking, setLinking] = useState<string | null>(null);
  const [showSecondEmail, setShowSecondEmail] = useState(!!secondaryEmail);
  const [xMsg, setXMsg] = useState<string | null>(null);
  const [xErr, setXErr] = useState<string | null>(null);
  const [ghMsg, setGhMsg] = useState<string | null>(null);
  const [ghErr, setGhErr] = useState<string | null>(null);
  const [googleMsg, setGoogleMsg] = useState<string | null>(null);
  const [googleErr, setGoogleErr] = useState<string | null>(null);
  const [walletMsg, setWalletMsg] = useState<string | null>(null);
  const [walletErr, setWalletErr] = useState<string | null>(null);

  const hasX =
    linkedProviders.includes("twitter") ||
    linkedProviders.includes("x") ||
    !!xUrl;
  const hasGitHub = linkedProviders.includes("github") || !!githubUrl;
  const hasGoogle = linkedProviders.includes("google");

  function explainLinkError(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("manual linking is disabled")) {
      return "Manual linking is disabled in Supabase. Enable it under Authentication → Sign In / Providers.";
    }
    if (lower.includes("already") || lower.includes("identity")) {
      return raw + " Unlink it from the other account first if needed.";
    }
    return raw;
  }

  async function linkProvider(provider: Provider, id: "twitter" | "github" | "google") {
    setLinking(id);
    if (id === "twitter") {
      setXErr(null);
      setXMsg(null);
    } else if (id === "github") {
      setGhErr(null);
      setGhMsg(null);
    } else {
      setGoogleErr(null);
      setGoogleMsg(null);
    }
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard/profile`;
    if (id === "twitter") {
      const { error } = await startXAuth(supabase, "link", redirectTo);
      if (error) {
        setXErr(explainLinkError(error));
        setLinking(null);
        return;
      }
      setXMsg("Redirecting to X…");
      return;
    }
    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) {
      const msg = explainLinkError(error.message);
      if (id === "github") setGhErr(msg);
      else setGoogleErr(msg);
      setLinking(null);
      return;
    }
    if (data?.url) {
      if (id === "github") setGhMsg("Redirecting to GitHub…");
      else setGoogleMsg("Redirecting to Google…");
      window.location.assign(data.url);
      return;
    }
    const fail = "No OAuth URL returned. Check provider is enabled in Supabase.";
    if (id === "github") setGhErr(fail);
    else setGoogleErr(fail);
    setLinking(null);
  }

  async function disconnectProvider(provider: "twitter" | "github" | "google") {
    setLinking(`unlink-${provider}`);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const identity = user?.identities?.find((i) =>
      provider === "twitter"
        ? i.provider === "twitter" || i.provider === "x"
        : i.provider === provider
    );
    if (identity) {
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) {
        const msg = explainLinkError(error.message);
        if (provider === "twitter") setXErr(msg);
        else if (provider === "github") setGhErr(msg);
        else setGoogleErr(msg);
        setLinking(null);
        return;
      }
    }
    if (provider === "twitter") {
      await supabase.from("profiles").update({ x_url: null }).eq("id", profileId);
      onChange("x_url", "");
      setXMsg("X disconnected");
    } else if (provider === "github") {
      await supabase.from("profiles").update({ github_url: null }).eq("id", profileId);
      onChange("github_url", "");
      setGhMsg("GitHub disconnected");
    } else {
      setGoogleMsg("Google disconnected");
    }
    setLinking(null);
    router.refresh();
  }

  async function disconnectWallet() {
    setLinking("unlink-wallet");
    setWalletErr(null);
    setWalletMsg(null);
    const supabase = createClient();
    await supabase.from("profiles").update({ wallet_address: null }).eq("id", profileId);
    onChange("wallet_address", "");
    setWalletMsg("Wallet disconnected");
    setLinking(null);
    router.refresh();
  }

  async function connectWallet() {
    setWalletErr(null);
    setWalletMsg(null);
    setLinking("wallet");
    try {
      const address = await connectEthereumWallet();
      onChange("wallet_address", address);
      const supabase = createClient();
      await supabase.from("profiles").update({ wallet_address: address }).eq("id", profileId);
      setWalletMsg("Wallet connected");
      router.refresh();
    } catch (err) {
      setWalletErr(err instanceof Error ? err.message : "Wallet connection failed");
    }
    setLinking(null);
  }

  return (
    <div className="border-t border-border pt-5 space-y-3">
      <h3 className="font-medium text-sm">Contact & connected accounts</h3>
      <p className="text-xs text-foreground-subtle">
        Use <strong>ON/OFF</strong> to show an email on your public profile.
      </p>

      <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm min-w-0">
            <span className="text-foreground-subtle">Email 1 (login): </span>
            <span className="font-medium break-all">{email || "—"}</span>
          </div>
          <PublicToggle
            on={showPrimaryEmail}
            disabled={!email}
            onChange={(v) => onChange("show_primary_email", v)}
          />
        </div>

        {!showSecondEmail ? (
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => setShowSecondEmail(true)}
          >
            + Add second email
          </button>
        ) : (
          <div className="space-y-2 border-t border-border pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="label mb-0" htmlFor="secondary_email">
                Email 2
              </label>
              <PublicToggle
                on={showSecondaryEmail}
                disabled={!secondaryEmail.trim()}
                onChange={(v) => onChange("show_secondary_email", v)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                id="secondary_email"
                type="email"
                className="input text-sm flex-1 min-w-0"
                value={secondaryEmail}
                onChange={(e) => onChange("secondary_email", e.target.value)}
                placeholder="second@email.com"
              />
              <button
                type="button"
                className="btn-ghost text-xs text-danger"
                onClick={() => {
                  onChange("secondary_email", "");
                  onChange("show_secondary_email", false);
                  setShowSecondEmail(false);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">X</p>
              {hasX && xUrl ? (
                <p className="mt-0.5 break-all text-xs text-foreground-muted">{xUrl}</p>
              ) : (
                <p className="mt-0.5 text-xs text-foreground-subtle">Not connected</p>
              )}
              {hasX && <p className="mt-1 text-xs font-medium text-success">Connected</p>}
            </div>
            {hasX ? (
              <button
                type="button"
                disabled={!!linking}
                onClick={() => disconnectProvider("twitter")}
                className="btn-ghost text-xs text-danger shrink-0"
              >
                {linking === "unlink-twitter" ? "…" : "Disconnect"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!!linking}
                onClick={() => linkProvider("twitter", "twitter")}
                className="btn-secondary text-xs shrink-0"
              >
                {linking === "twitter" ? "…" : "Connect X"}
              </button>
            )}
          </div>
          <Feedback text={xMsg} tone="ok" />
          <Feedback text={xErr} tone="err" />
        </div>

        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">GitHub</p>
              {hasGitHub && githubUrl ? (
                <p className="mt-0.5 break-all text-xs text-foreground-muted">{githubUrl}</p>
              ) : (
                <p className="mt-0.5 text-xs text-foreground-subtle">Not connected</p>
              )}
              {hasGitHub && <p className="mt-1 text-xs font-medium text-success">Connected</p>}
            </div>
            {hasGitHub ? (
              <button
                type="button"
                disabled={!!linking}
                onClick={() => disconnectProvider("github")}
                className="btn-ghost text-xs text-danger shrink-0"
              >
                {linking === "unlink-github" ? "…" : "Disconnect"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!!linking}
                onClick={() => linkProvider("github", "github")}
                className="btn-secondary text-xs shrink-0"
              >
                {linking === "github" ? "…" : "Connect GitHub"}
              </button>
            )}
          </div>
          <Feedback text={ghMsg} tone="ok" />
          <Feedback text={ghErr} tone="err" />
        </div>

        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Google</p>
              <p className="mt-0.5 text-xs text-foreground-subtle">
                {hasGoogle ? "Used for login" : "Not connected"}
              </p>
              {hasGoogle && <p className="mt-1 text-xs font-medium text-success">Connected</p>}
            </div>
            {hasGoogle ? (
              <button
                type="button"
                disabled={!!linking}
                onClick={() => disconnectProvider("google")}
                className="btn-ghost text-xs text-danger shrink-0"
              >
                {linking === "unlink-google" ? "…" : "Disconnect"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!!linking}
                onClick={() => linkProvider("google", "google")}
                className="btn-secondary text-xs shrink-0"
              >
                {linking === "google" ? "…" : "Connect Google"}
              </button>
            )}
          </div>
          <Feedback text={googleMsg} tone="ok" />
          <Feedback text={googleErr} tone="err" />
        </div>

        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="min-w-0">
            <p className="text-sm font-medium">Wallet</p>
            {walletAddress ? (
              <p className="mt-0.5 break-all font-mono text-xs text-foreground-muted">
                {walletAddress}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-foreground-subtle">Not connected</p>
            )}
            {walletAddress && (
              <p className="mt-1 text-xs font-medium text-success">Connected</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {walletAddress ? (
              <>
                <button
                  type="button"
                  disabled={!!linking}
                  onClick={connectWallet}
                  className="btn-secondary text-xs"
                >
                  {linking === "wallet" ? "…" : "Change"}
                </button>
                <button
                  type="button"
                  disabled={!!linking}
                  onClick={disconnectWallet}
                  className="btn-ghost text-xs text-danger"
                >
                  {linking === "unlink-wallet" ? "…" : "Disconnect"}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={!!linking}
                onClick={connectWallet}
                className="btn-secondary text-xs"
              >
                {linking === "wallet" ? "…" : "Connect wallet"}
              </button>
            )}
          </div>
          <Feedback text={walletMsg} tone="ok" />
          <Feedback text={walletErr} tone="err" />
        </div>

        <div className="rounded-lg border border-border p-3 space-y-2">
          <span className="text-sm font-medium">My website</span>
          <input
            className="input text-xs"
            value={websiteUrl}
            onChange={(e) => onChange("website_url", e.target.value)}
            placeholder="https://yoursite.com"
          />
        </div>

        <div className="rounded-lg border border-border p-3 space-y-2">
          <span className="text-sm font-medium">Telegram</span>
          <input
            className="input text-xs"
            value={telegramUrl}
            onChange={(e) => onChange("telegram_url", e.target.value)}
            placeholder="https://t.me/username"
          />
        </div>

        <div className="rounded-lg border border-border p-3 space-y-2">
          <span className="text-sm font-medium">ENS</span>
          <input
            className="input text-xs"
            value={ensName}
            onChange={(e) => onChange("ens_name", e.target.value)}
            placeholder="name.eth"
          />
        </div>
      </div>
    </div>
  );
}
