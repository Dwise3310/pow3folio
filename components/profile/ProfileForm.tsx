"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

type Props = {
  profile: Profile;
};

export default function ProfileForm({ profile }: Props) {
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
    discord_url: profile.discord_url ?? "",
    telegram_url: profile.telegram_url ?? "",
    github_url: profile.github_url ?? "",
    website_url: profile.website_url ?? "",
    is_public: profile.is_public ?? true,
  });
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Avatar must be under 2MB");
      return;
    }

    setUploading(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    setAvatarUrl(publicUrl);
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

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
        discord_url: form.discord_url.trim() || null,
        telegram_url: form.telegram_url.trim() || null,
        github_url: form.github_url.trim() || null,
        website_url: form.website_url.trim() || null,
        is_public: form.is_public,
        avatar_url: avatarUrl,
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
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      )}

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-full border border-border bg-surface-elevated">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground-subtle text-sm">
              No photo
            </div>
          )}
        </div>
        <div>
          <label className="btn-secondary cursor-pointer text-sm">
            {uploading ? "Uploading…" : "Change avatar"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={uploading}
            />
          </label>
          <p className="mt-1 text-xs text-foreground-subtle">JPG/PNG, max 2MB</p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="username">
            Username *
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground-subtle">pow3folio.vercel.app/</span>
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
          <label className="label" htmlFor="display_name">
            Display name
          </label>
          <input
            id="display_name"
            className="input"
            value={form.display_name}
            onChange={(e) => update("display_name", e.target.value)}
            placeholder="Your name"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="bio">
          Short bio
        </label>
        <input
          id="bio"
          className="input"
          value={form.bio}
          onChange={(e) => update("bio", e.target.value)}
          placeholder="One-line intro"
          maxLength={160}
        />
      </div>

      <div>
        <label className="label" htmlFor="long_bio">
          About
        </label>
        <textarea
          id="long_bio"
          className="input min-h-[100px]"
          value={form.long_bio}
          onChange={(e) => update("long_bio", e.target.value)}
          placeholder="Tell people what you do in Web3…"
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.open_to_work}
            onChange={(e) => update("open_to_work", e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Open to opportunities
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_public}
            onChange={(e) => update("is_public", e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Public profile
        </label>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="mb-4 font-medium">Social & Web3</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">X (Twitter)</label>
            <input
              className="input"
              value={form.x_url}
              onChange={(e) => update("x_url", e.target.value)}
              placeholder="https://x.com/username"
            />
          </div>
          <div>
            <label className="label">Discord</label>
            <input
              className="input"
              value={form.discord_url}
              onChange={(e) => update("discord_url", e.target.value)}
              placeholder="username or invite link"
            />
          </div>
          <div>
            <label className="label">Telegram</label>
            <input
              className="input"
              value={form.telegram_url}
              onChange={(e) => update("telegram_url", e.target.value)}
              placeholder="https://t.me/username"
            />
          </div>
          <div>
            <label className="label">GitHub</label>
            <input
              className="input"
              value={form.github_url}
              onChange={(e) => update("github_url", e.target.value)}
              placeholder="https://github.com/username"
            />
          </div>
          <div>
            <label className="label">Website</label>
            <input
              className="input"
              value={form.website_url}
              onChange={(e) => update("website_url", e.target.value)}
              placeholder="https://yoursite.com"
            />
          </div>
          <div>
            <label className="label">Wallet address</label>
            <input
              className="input font-mono text-xs"
              value={form.wallet_address}
              onChange={(e) => update("wallet_address", e.target.value)}
              placeholder="0x…"
            />
          </div>
          <div>
            <label className="label">ENS</label>
            <input
              className="input"
              value={form.ens_name}
              onChange={(e) => update("ens_name", e.target.value)}
              placeholder="name.eth"
            />
          </div>
        </div>
      </div>

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
