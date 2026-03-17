/**
 * Reusable Framer Motion animation variants.
 *
 * Dashboard pages use "dashboard" presets (tight, fast).
 * Landing pages use "landing" presets (larger offset, slower).
 */

export const dashboardContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
} as const;

export const dashboardItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
} as const;

export const dashboardItemBlur = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
} as const;

export const landingContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
} as const;

export const landingItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
} as const;

export const landingHeroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
} as const;

export const landingHeroItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" as const },
  },
} as const;

export const bouncyItem = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 200, damping: 20 },
  },
} as const;

export const bouncyContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
} as const;
