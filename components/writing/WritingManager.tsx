"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Writing } from "@/types/database";
import {
  loadPendingAutofill,
  markSectionSaved,
  AUTOFILL_HIGHLIGHT,
} from "@/lib/autofill-store";

type Props = {
  userId: string;
  initialItems: Writing[];
};

const emptyForm = {
  title: "",
  url: "",
  description: "",
  tags: "",
  published_at: "",
  is_visible: true,
  thumbnail_url: "" as string | null,
  image_url_2: "" as string | null,
};

function sortItems(list: Writing[]) {
  return [...list].sort((a, b) => {
    const ao = a.sort_order ?? 0;
    const bo = b.sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default function WritingManager({ userId, initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Writing[]>(() => sortItems(initialItems));
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<"1" | "2" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    { title: string; url: string; description: string }[]
  >([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    function load() {
      const p = loadPendingAutofill();
      if (!p || !p.pending.includes("writing")) return;
      const list = Array.isArray(p.data.writings) ? p.data.writings : [];
      const mapped = list
        .filter((w) => w?.title && w?.url)
        .slice(0, 6)
        .map((w) => ({
          title: String(w.title).slice(0, 160),
          url: String(w.url).slice(0, 400),
          description: String(w.description || "").slice(0, 400),
        }));
      if (mapped.length) setDrafts(mapped);
    }
    load();
    window.addEventListener("pow3-pending-autofill", load);
    return () => window.removeEventListener("pow3-pending-autofill", load);
  }, []);

  async function saveDrafts() {
    if (!drafts.length) return;
    setImporting(true);
    setError(null);
    const supabase = createClient();
    let maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), -1);
    const inserted: Writing[] = [];
    for (const d of drafts) {
      maxOrder += 1;
      const { data, error: err } = await supabase
        .from("writings")
        .insert({
          title: d.title.trim(),
          url: d.url.trim(),
          description: d.description.trim() || null,
          is_visible: true,
          user_id: userId,
          sort_order: maxOrder,
        })
        .select()
        .single();
      if (err) {
        setError(err.message);
        setImporting(false);
        return;
      }
      inserted.push(data as Writing);
    }
    setItems((prev) => sortItems([...prev, ...inserted]));
    setDrafts([]);
    markSectionSaved("writing");
    setImporting(false);
    router.refresh();
  }

  function startEdit(item: Writing) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      url: item.url,
      description: item.description ?? "",
      tags: (item.tags ?? []).join(", "),
      published_at: item.published_at ?? "",
      is_visible: item.is_visible,
      thumbnail_url: item.thumbnail_url,
      image_url_2: item.image_url_2,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function uploadImage(file: File, slot: "1" | "2") {
    if (!file.type.startsWith("image/")) {
      setError("Image only");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image under 2MB");
      return;
    }
    setUploading(slot);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/writing-${slot}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    setUploading(null);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    if (slot === "1") setForm((f) => ({ ...f, thumbnail_url: publicUrl }));
    else setForm((f) => ({ ...f, image_url_2: publicUrl }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      url: form.url.trim(),
      description: form.description.trim() || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      published_at: form.published_at || null,
      is_visible: form.is_visible,
      thumbnail_url: form.thumbnail_url || null,
      image_url_2: form.image_url_2 || null,
      user_id: userId,
    };

    if (editingId) {
      const { data, error: err } = await supabase
        .from("writings")
        .update(payload)
        .eq("id", editingId)
        .eq("user_id", userId)
        .select()
        .single();
      setLoading(false);
      if (err) {
        setError(
          err.message.includes("image_url_2") || err.code === "42703"
            ? "Run the writings image_url_2 SQL migration in Supabase, then try again."
            : err.message
        );
        return;
      }
      setItems((prev) =>
        sortItems(prev.map((i) => (i.id === editingId ? (data as Writing) : i)))
      );
    } else {
      const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), -1);
      payload.sort_order = maxOrder + 1;
      const { data, error: err } = await supabase
        .from("writings")
        .insert(payload)
        .select()
        .single();
      setLoading(false);
      if (err) {
        setError(
          err.message.includes("image_url_2") || err.code === "42703"
            ? "Run the writings image_url_2 SQL migration in Supabase, then try again."
            : err.message
        );
        return;
      }
      setItems((prev) => sortItems([...prev, data as Writing]));
    }
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this writing?")) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("writings")
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

  return (
    <div className="space-y-8">
      {drafts.length > 0 && (
        <div className={`card space-y-3 ${AUTOFILL_HIGHLIGHT}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-500">
                Imported writings ({drafts.length})
              </p>
              <p className="text-xs text-foreground-muted">
                From CV or link import. Review, then save.
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
                  markSectionSaved("writing");
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
              <p className="text-sm font-medium">{d.title}</p>
              <p className="text-xs text-primary break-all">{d.url}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <h2 className="font-semibold">{editingId ? "Edit writing" : "Add writing"}</h2>
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
        <div>
          <label className="label">URL *</label>
          <input
            className="input"
            type="url"
            required
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
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
          <label className="label">Images (max 2 — swipeable on public profile)</label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {[
              { key: "1" as const, url: form.thumbnail_url, label: "Image 1" },
              { key: "2" as const, url: form.image_url_2, label: "Image 2" },
            ].map((slot) => (
              <div
                key={slot.key}
                className="rounded-xl border border-border bg-surface-elevated overflow-hidden"
              >
                <div className="aspect-[16/10] bg-surface flex items-center justify-center">
                  {slot.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slot.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-foreground-subtle">{slot.label}</span>
                  )}
                </div>
                <div className="flex gap-2 p-2">
                  <label className="btn-secondary cursor-pointer text-[11px] flex-1 text-center">
                    {uploading === slot.key ? "Uploading…" : slot.url ? "Replace" : "Upload"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={!!uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) void uploadImage(f, slot.key);
                      }}
                    />
                  </label>
                  {slot.url && (
                    <button
                      type="button"
                      className="btn-ghost text-[11px] text-danger"
                      onClick={() =>
                        setForm((f) =>
                          slot.key === "1"
                            ? { ...f, thumbnail_url: null }
                            : { ...f, image_url_2: null }
                        )
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-foreground-subtle">
            Viewers can swipe left/right between the two images on the public profile.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={loading || !!uploading} className="btn-primary">
            {loading ? "Saving…" : editingId ? "Update" : "Add writing"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="font-semibold">Your writings ({items.length})</h2>
        {items.length === 0 && (
          <p className="text-sm text-foreground-subtle">No writings yet.</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              {(item.thumbnail_url || item.image_url_2) && (
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnail_url || item.image_url_2 || ""}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline break-words"
                >
                  {item.title}
                </a>
                {(item.thumbnail_url && item.image_url_2) && (
                  <p className="text-[10px] text-foreground-subtle mt-0.5">2 images · swipeable</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
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
