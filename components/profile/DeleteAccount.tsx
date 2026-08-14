"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  email: string | null;
};

export default function DeleteAccount({ email }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [phrase, setPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("No login email on this account. Contact support.");
      return;
    }
    if (confirmEmail.trim().toLowerCase() !== email.toLowerCase()) {
      setError("Email does not match your login email.");
      return;
    }
    if (phrase.trim().toUpperCase() !== "DELETE") {
      setError('Type DELETE in capitals to confirm.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmEmail: confirmEmail.trim(),
          phrase: phrase.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not delete account");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="mt-10 border-t border-border pt-8">
      <h2 className="text-sm font-semibold text-danger">Danger zone</h2>
      <p className="mt-1 text-xs text-foreground-muted leading-relaxed">
        Permanently delete your Pow3Folio account, public profile and all proof data. This cannot be undone.
      </p>

      {!open ? (
        <button
          type="button"
          className="mt-3 rounded-lg border border-danger/40 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 transition"
          onClick={() => setOpen(true)}
        >
          Delete account
        </button>
      ) : (
        <form onSubmit={handleDelete} className="mt-4 space-y-3 rounded-xl border border-danger/25 bg-danger/5 p-4">
          <p className="text-xs text-foreground-muted">
            Confirm with your login email{email ? ` (${email})` : ""} and type DELETE.
          </p>
          <div>
            <label className="label">Login email</label>
            <input
              className="input text-sm"
              type="email"
              autoComplete="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="you@email.com"
              required
            />
          </div>
          <div>
            <label className="label">Type DELETE</label>
            <input
              className="input text-sm"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="DELETE"
              required
            />
          </div>
          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-danger px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
