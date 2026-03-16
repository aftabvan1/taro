"use client";

import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { Section } from "@/components/ui/section";
import { LinesPatternCard, LinesPatternCardBody } from "@/components/ui/card-with-lines-pattern";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const PAIN_POINTS = [
  "Provision a VPS and configure Docker",
  "Set up SSL, DNS, and reverse proxies",
  "Write cron jobs for backups",
  "Build monitoring from scratch",
  "Patch security vulnerabilities monthly",
  "Debug networking at 2 AM",
];

const SOLUTIONS = [
  "One-click deploy — live in 30 seconds",
  "SSL, DNS, and networking handled for you",
  "Automated backups with one-click restore",
  "Built-in monitoring dashboard",
  "Hardened containers with auto-patching",
  "Mission Control for full agent oversight",
];

export const ProblemSolution = () => {
  return (
    <Section>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        <motion.div variants={cardVariants} className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Why <span className="text-gradient">Taro</span>?
          </h2>
          <p className="mt-4 text-muted">
            You want to ship AI agents, not manage infrastructure.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {/* Without Taro */}
          <LinesPatternCard
            className="rounded-2xl border-red-500/20 bg-[#0c0c0e]"
            gradientClassName="from-[#0c0c0e]/80 via-[#0c0c0e]/60 to-[#0c0c0e]/40"
          >
            <LinesPatternCardBody>
              <div className="mb-6 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                  <X size={16} className="text-red-400" />
                </div>
                <h3 className="font-semibold text-red-400">Without Taro</h3>
              </div>
              <ul className="space-y-4">
                {PAIN_POINTS.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-sm text-foreground/70"
                  >
                    <X size={14} className="mt-0.5 shrink-0 text-red-400/60" />
                    {point}
                  </li>
                ))}
              </ul>
              <p className="mt-8 font-mono text-xs text-red-400/60">
                ~2 hours of setup if you know what you&apos;re doing. A whole
                weekend if you don&apos;t. Plus ongoing maintenance forever.
              </p>
            </LinesPatternCardBody>
          </LinesPatternCard>

          {/* With Taro */}
          <LinesPatternCard
            className="rounded-2xl border-brand/20 bg-[#0c0c0e]"
            gradientClassName="from-[#0c0c0e]/80 via-[#0c0c0e]/60 to-[#0c0c0e]/40"
          >
            <LinesPatternCardBody>
              <div className="mb-6 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
                  <Check size={16} className="text-brand" />
                </div>
                <h3 className="font-semibold text-brand">With Taro</h3>
              </div>
              <ul className="space-y-4">
                {SOLUTIONS.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-foreground/80"
                  >
                    <Check size={14} className="mt-0.5 shrink-0 text-brand" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-8 font-mono text-xs text-brand/60">
                30 seconds. Zero maintenance.
              </p>
            </LinesPatternCardBody>
          </LinesPatternCard>
        </div>
      </motion.div>
    </Section>
  );
};
