"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Section } from "@/components/ui/section";
import { bouncyContainer, bouncyItem } from "@/lib/animation-variants";

const ROWS = [
  { feature: "One-click deploy (30 seconds)", taro: true, others: false },
  { feature: "Full web terminal", taro: true, others: "Some" },
  { feature: "Mission Control dashboard", taro: true, others: false },
  { feature: "Automated hourly backups", taro: true, others: false },
  { feature: "Real-time CPU/RAM/network monitoring", taro: true, others: false },
  { feature: "850+ one-click integrations", taro: true, others: false },
  { feature: "Custom fields & tags", taro: true, others: false },
  { feature: "Priority support", taro: true, others: false },
] as const;

function CellIcon({ value }: { value: boolean | string }) {
  if (value === true)
    return <Check size={16} className="text-brand" />;
  if (value === false)
    return <X size={16} className="text-foreground/20" />;
  return <span className="font-mono text-xs text-foreground/40">{value}</span>;
}

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
          className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border bg-card"
        >
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border px-6 py-4">
            <span className="text-sm font-medium text-muted">Feature</span>
            <span className="w-20 text-center font-mono text-xs font-semibold text-brand">
              Taro
            </span>
            <span className="w-20 text-center font-mono text-xs text-muted">
              Others
            </span>
          </div>

          {/* Rows */}
          {ROWS.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-6 py-3.5 ${
                i < ROWS.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              <span className="text-sm text-foreground/70">{row.feature}</span>
              <span className="flex w-20 justify-center">
                <CellIcon value={row.taro} />
              </span>
              <span className="flex w-20 justify-center">
                <CellIcon value={row.others} />
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </Section>
  );
};
