"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";

const STORAGE_KEY = "pow3folio-onboarding-done";
const SIGNUP_KEY = "pow3folio-just-signed-up";

const STEPS = [
  {
    title: "Welcome to Pow3Folio",
    body: "This short tour shows how to build a public proof of work profile. You can skip anytime and reopen tips from the dashboard.",
  },
  {
    title: "1) Claim your public URL",
    body: "Open Profile and set a unique username. Your link becomes pow3folio.vercel.app/yourname. Keep the short bio clean and link-free.",
    href: "/dashboard/profile",
    hrefLabel: "Edit profile",
  },
  {
    title: "2) Add proof sections",
    body: "Fill Trading, Technical Writing, Community, Airdrops and Onchain. Each card on the dashboard has an ON/OFF switch for public visibility.",
  },
  {
    title: "3) Skills, work and education",
    body: "Under Profile, add service pillars (name + short description), work experience (max 5) and education so teams see real context.",
    href: "/dashboard/profile",
    hrefLabel: "Open profile",
  },
  {
    title: "4) Scores and discovery",
    body: "Profile Score and Builder Score rise with completeness and evidence. Featured and open-to-work builders appear in View talents.",
    href: "/talents",
    hrefLabel: "View talents",
  },
  {
    title: "5) Pow3Bot is your guide",
    body: "Tap the AI button anytime for how-tos, bio rewrites, Diff mode and profile gap checks. It only helps inside Pow3Folio.",
  },
];

type Props = {
  force?: boolean;
  onClose?: () => void;
};

export default function OnboardingTour({ force = false, onClose }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (force) {
      setOpen(true);
      setStep(0);
      return;
    }
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
      if (sessionStorage.getItem(SIGNUP_KEY) !== "1") return;
      sessionStorage.removeItem(SIGNUP_KEY);
      setOpen(true);
    } catch {
      /* ignore */
    }
  }, [force]);

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
      sessionStorage.removeItem(SIGNUP_KEY);
    } catch {
      /* ignore */
    }
    setOpen(false);
    onClose?.();
  }

  function next() {
    if (step >= STEPS.length - 1) finish();
    else setStep((s) => s + 1);
  }

  if (!mounted || !open) return null;

  const s = STEPS[step];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-hidden onClick={finish} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-foreground-subtle">
            Guided setup · {step + 1}/{STEPS.length}
          </p>
          <button type="button" className="btn-ghost text-xs" onClick={finish}>
            Skip all
          </button>
        </div>

        <div className="mb-4 flex gap-1">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>

        <h2 id="onboarding-title" className="text-lg font-bold tracking-tight">
          {s.title}
        </h2>
        <p className="mt-2 text-sm text-foreground-muted leading-relaxed">{s.body}</p>

        {s.href && (
          <Link href={s.href} className="mt-3 inline-flex text-sm text-primary hover:underline" onClick={finish}>
            {s.hrefLabel} →
          </Link>
        )}

        <div className="mt-6 flex items-center justify-between gap-2">
          <button type="button" className="btn-ghost text-sm" disabled={step === 0} onClick={() => setStep((x) => Math.max(0, x - 1))}>
            Back
          </button>
          <button type="button" className="btn-primary text-sm px-5" onClick={next}>
            {step >= STEPS.length - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function resetOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function markNewSignup() {
  try {
    sessionStorage.setItem(SIGNUP_KEY, "1");
  } catch {
    /* ignore */
  }
}
