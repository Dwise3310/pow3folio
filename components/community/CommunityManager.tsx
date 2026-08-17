"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CommunityItem } from "@/types/database";
import {
  loadPendingAutofill,
  markSectionSaved,
  AUTOFILL_HIGHLIGHT,
} from "@/lib/autofill-store";

const CATEGORIES = [
  { value: "built", label: "Built by me" },
  { value: "collaboration", label: "Collaboration" },
  { value: "community", label: "Community role" },
] as const;

type Props = {
  userId: string;
  initialItems: CommunityItem[];
};

type Draft = {
  title: string;
  role: string;
  platform: string;
  description: string;
  url: string;
  category: "built" | "collaboration" | "community";
};

const emptyForm = {
  title: "",
  role: "",
  platform: "",
  description: "",
  url: "",
  tags: "",
  is_visible: true,
  thumbnail_url: "" as string | null,
  category: "built" as "built" | "collaboration" | "community",
};

function sortItems(list: CommunityItem[]) {
  return [...list].sort((a, b) => {
    const ao = a.sort_order ?? 0;
    const bo = b.sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function categoryFromTags(tags: string[] | null | undefined): "built" | "collaboration" | "community" {
  const t = (tags || []).map((x) => x.toLowerCase());
  if (t.includes("built") || t.includes("built by me")) return "built";
  if (t.includes("community") || t.includes("community role")) return "community";
  return "collaboration";
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
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    function load() {
      const p = loadPendingAutofill();
      if (!p || !p.pending.includes("community")) return;
      const list = Array.isArray(p.data.community) ? p.data.community : [];
      const mapped: Draft[] = list
        .filter((c) => c?.title)
        .slice(0, 15)
        .map((c) => {
          const plat = String(c.platform || "").toLowerCase();
          let category: Draft["category"] =
            c.category === "built" || c.category === "collaboration" || c.category === "community"
              ? c.category
              : "collaboration";
          if (plat === "github" || plat.includes("github")) category = "built";
          if (String(c.role || "").toLowerCase().includes("founder")) category = "community";
          return {
            title: String(c.title).slice(0, 120),
            role: String(c.role || "").slice(0, 80),
            platform: String(c.platform || "Other").slice(0, 40) || "Other",
            description: String(c.description || "").slice(0, 500),
            url: String(c.url || "").slice(0, 300),
            category,
          };
        });
      if (mapped.length) setDrafts(mapped);
    }
    load();
    function onPending() {
      load();
    }
    window.addEventListener("pow3-pending-autofill", onPending);
    return () => window.removeEventListener("pow3-pending-autofill", onPending);
  }, []);

  async function saveDrafts() {
    if (!drafts.length) return;
    setImporting(true);
    setError(null);
    const supabase = createClient();
    let maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), -1);
    const inserted: CommunityItem[] = [];
    for (const d of drafts) {
      maxOrder += 1;
      const catTag =
        d.category === "built"
          ? "built"
          : d.category === "community"
            ? "community"
            : "collaboration";
      const { data, error: err } = await supabase
        .from("community_items")
        .insert({
          title: d.title.trim(),
          role: d.role.trim() || null,
          platform: d.platform.trim() || null,
          description: d.description.trim() || null,
          url: d.url.trim() || null,
          tags: [catTag],
          is_visible: true,
          user_id: userId,
          sort_order: maxOrder,
        })
        .select()
        .single();
      if (err) {
        setError(
          err.message.includes("community_items") || err.code === "42P01"
            ? "Run the community_items SQL in Supabase first."
            : err.message
        );
        setImporting(false);
        return;
      }
      inserted.push(data as CommunityItem);
    }
    setItems((prev) => sortItems([...prev, ...inserted]));
    setDrafts([]);
    markSectionSaved("community");
    setImporting(false);
    router.refresh();
  }

  function startEdit(item: CommunityItem) {
    setEditingId(item.id);
    let category: "built" | "collaboration" | "community" = categoryFromTags(item.tags);
    const rawTags = item.tags || [];
    const otherTags = rawTags.filter((t) => {
      const k = t.toLowerCase();
      return !["built", "built by me", "collaboration", "collab", "community", "community role"].includes(k);
    });
    setForm({
      title: item.title,
      role: item.role ?? "",
      platform: item.platform ?? "",
      description: item.description ?? "",
      url: item.url ?? "",
      tags: otherTags.join(", "),
      is_visible: item.is_visible,
      thumbnail_url: item.thumbnail_url,
      category,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Image only");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image under 2MB");
      return;
    }
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/community-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    setUploading(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    setForm((f) => ({ ...f, thumbnail_url: publicUrl }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const catTag =
      form.category === "built"
        ? "built"
        : form.category === "community"
          ? "community"
          : "collaboration";
    const extraTags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const tags = [catTag, ...extraTags];
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      role: form.role.trim() || null,
      platform: form.platform.trim() || null,
      description: form.description.trim() || null,
      url: form.url.trim() || null,
      tags,
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
    if (!confirm("Delete this item?")) return;
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

  async function move(id: string, dir: -1 | 1) {
    const ordered = sortItems(items);
    const idx = ordered.findIndex((i) => i.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= ordered.length) return;
    setReordering(true);
    const a = ordered[idx];
    const b = ordered[swap];
    const supabase = createClient();
    await Promise.all([
      supabase
        .from("community_items")
        .update({ sort_order: b.sort_order ?? swap })
        .eq("id", a.id),
      supabase
        .from("community_items")
        .update({ sort_order: a.sort_order ?? idx })
        .eq("id", b.id),
    ]);
    const next = [...ordered];
    next[idx] = b;
    next[swap] = a;
    setItems(next);
    setReordering(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {drafts.length > 0 && (
        <div className={`card space-y-3 ${AUTOFILL_HIGHLIGHT}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-500">
                Imported projects / roles ({drafts.length})
              </p>
              <p className="text-xs text-foreground-muted">
                From CV, Notion or GitHub. Review categories, then save.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary text-xs"
                disabled={importing}
                onClick={saveDrafts}
              >
                {importing ? "Saving…" : "Save all imported"}
              </button>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => {
                  setDrafts([]);
                  markSectionSaved("community");
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
          {drafts.map((d, i) => (
            <div
              key={`${d.title}-${i}`}
              className="rounded-lg border border-amber-400/40 bg-amber-400/5 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{d.title}</p>
                <span className="text-[10px] uppercase tracking-wide rounded-full border border-amber-400/50 px-2 py-0.5 text-amber-500">
                  {CATEGORIES.find((c) => c.value === d.category)?.label || d.category}
                </span>
              </div>
              {d.role && <p className="text-xs text-foreground-muted mt-0.5">{d.role}</p>}
              {d.url && <p className="text-[11px] text-primary break-all mt-0.5">{d.url}</p>}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <h2 className="font-semibold">
          {editingId ? "Edit project / collab" : "Add project / collab"}
        </h2>
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}
        <div>
          <label className="label">Title *</label>
          <input
            className="input"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Role</label>
            <input
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Founder, Contributor, Mod…"
            />
          </div>
          <div>
            <label className="label">Platform</label>
            <input
              className="input"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              placeholder="Telegram, Discord, GitHub…"
            />
          </div>
        </div>
        <div>
          <label className="label">Category *</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  form.category === c.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-foreground-muted hover:border-primary/40"
                }`}
                onClick={() => setForm({ ...form, category: c.value })}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[80px]"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <label className="label">URL</label>
          <input
            className="input"
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Extra tags (comma separated)</label>
          <input
            className="input"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="optional"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-secondary cursor-pointer text-xs">
            {uploading ? "Uploading…" : "Image (optional)"}
            <input type="file" accept="image/*" className="hidden" onChange={handleImage} disabled={uploading} />
          </label>
          {form.thumbnail_url && (
            <button
              type="button"
              className="btn-ghost text-xs text-danger"
              onClick={() => setForm({ ...form, thumbnail_url: null })}
            >
              Remove image
            </button>
          )}
          <label className="flex items-center gap-2 text-sm ml-auto">
            <input
              type="checkbox"
              checked={form.is_visible}
              onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            Visible on public profile
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Saving…" : editingId ? "Update" : "Add"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="font-semibold">Your projects / collab ({items.length})</h2>
        {items.length === 0 && (
          <p className="text-sm text-foreground-subtle">No items yet. Import from CV/link or add manually.</p>
        )}
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium break-words">{item.title}</p>
                <span className="text-[10px] uppercase tracking-wide rounded-full border border-border px-2 py-0.5 text-foreground-muted">
                  {CATEGORIES.find((c) => c.value === categoryFromTags(item.tags))?.label || "Collab"}
                </span>
              </div>
              {item.role && (
                <p className="text-xs text-foreground-muted mt-0.5">{item.role}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={reordering || idx === 0}
                onClick={() => move(item.id, -1)}
                className="btn-ghost text-xs"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={reordering || idx === items.length - 1}
                onClick={() => move(item.id, 1)}
                className="btn-ghost text-xs"
              >
                ↓
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
