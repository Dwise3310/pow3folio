"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CommunityItem } from "@/types/database";

type Props = {
  userId: string;
  initialItems: CommunityItem[];
};

const PLATFORMS = [
  "Discord",
  "Telegram",
  "X",
  "DAO",
  "Forum",
  "GitHub",
  "Other",
];

const emptyForm = {
  title: "",
  role: "",
  platform: "Discord",
  description: "",
  url: "",
  metrics: "",
  tags: "",
  started_at: "",
  ended_at: "",
  is_visible: true,
  thumbnail_url: "" as string | null,
};

function sortItems(list: CommunityItem[]) {
  return [...list].sort((a, b) => {
    const ao = a.sort_order ?? 0;
    const bo = b.sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function dateLabel(start: string | null, end: string | null) {
  if (!start && !end) return null;
  if (start && !end) return `${start} – Present`;
  if (!start && end) return `Until ${end}`;
  return `${start} – ${end}`;
}

export default function CommunityManager({ userId, initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<CommunityItem[]>(() => sortItems(initialItems));
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  function startEdit(item: CommunityItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      role: item.role ?? "",
      platform: item.platform ?? "Discord",
      description: item.description ?? "",
      url: item.url ?? "",
      metrics: item.metrics ?? "",
      tags: (item.tags ?? []).join(", "),
      started_at: item.started_at ?? "",
      ended_at: item.ended_at ?? "",
      is_visible: item.is_visible,
      thumbnail_url: item.thumbnail_url,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleThumbnail(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Logo / thumbnail must be an image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }

    setUploading(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/community-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    setUploading(false);
    if (uploadError) {
      setError(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    setForm((prev) => ({ ...prev, thumbnail_url: publicUrl }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      role: form.role.trim() || null,
      platform: form.platform.trim() || null,
      description: form.description.trim() || null,
      url: form.url.trim() || null,
      metrics: form.metrics.trim() || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      started_at: form.started_at || null,
      ended_at: form.ended_at || null,
      is_visible: form.is_visible,
      thumbnail_url: form.thumbnail_url || null,
      user_id: userId,
    };

    if (editingId) {
      const { data, error: err } = await supabase
        .from("community_items")
        .update(payload)
        .eq("id", editingId)
        .eq("user_id", userId)
        .select()
        .single();

      setLoading(false);
      if (err) {
        setError(
          err.message.includes("community_items")
            ? "Run the community_items SQL in Supabase first."
            : err.message
        );
        return;
      }
      setItems((prev) =>
        sortItems(prev.map((i) => (i.id === editingId ? (data as CommunityItem) : i)))
      );
    } else {
      const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), -1);
      payload.sort_order = maxOrder + 1;

      const { data, error: err } = await supabase
        .from("community_items")
        .insert(payload)
        .select()
        .single();

      setLoading(false);
      if (err) {
        setError(
          err.message.includes("community_items") || err.code === "42P01"
            ? "Run the community_items SQL in Supabase first."
            : err.message
        );
        return;
      }
      setItems((prev) => sortItems([...prev, data as CommunityItem]));
    }

    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this community contribution?")) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("community_items")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (err) {
      setError(err.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (editingId === id) resetForm();
    router.refresh();
  }

  async function toggleVisible(item: CommunityItem) {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("community_items")
      .update({ is_visible: !item.is_visible })
      .eq("id", item.id)
      .select()
      .single();

    if (err) {
      setError(err.message);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? (data as CommunityItem) : i))
    );
    router.refresh();
  }

  async function moveItem(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;

    setReordering(true);
    setError(null);

    const next = [...items];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    const normalized = next.map((item, i) => ({ ...item, sort_order: i }));

    const supabase = createClient();
    const results = await Promise.all(
      normalized.map((item) =>
        supabase
          .from("community_items")
          .update({ sort_order: item.sort_order })
          .eq("id", item.id)
          .eq("user_id", userId)
      )
    );

    setReordering(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      setError(failed.error.message);
      return;
    }

    setItems(normalized);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="card space-y-4">
        <h2 className="font-semibold">
          {editingId ? "Edit contribution" : "Add community contribution"}
        </h2>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <label className="label">Project / community logo</label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="h-16 w-16 overflow-hidden rounded-xl border border-border bg-surface-elevated">
              {form.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.thumbnail_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-foreground-subtle">
                  Logo
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="btn-secondary cursor-pointer text-sm w-fit">
                {uploading ? "Uploading…" : "Upload logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleThumbnail}
                  disabled={uploading}
                />
              </label>
              {form.thumbnail_url && (
                <button
                  type="button"
                  className="btn-ghost text-xs w-fit text-danger"
                  onClick={() => setForm((p) => ({ ...p, thumbnail_url: null }))}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="label">Project / community name *</label>
          <input
            className="input"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="KiiChain, Spenda, Cryptoadvancers…"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Your role</label>
            <input
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Moderator, Ambassador, CM, Contributor…"
            />
          </div>
          <div>
            <label className="label">Platform</label>
            <select
              className="input"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">What you did</label>
          <textarea
            className="input min-h-[90px]"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Moderation, campaigns, growth, events, support…"
          />
        </div>

        <div>
          <label className="label">Proof / link</label>
          <input
            className="input"
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://discord.gg/… or announcement / profile link"
          />
        </div>

        <div>
          <label className="label">Metrics (optional)</label>
          <input
            className="input"
            value={form.metrics}
            onChange={(e) => setForm({ ...form, metrics: e.target.value })}
            placeholder="1.2k members · 3 campaign wins · 40% growth"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Started</label>
            <input
              className="input"
              type="date"
              value={form.started_at}
              onChange={(e) => setForm({ ...form, started_at: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Ended (leave empty if current)</label>
            <input
              className="input"
              type="date"
              value={form.ended_at}
              onChange={(e) => setForm({ ...form, ended_at: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Tags (comma separated)</label>
          <input
            className="input"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="moderation, growth, events"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_visible}
            onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          Visible on public profile
        </label>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={loading || uploading} className="btn-primary">
            {loading ? "Saving…" : editingId ? "Update" : "Add contribution"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="font-semibold">Your contributions ({items.length})</h2>
        <p className="text-xs text-foreground-subtle">
          Use ↑ ↓ to reorder how they appear on your public profile.
        </p>
        {items.length === 0 && (
          <p className="text-sm text-foreground-subtle">No community items yet.</p>
        )}
        {items.map((item, index) => (
          <div
            key={item.id}
            className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 gap-3">
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  disabled={reordering || index === 0}
                  onClick={() => moveItem(index, "up")}
                  className="btn-ghost h-8 w-8 p-0 text-sm disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={reordering || index === items.length - 1}
                  onClick={() => moveItem(index, "down")}
                  className="btn-ghost h-8 w-8 p-0 text-sm disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
              </div>
              {item.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnail_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-xs text-foreground-subtle">
                  {item.platform?.slice(0, 2) || "CM"}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium break-words">{item.title}</p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  {[item.role, item.platform].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-0.5 text-xs text-foreground-subtle">
                  {item.is_visible ? "Public" : "Hidden"}
                  {dateLabel(item.started_at, item.ended_at)
                    ? ` · ${dateLabel(item.started_at, item.ended_at)}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" onClick={() => toggleVisible(item)} className="btn-ghost text-xs">
                {item.is_visible ? "Hide" : "Show"}
              </button>
              <button type="button" onClick={() => startEdit(item)} className="btn-secondary text-xs">
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="btn-ghost text-xs text-danger"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
