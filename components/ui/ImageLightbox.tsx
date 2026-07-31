"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  rounded?: "full" | "xl" | "none";
};

export default function ImageLightbox({
  src,
  alt = "",
  className = "",
  imgClassName = "h-full w-full object-cover",
  rounded = "none",
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const radius =
    rounded === "full" ? "rounded-full" : rounded === "xl" ? "rounded-xl" : "";

  const overlay =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
          >
            {/* Backdrop — blocks all clicks + blurs page */}
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-md animate-fade-in"
              onClick={() => setOpen(false)}
              aria-hidden
            />

            <button
              type="button"
              className="absolute right-3 top-3 z-[100001] rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/25 sm:right-6 sm:top-6"
              onClick={() => setOpen(false)}
            >
              Close
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="relative z-[100000] max-h-[88vh] max-w-[94vw] rounded-xl object-contain shadow-2xl animate-zoom-in pointer-events-none"
              draggable={false}
            />
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`block cursor-zoom-in overflow-hidden transition-transform duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${radius} ${className}`}
        aria-label="View full image"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={imgClassName} />
      </button>
      {overlay}
    </>
  );
}
