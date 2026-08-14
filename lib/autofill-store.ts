/** Client-only pending autofill. Lives until Save per section or full browser refresh. */

export type AutofillPayload = {
  display_name?: string;
  bio?: string;
  long_bio?: string;
  skills?: { name: string; description: string }[];
  work_experience?: {
    company: string;
    role: string;
    description?: string;
    url?: string;
    employment_type?: "full-time" | "part-time";
    start_date?: string;
    end_date?: string | null;
  }[];
  education?: {
    institution: string;
    degree?: string;
    field_of_study?: string;
    country?: string;
    start_year?: string;
    end_year?: string;
    description?: string;
  }[];
  website_url?: string;
  github_url?: string;
  x_url?: string;
  telegram_url?: string;
  linkedin_url?: string;
  location_country?: string;
  location_region?: string;
  community?: {
    title: string;
    role?: string;
    platform?: string;
    description?: string;
    url?: string;
  }[];
  writings?: {
    title: string;
    url: string;
    description?: string;
  }[];
};

export type AutofillSection = "profile" | "community" | "writing";

export type PendingAutofill = {
  data: AutofillPayload;
  /** Sections that still need review + save */
  pending: AutofillSection[];
  source?: string;
  createdAt: number;
};

const KEY = "pow3-pending-autofill";

export function sectionHasData(data: AutofillPayload, section: AutofillSection): boolean {
  if (section === "profile") {
    return !!(
      data.display_name ||
      data.bio ||
      data.long_bio ||
      (data.skills && data.skills.length) ||
      (data.work_experience && data.work_experience.length) ||
      (data.education && data.education.length) ||
      data.website_url ||
      data.github_url ||
      data.x_url ||
      data.telegram_url ||
      data.linkedin_url ||
      data.location_country
    );
  }
  if (section === "community") {
    return !!(data.community && data.community.length);
  }
  if (section === "writing") {
    return !!(data.writings && data.writings.length);
  }
  return false;
}

export function detectSections(data: AutofillPayload): AutofillSection[] {
  const out: AutofillSection[] = [];
  if (sectionHasData(data, "profile")) out.push("profile");
  if (sectionHasData(data, "community")) out.push("community");
  if (sectionHasData(data, "writing")) out.push("writing");
  return out;
}

export function savePendingAutofill(data: AutofillPayload, source?: string): PendingAutofill {
  const pending = detectSections(data);
  const payload: PendingAutofill = {
    data,
    pending,
    source,
    createdAt: Date.now(),
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pow3-pending-autofill", { detail: payload }));
  }
  return payload;
}

export function loadPendingAutofill(): PendingAutofill | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAutofill;
    if (!parsed?.data || !Array.isArray(parsed.pending)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isSectionPending(section: AutofillSection): boolean {
  const p = loadPendingAutofill();
  return !!p?.pending.includes(section);
}

export function markSectionSaved(section: AutofillSection) {
  const p = loadPendingAutofill();
  if (!p) return;
  p.pending = p.pending.filter((s) => s !== section);
  try {
    if (p.pending.length === 0) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pow3-pending-autofill", { detail: p.pending.length ? p : null }));
  }
}

export function clearPendingAutofill() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pow3-pending-autofill", { detail: null }));
  }
}

/** Amber outline for fields filled from pending autofill */
export const AUTOFILL_HIGHLIGHT =
  "ring-2 ring-amber-400/70 border-amber-400/60 bg-amber-400/5";
