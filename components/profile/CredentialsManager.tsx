"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Credential } from "@/types/database";

type Props = {
  userId: string;
  initialItems: Credential[];
};

const emptyForm = {
  title: "",
  description: "",
  issuer: "",
  is_visible: true,
  file_url: "" as string | null,
  file_name: "" as string | null,
  file_type: "" as string | null,
};

const ACCEPT =
  ".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*";

function sortItems(list: Credential[]) {
  return [...list].sort((a, b) => {
    const ao = a.sort_order ?? 0;
    const bo = b.sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default function CredentialsManager({ userId, initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Credential[]>(() => sortItems(initialItems));
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(item: Credential) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description ?? "",
      issuer: item.issuer ?? "",
      is_visible: item.is_visible,
      file_url: item.file_url,
      file_name: item.file_name,
      file_type: item.file_type,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("File must be under 8MB");
      return;
    }

    setUploading(true);
    setError(null);
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${userId}/docs/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type || undefined });

    setUploading(false);
    if (uploadError) {
      setError(
        uploadError.message +
          " (If MIME is blocked, allow PDF/DOC in Storage → avatars policies.)"
      );
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    setForm((prev) => ({
      ...prev,
      file_url: publicUrl,
      file_name: file.name,
      file_type: file.type || file.name.split(".").pop() || null,
      title: prev.title || file.name.replace(/\.[^.]+$/, ""),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.file_url) {
      setError("Upload a file (CV, certificate, PDF…)");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      issuer: form.issuer.trim() || null,
      issued_at: null,
      is_visible: form.is_visible,
      file_url: form.file_url,
      file_name: form.file_name,
      file_type: form.file_type,
      user_id: userId,
    };

    if (editingId) {
      const { data, error: err } = await supabase
        .from("credentials")
        .update(payload)
        .eq("id", editingId)
        .eq("user_id", userId)
        .select()
        .single();

      setLoading(false);
      if (err) {
        setError(
          err.message.includes("credentials") || err.code === "42P01"
            ? "Run the credentials SQL in Supabase first."
            : err.message
        );
        return;
      }
      setItems((prev) =>
        sortItems(prev.map((i) => (i.id === editingId ? (data as Credential) : i)))
      );
    } else {
      const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), -1);
      payload.sort_order = maxOrder + 1;

      const { data, error: err } = await supabase
        .from("credentials")
        .insert(payload)
        .select()
        .single();

      setLoading(false);
      if (err) {
        setError(
          err.message.includes("credentials") || err.code === "42P01"
            ? "Run the credentials SQL in Supabase first."
            : err.message
        );
        return;
      }
      setItems((prev) => sortItems([...prev, data as Credential]));
    }

    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("credentials")
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

  async function toggleVisible(item: Credential) {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("credentials")
      .update({ is_visible: !item.is_visible })
      .eq("id", item.id)
      .select()
      .single();

    if (err) {
      setError(err.message);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? (data as Credential) : i))
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold">Docs & credentials</h2>
        <p className="mt-1 text-xs text-foreground-subtle">
          Upload CV, resume, certificates, or other proof files (PDF, DOC, images).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border p-4">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <label className="label">File *</label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="btn-secondary cursor-pointer text-sm">
              {uploading ? "Uploading…" : form.file_url ? "Replace file" : "Upload file"}
              <input
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={handleFile}
                disabled={uploading}
              />
            </label>
            {form.file_name && (
              <span className="truncate text-xs text-foreground-muted max-w-[12rem]">
                {form.file_name}
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="label">Title *</label>
          <input
            className="input"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Resume 2026 · PharmD certificate"
          />
        </div>

        <div>
          <label className="label">Issuer</label>
          <input
            className="input"
            value={form.issuer}
            onChange={(e) => setForm({ ...form, issuer: e.target.value })}
            placeholder="University / org"
          />
        </div>

        <div>
          <label className="label">Note</label>
          <input
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional short note"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_visible}
            onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          Visible on public profile (About tab)
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={loading || uploading} className="btn-primary text-sm">
            {loading ? "Saving…" : editingId ? "Update" : "Add document"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary text-sm">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-foreground-subtle">No documents yet.</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-sm break-words">{item.title}</p>
              <p className="text-xs text-foreground-muted">
                {[item.file_name, item.issuer, item.is_visible ? "Public" : "Hidden"]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <a
                href={item.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-xs"
              >
                Open
              </a>
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
