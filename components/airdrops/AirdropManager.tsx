"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Airdrop, AirdropStatus } from "@/types/database";

type Props = {
  userId: string;
  initialItems: Airdrop[];
};

const STATUSES: AirdropStatus[] = [
  "farming",
  "qualified",
  "claimed",
  "pending",
  "missed",
];

const CHAINS = [
  "Ethereum",
  "Solana",
  "Base",
  "Arbitrum",
  "Optimism",
  "Polygon",
  "Cosmos",
  "Sui",
  "Aptos",
  "Bitcoin",
  "Multi-chain",
  "Other",
];

const emptyForm = {
  title: "",
  chain: "Ethereum",
  status: "farming" as AirdropStatus,
  role: "",
  description: "",
  reward: "",
  url: "",
  tags: "",
  started_at: "",
  claimed_at: "",
  is_visible: true,
  thumbnail_url: "" as string | null,
};

function sortItems(list: Airdrop[]) {
  return [...list].sort((a, b) => {
    const ao = a.sort_order ?? 0;
    const bo = b.sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function statusLabel(s: AirdropStatus) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AirdropManager({ userId, initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Airdrop[]>(() => sortItems(initialItems));
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  function startEdit(item: Airdrop) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      chain: item.chain ?? "Ethereum",
      status: item.status,
      role: item.role ?? "",
      description: item.description ?? "",
      reward: item.reward ?? "",
      url: item.url ?? "",
      tags: (item.tags ?? []).join(", "),
      started_at: item.started_at ?? "",
      claimed_at: item.claimed_at ?? "",
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
      setError("Logo must be an image");
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
    const path = `${userId}/airdrop-${Date.now()}.${ext}`;

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
      chain: form.chain.trim() || null,
      status: form.status,
      role: form.role.trim() || null,
      description: form.description.trim() || null,
      reward: form.reward.trim() || null,
      url: form.url.trim() || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      started_at: form.started_at || null,
      claimed_at: form.claimed_at || null,
      is_visible: form.is_visible,
      thumbnail_url: form.thumbnail_url || null,
      user_id: userId,
    };

    if (editingId) {
      const { data, error: err } = await supabase
        .from("airdrops")
        .update(payload)
        .eq("id", editingId)
        .eq("user_id", userId)
        .select()
        .single();

      setLoading(false);
      if (err) {
        setError(
          err.message.includes("airdrops") || err.code === "42P01"
            ? "Run the airdrops SQL in Supabase first."
            : err.message
        );
        return;
      }
      setItems((prev) =>
        sortItems(prev.map((i) => (i.id === editingId ? (data as Airdrop) : i)))
      );
    } else {
      const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), -1);
      payload.sort_order = maxOrder + 1;

      const { data, error: err } = await supabase
        .from("airdrops")
        .insert(payload)
        .select()
        .single();

      setLoading(false);
      if (err) {
        setError(
          err.message.includes("airdrops") || err.code === "42P01"
            ? "Run the airdrops SQL in Supabase first."
            : err.message
        );
        return;
      }
      setItems((prev) => sortItems([...prev, data as Airdrop]));
    }

    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this airdrop entry?")) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("airdrops")
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

  async function toggleVisible(item: Airdrop) {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("airdrops")
      .update({ is_visible: !item.is_visible })
      .eq("id", item.id)
      .select()
      .single();

    if (err) {
      setError(err.message);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? (data as Airdrop) : i))
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
          .from("airdrops")
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
          {editingId ? "Edit airdrop" : "Add airdrop"}
        </h2>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <label className="label">Project logo</label>
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
          <label className="label">Project name *</label>
          <input
            className="input"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="LayerZero, KiiChain, EigenLayer…"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Chain</label>
            <select
              className="input"
              value={form.chain}
              onChange={(e) => setForm({ ...form, chain: e.target.value })}
            >
              {CHAINS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as AirdropStatus })
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Your role</label>
            <input
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Hunter, Tester, Early user…"
            />
          </div>
          <div>
            <label className="label">Reward / outcome</label>
            <input
              className="input"
              value={form.reward}
              onChange={(e) => setForm({ ...form, reward: e.target.value })}
              placeholder="~$420 · 150 tokens · TBD"
            />
          </div>
        </div>

        <div>
          <label className="label">What you did</label>
          <textarea
            className="input min-h-[80px]"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Testnet tasks, bridging, staking, social quests…"
          />
        </div>

        <div>
          <label className="label">Proof / project link</label>
          <input
            className="input"
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://…"
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
            <label className="label">Claimed / ended</label>
            <input
              className="input"
              type="date"
              value={form.claimed_at}
              onChange={(e) => setForm({ ...form, claimed_at: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Tags (comma separated)</label>
          <input
            className="input"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="testnet, points, retro"
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
            {loading ? "Saving…" : editingId ? "Update" : "Add airdrop"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="font-semibold">Your airdrops ({items.length})</h2>
        <p className="text-xs text-foreground-subtle">
          Use ↑ ↓ to reorder how they appear on your public profile.
        </p>
        {items.length === 0 && (
          <p className="text-sm text-foreground-subtle">No airdrops yet.</p>
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
                  AD
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium break-words">{item.title}</p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  {[item.chain, statusLabel(item.status), item.reward]
                    .filter(Boolean)
                    .join(" · ")}
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
