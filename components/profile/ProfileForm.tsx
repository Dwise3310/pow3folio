"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LocationControl from "@/components/profile/LocationControl";
import ConnectAccounts from "@/components/profile/ConnectAccounts";
import type { Profile } from "@/types/database";

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
    show_primary_email: profile.show_primary_email ?? false,
    show_secondary_email: profile.show_secondary_email ?? false,
    location_country: profile.location_country ?? "",
    location_region: profile.location_region ?? "",
    is_public: profile.is_public ?? true,
  });
  const [skills, setSkills] = useState<string[]>(profile.skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [bannerUrl, setBannerUrl] = useState(profile.banner_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [bannerErr, setBannerErr] = useState<string | null>(null);

  const bioHasLink = useMemo(() => URL_IN_BIO.test(form.bio), [form.bio]);

  function update(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addSkill() {
    const s = skillInput.trim().slice(0, 40);
    if (!s) return;
    if (skills.some((x) => x.toLowerCase() === s.toLowerCase())) {
      setSkillInput("");
      return;
    }
    if (skills.length >= 20) return;
    setSkills((prev) => [...prev, s]);
    setSkillInput("");
  }

  function removeSkill(name: string) {
    setSkills((prev) => prev.filter((s) => s !== name));
  }

  async function uploadImage(file: File, kind: "avatar" | "banner"): Promise<string | null> {
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

    const showPrimary = form.show_primary_email && !!email;
    const showSecondary = form.show_secondary_email && !!secondary;

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
        primary_email: email ? email.toLowerCase() : null,
        show_primary_email: showPrimary,
        show_secondary_email: showSecondary,
        location_country: form.location_country.trim() || null,
        location_region: form.location_region.trim() || null,
        is_public: form.is_public,
        skills,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      })
      .eq("id", profile.id);

    setSaving(false);

    if (updateError) {
      if (updateError.code === "23505") setSaveErr("That username is already taken");
      else if (updateError.message?.toLowerCase().includes("column")) {
        setSaveErr("Run the new profile columns SQL in Supabase, then try again.");
      } else setSaveErr(updateError.message);
      return;
    }

    setSaveMsg("Profile saved");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 overflow-x-hidden">
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
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerChange}
              disabled={uploadingBanner}
            />
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
              <div className="flex h-full w-full items-center justify-center text-foreground-subtle text-sm">
                No photo
              </div>
            )}
          </div>
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
        </div>
        <Feedback text={avatarMsg} tone="ok" />
        <Feedback text={avatarErr} tone="err" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="username">
            Username *
          </label>
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
          <label className="label" htmlFor="display_name">
            Display name
          </label>
          <input
            id="display_name"
            className="input"
            value={form.display_name}
            onChange={(e) => update("display_name", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="bio">
          Short bio
        </label>
        <textarea
          id="bio"
          className={`input min-h-[96px] resize-y ${
            bioHasLink ? "border-danger focus:border-danger focus:ring-danger" : ""
          }`}
          value={form.bio}
          onChange={(e) => update("bio", e.target.value)}
          maxLength={160}
          placeholder="One-line intro — no links"
        />
        <p className="mt-1 text-xs text-foreground-subtle">{form.bio.length}/160</p>
        {bioHasLink && (
          <p className="mt-1.5 text-xs text-danger animate-fade-in">
            Links are not accepted in the bio. Best place for a custom link is{" "}
            <strong>My website</strong>.
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="long_bio">
          About
        </label>
        <textarea
          id="long_bio"
          className="input min-h-[90px]"
          value={form.long_bio}
          onChange={(e) => update("long_bio", e.target.value)}
          placeholder="Tell people what you do in Web3…"
        />
      </div>

      <div>
        <label className="label">Skills</label>
        <p className="mb-2 text-xs text-foreground-subtle">
          Shown as chips on the About tab (max 20).
        </p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-xs"
            >
              {s}
              <button
                type="button"
                onClick={() => removeSkill(s)}
                className="text-foreground-subtle hover:text-danger"
                aria-label={`Remove ${s}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="e.g. SMC, Solidity, Community"
            maxLength={40}
          />
          <button type="button" onClick={addSkill} className="btn-secondary shrink-0 text-sm">
            Add
          </button>
        </div>
      </div>

      <LocationControl
        country={form.location_country}
        region={form.location_region}
        onChange={(c, r) => {
          update("location_country", c);
          update("location_region", r);
        }}
      />

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

      <ConnectAccounts
        profileId={profile.id}
        email={email}
        linkedProviders={linkedProviders}
        xUrl={form.x_url}
        githubUrl={form.github_url}
        websiteUrl={form.website_url}
        telegramUrl={form.telegram_url}
        ensName={form.ens_name}
        walletAddress={form.wallet_address}
        secondaryEmail={form.secondary_email}
        showPrimaryEmail={form.show_primary_email}
        showSecondaryEmail={form.show_secondary_email}
        onChange={update}
      />

      <div>
        <button
          type="submit"
          disabled={saving || uploading || uploadingBanner || bioHasLink}
          className="btn-primary"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        <Feedback text={saveMsg} tone="ok" />
        <Feedback text={saveErr} tone="err" />
      </div>
    </form>
  );
}
