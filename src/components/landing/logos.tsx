"use client";

import { motion } from "framer-motion";
import { LOGOS } from "@/lib/constants";

export const Logos = () => {
  return (
    <section className="relative border-y border-white/[0.04] py-12 overflow-hidden">
      <p className="mb-8 text-center font-mono text-xs uppercase tracking-widest text-muted/50">
        Built for teams deploying AI agents
      </p>
      <div className="relative mx-auto max-w-4xl">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0a0a0b] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0a0a0b] to-transparent" />

        <div className="flex overflow-hidden">
          <motion.div
            className="flex shrink-0 items-center gap-16"
            animate={{ x: [0, -50 * LOGOS.length] }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 25,
                ease: "linear",
              },
            }}
          >
            {/* Duplicate logos for seamless loop */}
            {[...LOGOS, ...LOGOS].map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="whitespace-nowrap font-mono text-sm font-medium text-white/[0.15] select-none"
              >
                {name}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
