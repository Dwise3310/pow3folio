"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import type { Provider } from "@supabase/supabase-js";

type Props = {
  profile: Profile;
  email: string | null;
  linkedProviders: string[];
};

const URL_IN_BIO =
  /(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+\.(?:com|io|xyz|net|org|app|dev|co|gg|me|link|bio|eth)\b/i;

export default function ProfileForm({ profile, email, linkedProviders }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    username: profile.username ?? "",
    display_name: profile.display_name ?? "",
    bio: profile.bio ?? "",
    long_bio: profile.long_bio ?? "",
    open_to_work: profile.open_to_work ?? false,
    wallet_address: profile.wallet_address ?? "",
    ens_name: profile.ens_name ?? "",
    x_url: profile.x_url ?? "",
    telegram_url: profile.telegram_url ?? "",
    github_url: profile.github_url ?? "",
    website_url: profile.website_url ?? "",
    is_public: profile.is_public ?? true,
  });
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [bannerUrl, setBannerUrl] = useState(profile.banner_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  const hasX = linkedProviders.includes("twitter") || !!form.x_url;
  const hasGitHub = linkedProviders.includes("github") || !!form.github_url;
  const bioHasLink = useMemo(() => URL_IN_BIO.test(form.bio), [form.bio]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadImage(
    file: File,
    kind: "avatar" | "banner"
  ): Promise<string | null> {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return null;
    }
    const max = kind === "banner" ? 4 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > max) {
      setError(kind === "banner" ? "Banner must be under 4MB" : "Avatar must be under 2MB");
      return null;
    }

    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${profile.id}/${kind}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    return publicUrl;
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const url = await uploadImage(file, "avatar");
    if (url) setAvatarUrl(url);
    setUploading(false);
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    setError(null);
    const url = await uploadImage(file, "banner");
    if (url) setBannerUrl(url);
    setUploadingBanner(false);
  }

  async function linkProvider(provider: Provider, id: string) {
    setLinking(id);
    setError(null);
    setWalletError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/profile`,
      },
    });
    if (error) {
      setError(error.message);
      setLinking(null);
    }
  }

  async function disconnectProvider(provider: "twitter" | "github") {
    setLinking(`unlink-${provider}`);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const identity = user?.identities?.find((i) => i.provider === provider);

    if (identity) {
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) {
        setError(error.message);
        setLinking(null);
        return;
      }
    }

    const clear =
      provider === "twitter"
        ? { x_url: null as string | null }
        : { github_url: null as string | null };

    await supabase.from("profiles").update(clear).eq("id", profile.id);

    if (provider === "twitter") update("x_url", "");
    else update("github_url", "");

    setMessage(provider === "twitter" ? "X disconnected" : "GitHub disconnected");
    setLinking(null);
    router.refresh();
  }

  async function disconnectWallet() {
    setLinking("unlink-wallet");
    setWalletError(null);
    const supabase = createClient();
    await supabase.from("profiles").update({ wallet_address: null }).eq("id", profile.id);
    update("wallet_address", "");
    setMessage("Wallet disconnected");
    setLinking(null);
    router.refresh();
  }

  async function connectWallet() {
    setWalletError(null);
    setError(null);
    setLinking("wallet");
    try {
      const eth = (
        window as unknown as {
          ethereum?: {
            request: (args: { method: string }) => Promise<string[]>;
            isMetaMask?: boolean;
          };
        }
      ).ethereum;

      if (!eth) {
        setWalletError(
          "No browser wallet detected. Install MetaMask, Rabby, or another ETH extension, then try again. (WalletConnect mobile flow coming next.)"
        );
        setLinking(null);
        return;
      }

      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const address = accounts?.[0];
      if (!address) {
        setWalletError("Wallet connection cancelled.");
        setLinking(null);
        return;
      }

      update("wallet_address", address.toLowerCase());
      const supabase = createClient();
      await supabase
        .from("profiles")
        .update({ wallet_address: address.toLowerCase() })
        .eq("id", profile.id);
      setMessage("Wallet connected");
      router.refresh();
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : "Wallet connection failed");
    }
    setLinking(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setWalletError(null);
    setMessage(null);

    if (bioHasLink) {
      setError("Remove the link from Short bio before saving.");
      setSaving(false);
      return;
    }

    const username = form.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      setError("Username must be 3–30 chars: lowercase letters, numbers, underscore only");
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username,
        display_name: form.display_name.trim() || null,
        bio: form.bio.trim() || null,
        long_bio: form.long_bio.trim() || null,
        open_to_work: form.open_to_work,
        wallet_address: form.wallet_address.trim() || null,
        ens_name: form.ens_name.trim() || null,
        x_url: form.x_url.trim() || null,
        telegram_url: form.telegram_url.trim() || null,
        github_url: form.github_url.trim() || null,
        website_url: form.website_url.trim() || null,
        is_public: form.is_public,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      })
      .eq("id", profile.id);

    setSaving(false);

    if (updateError) {
      if (updateError.code === "23505") {
        setError("That username is already taken");
      } else {
        setError(updateError.message);
      }
      return;
    }

    setMessage("Profile saved");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger animate-fade-in">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary animate-fade-in">
          {message}
        </div>
      )}

      <div>
        <label className="label">Profile header (banner)</label>
        <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
          <div className="relative h-28 sm:h-36 w-full">
            {bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerUrl} alt="Banner" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-r from-primary/20 via-surface-elevated to-accent/10 text-xs text-foreground-subtle">
                No banner yet
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="btn-secondary cursor-pointer text-sm">
            {uploadingBanner ? "Uploading…" : "Upload banner"}
            <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} disabled={uploadingBanner} />
          </label>
          {bannerUrl && (
            <button type="button" className="btn-ghost text-xs text-danger" onClick={() => setBannerUrl(null)}>
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-full border border-border bg-surface-elevated">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground-subtle text-sm">No photo</div>
          )}
        </div>
        <label className="btn-secondary cursor-pointer text-sm">
          {uploading ? "Uploading…" : "Change avatar"}
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="username">Username *</label>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-xs text-foreground-subtle shrink-0">pow3folio.vercel.app/</span>
            <input
              id="username"
              className="input"
              value={form.username}
              onChange={(e) => update("username", e.target.value.toLowerCase())}
              required
              minLength={3}
              maxLength={30}
              pattern="[a-z0-9_]{3,30}"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="display_name">Display name</label>
          <input id="display_name" className="input" value={form.display_name} onChange={(e) => update("display_name", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="bio">Short bio</label>
        <textarea
          id="bio"
          className={`input min-h-[96px] resize-y ${bioHasLink ? "border-danger focus:border-danger focus:ring-danger" : ""}`}
          value={form.bio}
          onChange={(e) => update("bio", e.target.value)}
          maxLength={160}
          placeholder="One-line intro — no links"
        />
        <div className="mt-1 flex items-start justify-between gap-2">
          <p className="text-xs text-foreground-subtle">{form.bio.length}/160</p>
        </div>
        {bioHasLink && (
          <p className="mt-1.5 text-xs text-danger animate-fade-in">
            Links are not accepted in the bio. Best place for a custom link is{" "}
            <strong>My website</strong>.
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="long_bio">About</label>
        <textarea id="long_bio" className="input min-h-[90px]" value={form.long_bio} onChange={(e) => update("long_bio", e.target.value)} placeholder="Tell people what you do in Web3…" />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.open_to_work} onChange={(e) => update("open_to_work", e.target.checked)} className="h-4 w-4 rounded border-border" />
          Open to opportunities
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_public} onChange={(e) => update("is_public", e.target.checked)} className="h-4 w-4 rounded border-border" />
          Public profile
        </label>
      </div>

      <div className="border-t border-border pt-5 space-y-3">
        <h3 className="font-medium text-sm">Contact & connected accounts</h3>
        <p className="text-xs text-foreground-subtle">
          X, GitHub and wallet use Connect only. Telegram and My website accept links.
        </p>

        {email && (
          <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm">
            <span className="text-foreground-subtle">Email: </span>
            <span className="font-medium">{email}</span>
            <span className="ml-2 text-xs text-primary">(from your login)</span>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">X</p>
                {hasX && form.x_url ? (
                  <p className="truncate text-xs text-foreground-muted">{form.x_url}</p>
                ) : hasX ? (
                  <p className="text-xs text-success">Connected</p>
                ) : (
                  <p className="text-xs text-foreground-subtle">Not connected</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {hasX ? (
                  <>
                    <span className="text-xs font-medium text-success">Connected</span>
                    <button
                      type="button"
                      disabled={!!linking}
                      onClick={() => disconnectProvider("twitter")}
                      className="btn-ghost text-xs text-danger"
                    >
                      {linking === "unlink-twitter" ? "…" : "Disconnect"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={!!linking}
                    onClick={() => linkProvider("twitter", "twitter")}
                    className="btn-secondary text-xs"
                  >
                    {linking === "twitter" ? "…" : "Connect X"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">GitHub</p>
                {hasGitHub && form.github_url ? (
                  <p className="truncate text-xs text-foreground-muted">{form.github_url}</p>
                ) : hasGitHub ? (
                  <p className="text-xs text-success">Connected</p>
                ) : (
                  <p className="text-xs text-foreground-subtle">Not connected</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {hasGitHub ? (
                  <>
                    <span className="text-xs font-medium text-success">Connected</span>
                    <button
                      type="button"
                      disabled={!!linking}
                      onClick={() => disconnectProvider("github")}
                      className="btn-ghost text-xs text-danger"
                    >
                      {linking === "unlink-github" ? "…" : "Disconnect"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={!!linking}
                    onClick={() => linkProvider("github", "github")}
                    className="btn-secondary text-xs"
                  >
                    {linking === "github" ? "…" : "Connect GitHub"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">Wallet</p>
                {form.wallet_address ? (
                  <p className="truncate font-mono text-xs text-foreground-muted">
                    {form.wallet_address.slice(0, 8)}…{form.wallet_address.slice(-6)}
                  </p>
                ) : (
                  <p className="text-xs text-foreground-subtle">Not connected</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {form.wallet_address ? (
                  <>
                    <button type="button" disabled={!!linking} onClick={connectWallet} className="btn-secondary text-xs">
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
                  <button type="button" disabled={!!linking} onClick={connectWallet} className="btn-secondary text-xs">
                    {linking === "wallet" ? "…" : "Connect wallet"}
                  </button>
                )}
              </div>
            </div>
            {walletError && (
              <div className="rounded-md border border-danger/30 bg-danger/10 px-2.5 py-1.5 text-xs text-danger animate-fade-in">
                {walletError}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <span className="text-sm font-medium">My website</span>
            <input
              className="input text-xs"
              value={form.website_url}
              onChange={(e) => update("website_url", e.target.value)}
              placeholder="https://yoursite.com"
            />
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <span className="text-sm font-medium">Telegram</span>
            <input
              className="input text-xs"
              value={form.telegram_url}
              onChange={(e) => update("telegram_url", e.target.value)}
              placeholder="https://t.me/username"
            />
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <span className="text-sm font-medium">ENS</span>
            <input
              className="input text-xs"
              value={form.ens_name}
              onChange={(e) => update("ens_name", e.target.value)}
              placeholder="name.eth"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving || uploading || uploadingBanner || bioHasLink}
        className="btn-primary"
      >
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
