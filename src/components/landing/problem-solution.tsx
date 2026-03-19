"use client";

import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { Section } from "@/components/ui/section";
import { LinesPatternCard, LinesPatternCardBody } from "@/components/ui/card-with-lines-pattern";
import { bouncyContainer, bouncyItem } from "@/lib/animation-variants";

const PAIN_POINTS = [
  "Spend hours provisioning servers instead of building",
  "Fight SSL, DNS, and networking before your agent does anything",
  "Hope your backups work when something breaks",
  "Build your own monitoring or fly blind",
  "Patch security holes instead of shipping features",
  "Debug at 2 AM when your agent goes silent",
];

const SOLUTIONS = [
  "Agent live and responding in 30 seconds",
  "Connects to Telegram, Discord, Slack, email instantly",
  "Automatic backups — restore with one click if anything breaks",
  "See exactly what your agent is doing, right now",
  "Security handled — hardened containers, auto-patched",
  "Mission Control dashboard — never wonder what's happening",
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
            You want AI agents that work.{" "}
            <span className="text-gradient">Not weekends lost to servers.</span>
          </h2>
          <p className="mt-4 text-muted">
            Other platforms hand you a server and wish you luck. Taro handles
            everything so you can focus on what your agent actually does.
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
                ~2 hours before your agent does its first useful thing.
                A weekend if you&apos;re unlucky.
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
                30 seconds to a working agent. Zero maintenance after.
              </p>
            </LinesPatternCardBody>
          </LinesPatternCard>
        </div>
      </motion.div>
    </Section>
  );
};
