"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TradeUpdate } from "@/types/database";

type Props = {
  userId: string;
  tradeId: string;
  onError: (msg: string) => void;
};

const empty = {
  label: "Update",
  caption: "",
  post_url: "",
  occurred_at: "",
  chart_url: "" as string | null,
};

export default function TradeUpdatesEditor({ userId, tradeId, onError }: Props) {
  const router = useRouter();
  const [updates, setUpdates] = useState<TradeUpdate[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("trade_updates")
      .select("*")
      .eq("trade_id", tradeId)
      .order("occurred_at", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      onError(error.message);
      return;
    }
    setUpdates((data as TradeUpdate[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId]);

  function startEdit(u: TradeUpdate) {
    setEditingId(u.id);
    setForm({
      label: u.label,
      caption: u.caption ?? "",
      post_url: u.post_url ?? "",
      occurred_at: u.occurred_at ?? u.created_at?.slice(0, 10) ?? "",
      chart_url: u.chart_url,
    });
  }

  function reset() {
    setEditingId(null);
    setForm(empty);
  }

  async function handleChart(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError("Must be an image");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      onError("Max 4MB");
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/update-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) {
      onError(error.message);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    setForm((p) => ({ ...p, chart_url: publicUrl }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const payload = {
      trade_id: tradeId,
      user_id: userId,
      label: form.label.trim() || "Update",
      caption: form.caption.trim() || null,
      post_url: form.post_url.trim() || null,
      chart_url: form.chart_url || null,
      occurred_at: form.occurred_at || null,
    };

    if (editingId) {
      const { data, error } = await supabase
        .from("trade_updates")
        .update(payload)
        .eq("id", editingId)
        .eq("user_id", userId)
        .select()
        .single();
      setLoading(false);
      if (error) {
        onError(error.message);
        return;
      }
      setUpdates((prev) => prev.map((u) => (u.id === editingId ? (data as TradeUpdate) : u)));
    } else {
      const { data, error } = await supabase
        .from("trade_updates")
        .insert(payload)
        .select()
        .single();
      setLoading(false);
      if (error) {
        onError(error.message);
        return;
      }
      setUpdates((prev) => [...prev, data as TradeUpdate]);
    }
    reset();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this update?")) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("trade_updates")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      onError(error.message);
      return;
    }
    setUpdates((prev) => prev.filter((u) => u.id !== id));
    if (editingId === id) reset();
    router.refresh();
  }

  return (
    <div className="border-t border-border pt-3 space-y-3">
      <h3 className="text-sm font-semibold">Trade updates timeline</h3>
      {updates.length === 0 && (
        <p className="text-xs text-foreground-subtle">No updates yet.</p>
      )}
      {updates.map((u) => (
        <div
          key={u.id}
          className="flex items-start justify-between gap-2 rounded-lg border border-border bg-surface-elevated p-2"
        >
          <div className="min-w-0 text-sm">
            <p className="font-medium">{u.label}</p>
            {u.caption && (
              <p className="text-foreground-muted line-clamp-2">{u.caption}</p>
            )}
            <p className="text-xs text-foreground-subtle">
              {u.occurred_at || u.created_at?.slice(0, 10)}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={() => startEdit(u)} className="btn-ghost text-xs">
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(u.id)}
              className="btn-ghost text-xs text-danger"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-foreground-muted">
          {editingId ? "Edit update" : "Add update"}
        </p>
        <input
          className="input"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder="Label e.g. Partial TP / SL to BE"
        />
        <input
          className="input"
          type="date"
          value={form.occurred_at}
          onChange={(e) => setForm({ ...form, occurred_at: e.target.value })}
        />
        <textarea
          className="input min-h-[60px]"
          value={form.caption}
          onChange={(e) => setForm({ ...form, caption: e.target.value })}
          placeholder="Caption"
        />
        <input
          className="input"
          type="url"
          value={form.post_url}
          onChange={(e) => setForm({ ...form, post_url: e.target.value })}
          placeholder="X / post link"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="btn-secondary cursor-pointer text-xs">
            {uploading ? "Uploading…" : "Chart image"}
            <input type="file" accept="image/*" className="hidden" onChange={handleChart} disabled={uploading} />
          </label>
          {form.chart_url && <span className="text-xs text-primary">Image attached</span>}
          <button type="submit" disabled={loading} className="btn-primary text-xs ml-auto">
            {loading ? "Saving…" : editingId ? "Save changes" : "Add update"}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="btn-ghost text-xs">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
