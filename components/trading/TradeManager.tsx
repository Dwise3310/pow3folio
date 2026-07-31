"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Trade, TradeDirection, TradeStatus, TradeUpdate } from "@/types/database";

type Props = {
  userId: string;
  initialItems: Trade[];
};

const emptyForm = {
  ticker: "",
  pair: "",
  direction: "long" as TradeDirection,
  status: "win" as TradeStatus,
  roi: "",
  entry_price: "",
  exit_price: "",
  analysis: "",
  traded_at: "",
  post_url: "",
  is_visible: true,
  chart_url: "" as string | null,
  chart_url_2: "" as string | null,
};

const emptyUpdate = {
  label: "Update",
  caption: "",
  post_url: "",
  chart_url: "" as string | null,
};

function sortItems(list: Trade[]) {
  return [...list].sort((a, b) => {
    const ao = a.sort_order ?? 0;
    const bo = b.sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function statusColor(status: TradeStatus) {
  if (status === "win") return "text-success";
  if (status === "loss") return "text-danger";
  if (status === "breakeven") return "text-warning";
  return "text-foreground-muted";
}

export default function TradeManager({ userId, initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Trade[]>(() => sortItems(initialItems));
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Updates panel
  const [updatesTradeId, setUpdatesTradeId] = useState<string | null>(null);
  const [updates, setUpdates] = useState<TradeUpdate[]>([]);
  const [updateForm, setUpdateForm] = useState(emptyUpdate);
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    setItems(sortItems(initialItems));
  }, [initialItems]);

  function startEdit(item: Trade) {
    setEditingId(item.id);
    setForm({
      ticker: item.ticker,
      pair: item.pair ?? "",
      direction: (item.direction as TradeDirection) || "long",
      status: item.status,
      roi: item.roi != null ? String(item.roi) : "",
      entry_price: item.entry_price != null ? String(item.entry_price) : "",
      exit_price: item.exit_price != null ? String(item.exit_price) : "",
      analysis: item.analysis ?? "",
      traded_at: item.traded_at ?? "",
      post_url: item.post_url ?? "",
      is_visible: item.is_visible,
      chart_url: item.chart_url,
      chart_url_2: item.chart_url_2,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function uploadImage(file: File): Promise<string | null> {
    if (!file.type.startsWith("image/")) {
      setError("Must be an image");
      return null;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Image must be under 4MB");
      return null;
    }
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/trade-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setError(uploadError.message);
      return null;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    return publicUrl;
  }

  async function handleChart(
    e: React.ChangeEvent<HTMLInputElement>,
    slot: 1 | 2
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const url = await uploadImage(file);
    setUploading(false);
    if (!url) return;
    if (slot === 1) setForm((p) => ({ ...p, chart_url: url }));
    else setForm((p) => ({ ...p, chart_url_2: url }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const payload: Record<string, unknown> = {
      ticker: form.ticker.trim().toUpperCase(),
      pair: form.pair.trim() || null,
      direction: form.direction,
      status: form.status,
      roi: form.roi !== "" ? Number(form.roi) : null,
      entry_price: form.entry_price !== "" ? Number(form.entry_price) : null,
      exit_price: form.exit_price !== "" ? Number(form.exit_price) : null,
      analysis: form.analysis.trim() || null,
      traded_at: form.traded_at || null,
      post_url: form.post_url.trim() || null,
      is_visible: form.is_visible,
      chart_url: form.chart_url || null,
      chart_url_2: form.chart_url_2 || null,
      user_id: userId,
    };

    if (editingId) {
      const { data, error: err } = await supabase
        .from("trades")
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
      setItems((prev) =>
        sortItems(prev.map((i) => (i.id === editingId ? (data as Trade) : i)))
      );
    } else {
      const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), -1);
      payload.sort_order = maxOrder + 1;

      const { data, error: err } = await supabase
        .from("trades")
        .insert(payload)
        .select()
        .single();

      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      setItems((prev) => sortItems([...prev, data as Trade]));
    }

    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this trade and its updates?")) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("trades")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (err) {
      setError(err.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (editingId === id) resetForm();
    if (updatesTradeId === id) setUpdatesTradeId(null);
    router.refresh();
  }

  async function toggleVisible(item: Trade) {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("trades")
      .update({ is_visible: !item.is_visible })
      .eq("id", item.id)
      .select()
      .single();

    if (err) {
      setError(err.message);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === item.id ? (data as Trade) : i)));
    router.refresh();
  }

  /** Reorder by swapping then normalizing sequential sort_order */
  async function moveItem(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;

    setReordering(true);
    setError(null);

    const next = [...items];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;

    // Normalize 0..n-1 so equal sort_order never blocks reorder
    const normalized = next.map((item, i) => ({ ...item, sort_order: i }));

    const supabase = createClient();
    const results = await Promise.all(
      normalized.map((item) =>
        supabase
          .from("trades")
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

  async function openUpdates(tradeId: string) {
    setUpdatesTradeId(tradeId);
    setUpdateForm(emptyUpdate);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("trade_updates")
      .select("*")
      .eq("trade_id", tradeId)
      .order("created_at", { ascending: true });

    if (err) {
      setError(err.message);
      return;
    }
    setUpdates((data as TradeUpdate[]) ?? []);
  }

  async function handleUpdateChart(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) setUpdateForm((p) => ({ ...p, chart_url: url }));
  }

  async function addUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!updatesTradeId) return;
    setUpdateLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("trade_updates")
      .insert({
        trade_id: updatesTradeId,
        user_id: userId,
        label: updateForm.label.trim() || "Update",
        caption: updateForm.caption.trim() || null,
        post_url: updateForm.post_url.trim() || null,
        chart_url: updateForm.chart_url || null,
      })
      .select()
      .single();

    setUpdateLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setUpdates((prev) => [...prev, data as TradeUpdate]);
    setUpdateForm(emptyUpdate);
    router.refresh();
  }

  async function deleteUpdate(id: string) {
    if (!confirm("Delete this update?")) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("trade_updates")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (err) {
      setError(err.message);
      return;
    }
    setUpdates((prev) => prev.filter((u) => u.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="card space-y-4">
        <h2 className="font-semibold">{editingId ? "Edit trade" : "Add trade"}</h2>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <label className="label">Chart images (max 2)</label>
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map((slot) => {
              const url = slot === 1 ? form.chart_url : form.chart_url_2;
              return (
                <div key={slot} className="space-y-2">
                  <div className="h-28 overflow-hidden rounded-lg border border-border bg-surface-elevated">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-foreground-subtle">
                        Image {slot}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="btn-secondary cursor-pointer text-xs">
                      {uploading ? "Uploading…" : `Upload ${slot}`}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleChart(e, slot as 1 | 2)}
                        disabled={uploading}
                      />
                    </label>
                    {url && (
                      <button
                        type="button"
                        className="btn-ghost text-xs text-danger"
                        onClick={() =>
                          setForm((p) =>
                            slot === 1
                              ? { ...p, chart_url: null }
                              : { ...p, chart_url_2: null }
                          )
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Ticker *</label>
            <input
              className="input"
              required
              value={form.ticker}
              onChange={(e) => setForm({ ...form, ticker: e.target.value })}
              placeholder="BTC"
            />
          </div>
          <div>
            <label className="label">Pair</label>
            <input
              className="input"
              value={form.pair}
              onChange={(e) => setForm({ ...form, pair: e.target.value })}
              placeholder="BTC/USDT"
            />
          </div>
          <div>
            <label className="label">Direction</label>
            <select
              className="input"
              value={form.direction}
              onChange={(e) =>
                setForm({ ...form, direction: e.target.value as TradeDirection })
              }
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
              <option value="spot">Spot</option>
            </select>
          </div>
          <div>
            <label className="label">Result</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as TradeStatus })
              }
            >
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="breakeven">Breakeven</option>
              <option value="open">Open</option>
            </select>
          </div>
          <div>
            <label className="label">ROI %</label>
            <input
              className="input"
              type="number"
              step="any"
              value={form.roi}
              onChange={(e) => setForm({ ...form, roi: e.target.value })}
              placeholder="12.5"
            />
          </div>
          <div>
            <label className="label">Trade date</label>
            <input
              className="input"
              type="date"
              value={form.traded_at}
              onChange={(e) => setForm({ ...form, traded_at: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Entry price</label>
            <input
              className="input"
              type="number"
              step="any"
              value={form.entry_price}
              onChange={(e) => setForm({ ...form, entry_price: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Exit price</label>
            <input
              className="input"
              type="number"
              step="any"
              value={form.exit_price}
              onChange={(e) => setForm({ ...form, exit_price: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Original post link (X / social)</label>
          <input
            className="input"
            type="url"
            value={form.post_url}
            onChange={(e) => setForm({ ...form, post_url: e.target.value })}
            placeholder="https://x.com/.../status/..."
          />
          <p className="mt-1 text-xs text-foreground-subtle">
            Used by Share and “View Post” on your public profile.
          </p>
        </div>

        <div>
          <label className="label">Analysis / notes</label>
          <textarea
            className="input min-h-[80px]"
            value={form.analysis}
            onChange={(e) => setForm({ ...form, analysis: e.target.value })}
            placeholder="Setup, reasoning, lessons…"
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
            {loading ? "Saving…" : editingId ? "Update trade" : "Add trade"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="font-semibold">Your trades ({items.length})</h2>
        <p className="text-xs text-foreground-subtle">Use ↑ ↓ to reorder. Manage updates per trade.</p>
        {items.length === 0 && (
          <p className="text-sm text-foreground-subtle">No trades yet.</p>
        )}
        {items.map((item, index) => (
          <div key={item.id} className="card space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                {item.chart_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.chart_url}
                    alt=""
                    className="h-14 w-20 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-medium">
                    {item.ticker}
                    {item.pair ? ` · ${item.pair}` : ""}
                    {item.direction ? ` · ${item.direction}` : ""}
                  </p>
                  <p className={`text-sm font-medium ${statusColor(item.status)}`}>
                    {item.status.toUpperCase()}
                    {item.roi != null ? ` · ${item.roi > 0 ? "+" : ""}${item.roi}%` : ""}
                  </p>
                  <p className="mt-1 text-xs text-foreground-subtle">
                    {item.is_visible ? "Public" : "Hidden"}
                    {item.post_url ? " · has post link" : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openUpdates(item.id)}
                  className="btn-secondary text-xs"
                >
                  Updates
                </button>
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

            {updatesTradeId === item.id && (
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
                        {u.created_at?.slice(0, 10)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteUpdate(u.id)}
                      className="btn-ghost text-xs text-danger"
                    >
                      Delete
                    </button>
                  </div>
                ))}

                <form onSubmit={addUpdate} className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-xs font-medium text-foreground-muted">Add update</p>
                  <input
                    className="input"
                    value={updateForm.label}
                    onChange={(e) => setUpdateForm({ ...updateForm, label: e.target.value })}
                    placeholder="Label e.g. Partial TP / SL to BE"
                  />
                  <textarea
                    className="input min-h-[60px]"
                    value={updateForm.caption}
                    onChange={(e) => setUpdateForm({ ...updateForm, caption: e.target.value })}
                    placeholder="Caption"
                  />
                  <input
                    className="input"
                    type="url"
                    value={updateForm.post_url}
                    onChange={(e) => setUpdateForm({ ...updateForm, post_url: e.target.value })}
                    placeholder="X / post link"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="btn-secondary cursor-pointer text-xs">
                      {uploading ? "Uploading…" : "Chart image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUpdateChart}
                        disabled={uploading}
                      />
                    </label>
                    {updateForm.chart_url && (
                      <span className="text-xs text-primary">Image attached</span>
                    )}
                    <button
                      type="submit"
                      disabled={updateLoading}
                      className="btn-primary text-xs ml-auto"
                    >
                      {updateLoading ? "Saving…" : "Add update"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
