"use client";

export default function PrintResume() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-lg bg-[#10b981] px-4 py-2 text-sm font-medium text-white hover:bg-[#059669]"
    >
      Download / print PDF
    </button>
  );
}
