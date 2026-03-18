"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Section } from "@/components/ui/section";
import { bouncyContainer, bouncyItem } from "@/lib/animation-variants";

const FEATURES = [
  "One-click deploy (30 seconds)",
  "Full web terminal with shell access",
  "Mission Control dashboard",
  "Automated hourly backups",
  "Real-time CPU/RAM/network monitoring",
  "850+ one-click integrations",
  "Custom fields & tags",
  "Priority support",
] as const;

export const Comparison = () => {
  return (
    <Section id="comparison">
      <motion.div
        variants={bouncyContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        <motion.div variants={bouncyItem} className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything they don&apos;t include.{" "}
            <span className="text-gradient">We do.</span>
          </h2>
          <p className="mt-4 text-muted">
            Most hosting platforms give you a container and a terminal. That&apos;s it.
            Here&apos;s what Taro includes out of the box.
          </p>
        </motion.div>

        <motion.div
          variants={bouncyItem}
          className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-border bg-card"
        >
          {FEATURES.map((feature, i) => (
            <div
              key={feature}
              className={`flex items-center gap-3 px-6 py-3.5 ${
                i < FEATURES.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              <Check size={16} className="shrink-0 text-brand" />
              <span className="text-sm text-foreground/70">{feature}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </Section>
  );
};
