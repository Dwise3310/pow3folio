"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Writing } from "@/types/database";

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
};

export default function WritingManager({ userId, initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Writing[]>(initialItems);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(item: Writing) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      url: item.url,
      description: item.description ?? "",
      tags: (item.tags ?? []).join(", "),
      published_at: item.published_at ?? "",
      is_visible: item.is_visible,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      title: form.title.trim(),
      url: form.url.trim(),
      description: form.description.trim() || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      published_at: form.published_at || null,
      is_visible: form.is_visible,
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
        setError(err.message);
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === editingId ? (data as Writing) : i)));
    } else {
      const { data, error: err } = await supabase
        .from("writings")
        .insert(payload)
        .select()
        .single();

      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      setItems((prev) => [data as Writing, ...prev]);
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

  async function toggleVisible(item: Writing) {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("writings")
      .update({ is_visible: !item.is_visible })
      .eq("id", item.id)
      .select()
      .single();

    if (err) {
      setError(err.message);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === item.id ? (data as Writing) : i)));
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="card space-y-4">
        <h2 className="font-semibold">
          {editingId ? "Edit writing" : "Add writing"}
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
            placeholder="Article or thread title"
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
            placeholder="https://…"
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[80px]"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Short summary"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Tags (comma separated)</label>
            <input
              className="input"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="defi, research, tutorial"
            />
          </div>
          <div>
            <label className="label">Published date</label>
            <input
              className="input"
              type="date"
              value={form.published_at}
              onChange={(e) => setForm({ ...form, published_at: e.target.value })}
            />
          </div>
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

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
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
          <div key={item.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {item.title}
              </a>
              {item.description && (
                <p className="mt-1 text-sm text-foreground-muted line-clamp-2">
                  {item.description}
                </p>
              )}
              <p className="mt-1 text-xs text-foreground-subtle">
                {item.is_visible ? "Public" : "Hidden"}
                {item.published_at ? ` · ${item.published_at}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => toggleVisible(item)}
                className="btn-ghost text-xs"
              >
                {item.is_visible ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={() => startEdit(item)}
                className="btn-secondary text-xs"
              >
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
