"use client";

import { motion } from "framer-motion";
import { Rocket, MessageCircle, LayoutDashboard } from "lucide-react";
import { Section } from "@/components/ui/section";
import { bouncyContainer, bouncyItem } from "@/lib/animation-variants";

const STEPS = [
  {
    number: "01",
    icon: Rocket,
    title: "Pick your framework",
    description:
      "OpenClaw for multi-channel messaging. Hermes for self-improving memory. Choose the one that fits — we deploy either in 30 seconds.",
  },
  {
    number: "02",
    icon: MessageCircle,
    title: "It starts talking",
    description:
      "Connect Telegram, Discord, Slack, WhatsApp, email — or any of 850+ tools. Your agent starts responding to real messages immediately.",
  },
  {
    number: "03",
    icon: LayoutDashboard,
    title: "You see everything",
    description:
      "Every task, every conversation, every skill document your agent creates — visible in one dashboard. Same Mission Control, regardless of framework.",
  },
] as const;

export const Comparison = () => {
  return (
    <Section id="how-it-works">
      <motion.div
        variants={bouncyContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        <motion.div variants={bouncyItem} className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From framework debate to working agent.{" "}
            <span className="text-gradient">30 seconds.</span>
          </h2>
          <p className="mt-4 text-muted">
            No infrastructure knowledge required. No config files. No waiting.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <motion.div
              key={step.number}
              variants={bouncyItem}
              className="relative rounded-2xl border border-border bg-card p-6"
            >
              {/* Step number */}
              <span className="font-mono text-xs text-brand/40">
                {step.number}
              </span>

              {/* Icon */}
              <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                <step.icon size={20} className="text-brand" />
              </div>

              {/* Content */}
              <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Connector line (desktop only) */}
        <div className="mx-auto mt-2 hidden max-w-4xl md:block">
          <div className="h-px bg-gradient-to-r from-transparent via-brand/20 to-transparent" />
        </div>
      </motion.div>
    </Section>
  );
};
