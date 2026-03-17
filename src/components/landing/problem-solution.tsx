"use client";

import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { Section } from "@/components/ui/section";
import { LinesPatternCard, LinesPatternCardBody } from "@/components/ui/card-with-lines-pattern";
import { bouncyContainer, bouncyItem } from "@/lib/animation-variants";

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
  "SSL, DNS, and networking handled automatically",
  "Automated backups with one-click restore",
  "Real-time monitoring built into the dashboard",
  "Hardened containers with auto-patching",
  "Mission Control to see everything at a glance",
];

export const ProblemSolution = () => {
  return (
    <Section>
      <motion.div
        variants={bouncyContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        <motion.div variants={bouncyItem} className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Self-hosting is painful.{" "}
            <span className="text-gradient">Taro makes it painless.</span>
          </h2>
          <p className="mt-4 text-muted">
            You want to ship AI agents, not babysit infrastructure.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {/* Without Taro */}
          <LinesPatternCard
            className="rounded-3xl border-red-500/20 bg-card"
            gradientClassName="from-card/80 via-card/60 to-card/40"
          >
            <LinesPatternCardBody className="p-8">
              <div className="mb-6 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10">
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
            className="rounded-3xl border-brand/20 bg-card"
            gradientClassName="from-card/80 via-card/60 to-card/40"
          >
            <LinesPatternCardBody className="p-8">
              <div className="mb-6 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10">
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
                30 seconds to deploy. Zero maintenance after.
              </p>
            </LinesPatternCardBody>
          </LinesPatternCard>
        </div>
      </motion.div>
    </Section>
  );
};
