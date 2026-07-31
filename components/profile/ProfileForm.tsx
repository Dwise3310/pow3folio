"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { connectEthereumWallet } from "@/lib/wallet";
import { startXAuth } from "@/lib/x-oauth";
import type { Profile } from "@/types/database";
import type { Provider } from "@supabase/supabase-js";

type Props = {
  profile: Profile;
  email: string | null;
  linkedProviders: string[];
};

const URL_IN_BIO =
  /(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+\.(?:com|io|xyz|net|org|app|dev|co|gg|me|link|bio|eth)\b/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    secondary_email: profile.secondary_email ?? "",
    is_public: profile.is_public ?? true,
  });
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [bannerUrl, setBannerUrl] = useState(profile.banner_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [xMsg, setXMsg] = useState<string | null>(null);
  const [xErr, setXErr] = useState<string | null>(null);
  const [ghMsg, setGhMsg] = useState<string | null>(null);
  const [ghErr, setGhErr] = useState<string | null>(null);
  const [googleMsg, setGoogleMsg] = useState<string | null>(null);
  const [googleErr, setGoogleErr] = useState<string | null>(null);
  const [walletMsg, setWalletMsg] = useState<string | null>(null);
  const [walletErr, setWalletErr] = useState<string | null>(null);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [bannerErr, setBannerErr] = useState<string | null>(null);
  const [showSecondEmail, setShowSecondEmail] = useState(!!profile.secondary_email);

  const hasX =
    linkedProviders.includes("twitter") ||
    linkedProviders.includes("x") ||
    !!form.x_url;
  const hasGitHub = linkedProviders.includes("github") || !!form.github_url;
  const hasGoogle = linkedProviders.includes("google");
  const bioHasLink = useMemo(() => URL_IN_BIO.test(form.bio), [form.bio]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function explainLinkError(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("manual linking is disabled")) {
      return "Manual linking is disabled in Supabase. Open Authentication → Sign In / Providers and enable Manual Linking, then try again.";
    }
    if (lower.includes("already") || lower.includes("identity")) {
      return raw + " If this X account is already used on another Pow3Folio profile, unlink it there first.";
    }
    return raw;
  }

  async function uploadImage(
    file: File,
    kind: "avatar" | "banner"
  ): Promise<string | null> {
    if (!file.type.startsWith("image/")) {
      if (kind === "avatar") setAvatarErr("Please upload an image file");
      else setBannerErr("Please upload an image file");
      return null;
    }
    const max = kind === "banner" ? 4 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > max) {
      const msg = kind === "banner" ? "Banner must be under 4MB" : "Avatar must be under 2MB";
      if (kind === "avatar") setAvatarErr(msg);
      else setBannerErr(msg);
      return null;
    }

    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${profile.id}/${kind}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      if (kind === "avatar") setAvatarErr(uploadError.message);
      else setBannerErr(uploadError.message);
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
    setAvatarErr(null);
    setAvatarMsg(null);
    const url = await uploadImage(file, "avatar");
    if (url) {
      setAvatarUrl(url);
      setAvatarMsg("Avatar uploaded — click Save profile to keep it");
    }
    setUploading(false);
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    setBannerErr(null);
    setBannerMsg(null);
    const url = await uploadImage(file, "banner");
    if (url) {
      setBannerUrl(url);
      setBannerMsg("Banner uploaded — click Save profile to keep it");
    }
    setUploadingBanner(false);
  }

  async function linkProvider(
    provider: Provider,
    id: "twitter" | "github" | "google"
  ) {
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

    // X needs special handling (OAuth 2.0 provider id "x" + forced redirect)
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
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
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
    if (provider === "twitter") {
      setXErr(null);
      setXMsg(null);
    } else if (provider === "github") {
      setGhErr(null);
      setGhMsg(null);
    } else {
      setGoogleErr(null);
      setGoogleMsg(null);
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Match both legacy twitter and new x identities
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
      await supabase.from("profiles").update({ x_url: null }).eq("id", profile.id);
      update("x_url", "");
      setXMsg("X disconnected");
    } else if (provider === "github") {
      await supabase.from("profiles").update({ github_url: null }).eq("id", profile.id);
      update("github_url", "");
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
    await supabase.from("profiles").update({ wallet_address: null }).eq("id", profile.id);
    update("wallet_address", "");
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
      update("wallet_address", address);
      const supabase = createClient();
      await supabase
        .from("profiles")
        .update({ wallet_address: address })
        .eq("id", profile.id);
      setWalletMsg("Wallet connected");
      router.refresh();
    } catch (err) {
      setWalletErr(err instanceof Error ? err.message : "Wallet connection failed");
    }
    setLinking(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveErr(null);
    setSaveMsg(null);

    if (bioHasLink) {
      setSaveErr("Remove the link from Short bio before saving.");
      setSaving(false);
      return;
    }

    const username = form.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      setSaveErr("Username must be 3–30 chars: lowercase letters, numbers, underscore only");
      setSaving(false);
      return;
    }

    const secondary = form.secondary_email.trim().toLowerCase();
    if (secondary) {
      if (!EMAIL_RE.test(secondary)) {
        setSaveErr("Second email looks invalid");
        setSaving(false);
        return;
      }
      if (email && secondary === email.toLowerCase()) {
        setSaveErr("Second email must be different from your login email");
        setSaving(false);
        return;
      }
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
        secondary_email: secondary || null,
        is_public: form.is_public,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      })
      .eq("id", profile.id);

    setSaving(false);

    if (updateError) {
      if (updateError.code === "23505") {
        setSaveErr("That username is already taken");
      } else if (updateError.message?.includes("secondary_email")) {
        setSaveErr("Run the secondary_email SQL in Supabase first.");
      } else {
        setSaveErr(updateError.message);
      }
      return;
    }

    setSaveMsg("Profile saved");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            <button
              type="button"
              className="btn-ghost text-xs text-danger"
              onClick={() => {
                setBannerUrl(null);
                setBannerMsg("Banner removed — click Save profile");
              }}
            >
              Remove
            </button>
          )}
        </div>
        <Feedback text={bannerMsg} tone="ok" />
        <Feedback text={bannerErr} tone="err" />
      </div>

      <div>
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
        <Feedback text={avatarMsg} tone="ok" />
        <Feedback text={avatarErr} tone="err" />
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
            Links are not accepted in the bio. Best place for a custom link is <strong>My website</strong>.
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
          Max 2 emails: login email + one optional second email. Socials use Connect for login on the same account.
        </p>

        <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2 space-y-2">
          <div className="text-sm">
            <span className="text-foreground-subtle">Email 1 (login): </span>
            <span className="font-medium">{email || "—"}</span>
          </div>

          {!showSecondEmail ? (
            <button type="button" className="btn-secondary text-xs" onClick={() => setShowSecondEmail(true)}>
              + Add second email
            </button>
          ) : (
            <div className="space-y-2">
              <label className="label mb-0" htmlFor="secondary_email">
                Email 2 (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="secondary_email"
                  type="email"
                  className="input text-sm flex-1 min-w-[12rem]"
                  value={form.secondary_email}
                  onChange={(e) => update("secondary_email", e.target.value)}
                  placeholder="second@email.com"
                />
                <button
                  type="button"
                  className="btn-ghost text-xs text-danger"
                  onClick={() => {
                    update("secondary_email", "");
                    setShowSecondEmail(false);
                  }}
                >
                  Remove
                </button>
              </div>
              <p className="text-[11px] text-foreground-subtle">Contact email only (does not change login). Save profile to keep it.</p>
            </div>
          )}
        </div>

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
                    <button type="button" disabled={!!linking} onClick={() => disconnectProvider("twitter")} className="btn-ghost text-xs text-danger">
                      {linking === "unlink-twitter" ? "…" : "Disconnect"}
                    </button>
                  </>
                ) : (
                  <button type="button" disabled={!!linking} onClick={() => linkProvider("twitter", "twitter")} className="btn-secondary text-xs">
                    {linking === "twitter" ? "…" : "Connect X"}
                  </button>
                )}
              </div>
            </div>
            <Feedback text={xMsg} tone="ok" />
            <Feedback text={xErr} tone="err" />
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
                    <button type="button" disabled={!!linking} onClick={() => disconnectProvider("github")} className="btn-ghost text-xs text-danger">
                      {linking === "unlink-github" ? "…" : "Disconnect"}
                    </button>
                  </>
                ) : (
                  <button type="button" disabled={!!linking} onClick={() => linkProvider("github", "github")} className="btn-secondary text-xs">
                    {linking === "github" ? "…" : "Connect GitHub"}
                  </button>
                )}
              </div>
            </div>
            <Feedback text={ghMsg} tone="ok" />
            <Feedback text={ghErr} tone="err" />
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">Google</p>
                {hasGoogle ? (
                  <p className="text-xs text-success">Connected for login</p>
                ) : (
                  <p className="text-xs text-foreground-subtle">Not connected</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {hasGoogle ? (
                  <>
                    <span className="text-xs font-medium text-success">Connected</span>
                    <button type="button" disabled={!!linking} onClick={() => disconnectProvider("google")} className="btn-ghost text-xs text-danger">
                      {linking === "unlink-google" ? "…" : "Disconnect"}
                    </button>
                  </>
                ) : (
                  <button type="button" disabled={!!linking} onClick={() => linkProvider("google", "google")} className="btn-secondary text-xs">
                    {linking === "google" ? "…" : "Connect Google"}
                  </button>
                )}
              </div>
            </div>
            <Feedback text={googleMsg} tone="ok" />
            <Feedback text={googleErr} tone="err" />
          </div>

          <div className="rounded-lg border border-border p-3">
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
                    <button type="button" disabled={!!linking} onClick={disconnectWallet} className="btn-ghost text-xs text-danger">
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
            <Feedback text={walletMsg} tone="ok" />
            <Feedback text={walletErr} tone="err" />
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <span className="text-sm font-medium">My website</span>
            <input className="input text-xs" value={form.website_url} onChange={(e) => update("website_url", e.target.value)} placeholder="https://yoursite.com" />
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <span className="text-sm font-medium">Telegram</span>
            <input className="input text-xs" value={form.telegram_url} onChange={(e) => update("telegram_url", e.target.value)} placeholder="https://t.me/username" />
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <span className="text-sm font-medium">ENS</span>
            <input className="input text-xs" value={form.ens_name} onChange={(e) => update("ens_name", e.target.value)} placeholder="name.eth" />
          </div>
        </div>
      </div>

      <div>
        <button type="submit" disabled={saving || uploading || uploadingBanner || bioHasLink} className="btn-primary">
          {saving ? "Saving…" : "Save profile"}
        </button>
        <Feedback text={saveMsg} tone="ok" />
        <Feedback text={saveErr} tone="err" />
      </div>
    </form>
  );
}
