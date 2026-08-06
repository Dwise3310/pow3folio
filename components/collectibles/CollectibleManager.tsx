"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Collectible } from "@/types/database";

type Props = {
  userId: string;
  initialItems: Collectible[];
};

const emptyForm = {
  title: "",
  description: "",
  url: "",
  chain: "",
  collection_name: "",
  token_id: "",
  acquired_at: "",
  tags: "",
  is_visible: true,
  image_url: "" as string | null,
};

function sortItems(list: Collectible[]) {
  return [...list].sort((a, b) => {
    const ao = a.sort_order ?? 0;
    const bo = b.sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default function CollectibleManager({ userId, initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Collectible[]>(() => sortItems(initialItems));
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  function startEdit(item: Collectible) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description ?? "",
      url: item.url ?? "",
      chain: item.chain ?? "",
      collection_name: item.collection_name ?? "",
      token_id: item.token_id ?? "",
      acquired_at: item.acquired_at ?? "",
      tags: (item.tags ?? []).join(", "),
      is_visible: item.is_visible,
      image_url: item.image_url,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Must be an image");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Image must be under 3MB");
      return;
    }

    setUploading(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/nft-${Date.now()}.${ext}`;

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

    setForm((prev) => ({ ...prev, image_url: publicUrl }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const payload: Record<string, unknown> = {
      kind: "nft",
      title: form.title.trim(),
      description: form.description.trim() || null,
      url: form.url.trim() || null,
      chain: form.chain.trim() || null,
      collection_name: form.collection_name.trim() || null,
      token_id: form.token_id.trim() || null,
      issuer: null,
      acquired_at: form.acquired_at || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      is_visible: form.is_visible,
      image_url: form.image_url || null,
      user_id: userId,
    };

    if (editingId) {
      const { data, error: err } = await supabase
        .from("collectibles")
        .update(payload)
        .eq("id", editingId)
        .eq("user_id", userId)
        .select()
        .single();

      setLoading(false);
      if (err) {
        setError(
          err.message.includes("collectibles") || err.code === "42P01"
            ? "Run the collectibles SQL in Supabase first."
            : err.message
        );
        return;
      }
      setItems((prev) =>
        sortItems(prev.map((i) => (i.id === editingId ? (data as Collectible) : i)))
      );
    } else {
      const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), -1);
      payload.sort_order = maxOrder + 1;

      const { data, error: err } = await supabase
        .from("collectibles")
        .insert(payload)
        .select()
        .single();

      setLoading(false);
      if (err) {
        setError(
          err.message.includes("collectibles") || err.code === "42P01"
            ? "Run the collectibles SQL in Supabase first."
            : err.message
        );
        return;
      }
      setItems((prev) => sortItems([...prev, data as Collectible]));
    }

    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this NFT?")) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("collectibles")
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

  async function toggleVisible(item: Collectible) {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("collectibles")
      .update({ is_visible: !item.is_visible })
      .eq("id", item.id)
      .select()
      .single();

    if (err) {
      setError(err.message);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? (data as Collectible) : i))
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
          .from("collectibles")
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
        <h2 className="font-semibold">{editingId ? "Edit NFT" : "Add NFT"}</h2>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <label className="label">Image</label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="h-20 w-20 overflow-hidden rounded-xl border border-border bg-surface-elevated">
              {form.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-foreground-subtle">
                  Image
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="btn-secondary cursor-pointer text-sm w-fit">
                {uploading ? "Uploading…" : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImage}
                  disabled={uploading}
                />
              </label>
              {form.image_url && (
                <button
                  type="button"
                  className="btn-ghost text-xs w-fit text-danger"
                  onClick={() => setForm((p) => ({ ...p, image_url: null }))}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="label">Title *</label>
          <input
            className="input"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Pudgy #1234"
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[70px]"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Why it matters…"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">OpenSea / marketplace link</label>
            <input
              className="input"
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://…"
            />
          </div>
          <div>
            <label className="label">Chain</label>
            <input
              className="input"
              value={form.chain}
              onChange={(e) => setForm({ ...form, chain: e.target.value })}
              placeholder="Ethereum, Solana…"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Collection</label>
            <input
              className="input"
              value={form.collection_name}
              onChange={(e) => setForm({ ...form, collection_name: e.target.value })}
              placeholder="Collection name"
            />
          </div>
          <div>
            <label className="label">Token ID</label>
            <input
              className="input"
              value={form.token_id}
              onChange={(e) => setForm({ ...form, token_id: e.target.value })}
              placeholder="#1234"
            />
          </div>
        </div>

        <div>
          <label className="label">Acquired</label>
          <input
            className="input"
            type="date"
            value={form.acquired_at}
            onChange={(e) => setForm({ ...form, acquired_at: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Tags (comma separated)</label>
          <input
            className="input"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="pfp, art"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_visible}
            onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          Visible when NFTs section is ON
        </label>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={loading || uploading} className="btn-primary">
            {loading ? "Saving…" : editingId ? "Update" : "Add NFT"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="font-semibold">Your NFTs ({items.length})</h2>
        <p className="text-xs text-foreground-subtle">Use ↑ ↓ to reorder.</p>
        {items.length === 0 && (
          <p className="text-sm text-foreground-subtle">No NFTs yet.</p>
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
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={reordering || index === items.length - 1}
                  onClick={() => moveItem(index, "down")}
                  className="btn-ghost h-8 w-8 p-0 text-sm disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-[10px] uppercase text-foreground-subtle">
                  NFT
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium break-words">{item.title}</p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  {[item.chain, item.collection_name].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-0.5 text-xs text-foreground-subtle">
                  {item.is_visible ? "Public" : "Hidden"}
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
