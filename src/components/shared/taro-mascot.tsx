"use client";

import { motion } from "framer-motion";

type MascotMood = "idle" | "happy" | "deploying" | "sleeping";

interface TaroMascotProps {
  mood?: MascotMood;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: 64,
  md: 120,
  lg: 180,
};

const moodAnimations = {
  idle: {
    y: [0, -6, 0],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const },
  },
  happy: {
    rotate: [-2, 2, -2],
    y: [0, -8, 0],
    transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" as const },
  },
  deploying: {
    y: [0, -4, 0],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" as const },
  },
  sleeping: {
    rotate: [0, 2, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
  },
};

export const TaroMascot = ({ mood = "idle", size = "md", className }: TaroMascotProps) => {
  const px = sizeMap[size];

  return (
    <motion.div
      className={className}
      animate={moodAnimations[mood]}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 100 120"
        width={px}
        height={px}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cupGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C4A8E0" />
            <stop offset="100%" stopColor="#7B5EA8" />
          </linearGradient>
          <linearGradient id="lidGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D4A574" />
            <stop offset="100%" stopColor="#E8D5C0" />
          </linearGradient>
        </defs>

        {/* Straw */}
        <motion.line
          x1="62"
          y1="5"
          x2="58"
          y2="35"
          stroke="#D4A574"
          strokeWidth="4"
          strokeLinecap="round"
          animate={mood === "deploying" ? { rotate: [0, 360] } : {}}
          transition={mood === "deploying" ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
          style={{ transformOrigin: "60px 20px" }}
        />

        {/* Cup lid */}
        <rect x="20" y="33" width="60" height="8" rx="4" fill="url(#lidGrad)" />

        {/* Cup body */}
        <path
          d="M24 41h52l-6 62a6 6 0 0 1-6 5H36a6 6 0 0 1-6-5L24 41z"
          fill="url(#cupGrad)"
        />

        {/* Face */}
        {mood === "sleeping" ? (
          <>
            {/* Closed eyes */}
            <path d="M36 62 Q39 65 42 62" stroke="#2a1540" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M56 62 Q59 65 62 62" stroke="#2a1540" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Zzz */}
            <text x="70" y="30" fill="#C4A8E0" fontSize="10" fontWeight="bold" opacity="0.6">z</text>
            <text x="76" y="22" fill="#C4A8E0" fontSize="8" fontWeight="bold" opacity="0.4">z</text>
          </>
        ) : mood === "happy" ? (
          <>
            {/* Happy ^_^ eyes */}
            <path d="M36 60 Q39 56 42 60" stroke="#2a1540" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M56 60 Q59 56 62 60" stroke="#2a1540" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            {/* Normal dot eyes */}
            <circle cx="39" cy="60" r="3" fill="#2a1540" />
            <circle cx="59" cy="60" r="3" fill="#2a1540" />
            {/* Eye shine */}
            <circle cx="40.5" cy="58.5" r="1" fill="white" opacity="0.8" />
            <circle cx="60.5" cy="58.5" r="1" fill="white" opacity="0.8" />
          </>
        )}

        {/* Small curved smile */}
        <path
          d="M43 70 Q49 76 55 70"
          stroke="#2a1540"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Boba pearls inside cup */}
        <circle cx="38" cy="90" r="5" fill="#2a1540" opacity="0.5" />
        <circle cx="52" cy="93" r="5" fill="#2a1540" opacity="0.4" />
        <circle cx="60" cy="86" r="5" fill="#2a1540" opacity="0.45" />
        <circle cx="44" cy="98" r="4" fill="#2a1540" opacity="0.35" />

        {/* Blush cheeks */}
        <circle cx="32" cy="67" r="4" fill="#E8A0B4" opacity="0.25" />
        <circle cx="66" cy="67" r="4" fill="#E8A0B4" opacity="0.25" />
      </svg>
    </motion.div>
  );
};
