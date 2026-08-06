"use client";

import { motion } from "framer-motion";

/**
 * Signature hero visual: a chain of "proof blocks" that light up and link
 * in sequence, echoing the product's core idea — verifiable work, connected
 * into one record. Built from the brand's existing tokens only
 * (primary / accent / border), no new colors introduced.
 */
export default function ProofChain() {
  const nodes = [
    { label: "Trade", x: 40 },
    { label: "Build", x: 190 },
    { label: "Ship", x: 340 },
    { label: "Verify", x: 490 },
  ];

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <svg
        viewBox="0 0 560 120"
        className="w-full overflow-visible"
        aria-hidden="true"
      >
        {/* connecting line, drawn once */}
        <motion.line
          x1="40"
          y1="60"
          x2="490"
          y2="60"
          stroke="rgb(var(--border-strong))"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: "easeInOut", delay: 0.2 }}
        />

        {/* the "proof" pulse that travels left to right, on a loop */}
        <motion.circle
          cy="60"
          r="4"
          fill="rgb(var(--primary))"
          initial={{ cx: 40, opacity: 0 }}
          animate={{ cx: 490, opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 1.6,
            delay: 1.4,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 2.2,
          }}
        />

        {nodes.map((n, i) => (
          <g key={n.label}>
            <motion.circle
              cx={n.x}
              cy="60"
              r="22"
              fill="rgb(var(--surface))"
              stroke="rgb(var(--border-strong))"
              strokeWidth="1.5"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 + i * 0.18 }}
            />
            <motion.circle
              cx={n.x}
              cy="60"
              r="22"
              fill="none"
              stroke="rgb(var(--primary))"
              strokeWidth="1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0] }}
              transition={{
                duration: 1.6,
                delay: 0.9 + i * 0.4,
                repeat: Infinity,
                repeatDelay: 2.4 + (nodes.length - i) * 0.1,
              }}
            />
            <motion.text
              x={n.x}
              y="65"
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill="rgb(var(--foreground-muted))"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.18 }}
              className="select-none"
            >
              {n.label}
            </motion.text>
            <motion.text
              x={n.x}
              y="105"
              textAnchor="middle"
              fontSize="8"
              fill="rgb(var(--foreground-subtle))"
              initial={{ opacity: 0, y: 110 }}
              animate={{ opacity: 1, y: 105 }}
              transition={{ delay: 0.7 + i * 0.18 }}
              className="select-none"
            >
              {String(i + 1).padStart(2, "0")}
            </motion.text>
          </g>
        ))}
      </svg>
    </div>
  );
}
