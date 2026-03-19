"use client";

import { motion } from "framer-motion";
import { Rocket, MessageCircle, LayoutDashboard } from "lucide-react";
import { Section } from "@/components/ui/section";
import { bouncyContainer, bouncyItem } from "@/lib/animation-variants";

const STEPS = [
  {
    number: "01",
    icon: Rocket,
    title: "Your agent goes live",
    description:
      "Pick a name, hit deploy. In 30 seconds, your AI agent is running, ready to connect to your channels and start working.",
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
      "Every task, every message, every decision your agent makes — visible in one dashboard. Know exactly what's happening without touching a terminal.",
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
            From zero to a working AI agent.{" "}
            <span className="text-gradient">Three steps.</span>
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
