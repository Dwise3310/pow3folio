"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Provider } from "@supabase/supabase-js";

async function attachPendingWallet(userId: string) {
  try {
    const pending = localStorage.getItem("pow3folio_pending_wallet");
    if (!pending) return;
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ wallet_address: pending.toLowerCase() })
      .eq("id", userId);
    localStorage.removeItem("pow3folio_pending_wallet");
  } catch {
    /* ignore */
  }
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12S6.9 21.2 12 21.2c5.2 0 8.6-3.6 8.6-8.7 0-.6-.1-1-.2-1.5H12z" />
      <path fill="#34A853" d="M3.9 7.3l3 2.2C7.7 7.4 9.7 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.6 2.8 12 2.8 8.5 2.8 5.5 4.8 3.9 7.3z" />
      <path fill="#4A90E2" d="M12 21.2c2.5 0 4.6-.8 6.1-2.2l-2.9-2.3c-.8.6-1.9 1-3.2 1-2.5 0-4.6-1.7-5.3-4l-3 2.3c1.6 3.1 4.8 5.2 8.3 5.2z" />
      <path fill="#FBBC05" d="M6.7 13.7c-.2-.6-.3-1.2-.3-1.7s.1-1.2.3-1.7l-3-2.3C3.2 9.2 2.8 10.5 2.8 12s.4 2.8 1.1 4l2.8-2.3z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.2 0 4.7-2.9 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

const OAUTH_BUTTONS: {
  id: string;
  provider: Provider;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "google", provider: "google", label: "Continue with Google", icon: <GoogleIcon /> },
  { id: "twitter", provider: "twitter", label: "Continue with X", icon: <XIcon /> },
  { id: "github", provider: "github", label: "Continue with GitHub", icon: <GitHubIcon /> },
];

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled && user) {
        await attachPendingWallet(user.id);
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.user) {
      await attachPendingWallet(data.user.id);
    }

    router.replace("/dashboard");
    router.refresh();
  }

  async function signInWithProvider(provider: Provider, id: string) {
    setError(null);
    setOauthLoading(id);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(
        error.message +
          (error.message.toLowerCase().includes("provider")
            ? " Enable this provider in Supabase → Authentication → Providers and paste Client ID/Secret."
            : "")
      );
      setOauthLoading(null);
    }
  }

  async function connectWallet() {
    setError(null);
    setOauthLoading("wallet");
    try {
      const eth = (
        window as unknown as {
          ethereum?: {
            request: (args: { method: string; params?: unknown[] }) => Promise<string[]>;
          };
        }
      ).ethereum;

      if (!eth) {
        setError("No Web3 wallet found. Install MetaMask or another ETH wallet.");
        setOauthLoading(null);
        return;
      }

      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const address = accounts?.[0];
      if (!address) {
        setError("Wallet connection cancelled.");
        setOauthLoading(null);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("profiles")
          .update({ wallet_address: address.toLowerCase() })
          .eq("id", user.id);
        router.replace("/dashboard");
        router.refresh();
      } else {
        try {
          localStorage.setItem("pow3folio_pending_wallet", address.toLowerCase());
        } catch {
          /* ignore */
        }
        setError(
          `Wallet ${address.slice(0, 6)}…${address.slice(
            -4
          )} saved. Sign in with Email, Google, X or GitHub — wallet will be linked automatically.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed");
    }
    setOauthLoading(null);
  }

  if (checking) {
    return (
      <div className="card py-10 text-center text-sm text-foreground-muted">
        Checking session…
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-2">
        {OAUTH_BUTTONS.map((btn) => (
          <button
            key={btn.id}
            type="button"
            disabled={!!oauthLoading}
            onClick={() => signInWithProvider(btn.provider, btn.id)}
            className="btn-secondary flex w-full items-center justify-center gap-2.5 text-sm"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">{btn.icon}</span>
            {oauthLoading === btn.id ? "Redirecting…" : btn.label}
          </button>
        ))}
        <button
          type="button"
          disabled={!!oauthLoading}
          onClick={connectWallet}
          className="btn-secondary flex w-full items-center justify-center gap-2.5 text-sm"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            <WalletIcon />
          </span>
          {oauthLoading === "wallet" ? "Connecting…" : "Connect ETH Wallet"}
        </button>
      </div>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-2 text-foreground-subtle">or email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-11"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-foreground-subtle hover:bg-surface-hover hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-foreground-muted">
        Don't have an account?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
