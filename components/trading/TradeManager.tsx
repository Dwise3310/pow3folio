"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Trade, TradeDirection, TradeStatus } from "@/types/database";

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
  is_visible: true,
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
      is_visible: item.is_visible,
      chart_url: item.chart_url,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleChart(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Chart must be an image");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Chart must be under 4MB");
      return;
    }

    setUploading(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/trade-${Date.now()}.${ext}`;

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
    setForm((prev) => ({ ...prev, chart_url: publicUrl }));
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
      is_visible: form.is_visible,
      chart_url: form.chart_url || null,
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
    if (!confirm("Delete this trade?")) return;
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

  async function moveItem(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;

    setReordering(true);
    setError(null);

    const a = items[index];
    const b = items[target];
    const orderA = a.sort_order ?? index;
    const orderB = b.sort_order ?? target;

    const supabase = createClient();
    const [resA, resB] = await Promise.all([
      supabase
        .from("trades")
        .update({ sort_order: orderB })
        .eq("id", a.id)
        .eq("user_id", userId)
        .select()
        .single(),
      supabase
        .from("trades")
        .update({ sort_order: orderA })
        .eq("id", b.id)
        .eq("user_id", userId)
        .select()
        .single(),
    ]);

    setReordering(false);

    if (resA.error || resB.error) {
      setError(resA.error?.message || resB.error?.message || "Reorder failed");
      return;
    }

    const next = [...items];
    next[index] = { ...a, sort_order: orderB };
    next[target] = { ...b, sort_order: orderA };
    setItems(sortItems(next));
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
          <label className="label">Chart screenshot</label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="h-28 w-full max-w-[200px] overflow-hidden rounded-lg border border-border bg-surface-elevated">
              {form.chart_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.chart_url} alt="Chart" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-foreground-subtle">
                  No chart
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="btn-secondary cursor-pointer text-sm w-fit">
                {uploading ? "Uploading…" : "Upload chart"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleChart}
                  disabled={uploading}
                />
              </label>
              {form.chart_url && (
                <button
                  type="button"
                  className="btn-ghost text-xs w-fit text-danger"
                  onClick={() => setForm((p) => ({ ...p, chart_url: null }))}
                >
                  Remove
                </button>
              )}
              <p className="text-xs text-foreground-subtle">JPG/PNG, max 4MB</p>
            </div>
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
        <p className="text-xs text-foreground-subtle">Use ↑ ↓ to reorder on your public profile.</p>
        {items.length === 0 && (
          <p className="text-sm text-foreground-subtle">No trades yet.</p>
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
                  {item.traded_at ? ` · ${item.traded_at}` : ""}
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
