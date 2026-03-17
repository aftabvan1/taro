"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/section";
import { DynamicIcon } from "@/components/ui/icon-map";
import { FEATURES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { landingContainer, landingItem } from "@/lib/animation-variants";

const containerVariants = landingContainer;
const itemVariants = landingItem;

export const FeaturesGrid = () => {
  return (
    <Section id="features">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        <motion.div variants={itemVariants} className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to{" "}
            <span className="text-gradient">run AI agents</span>
          </h2>
          <p className="mt-4 text-muted">
            From deploy to production monitoring — all in one platform.
          </p>
        </motion.div>

        {/* Bento grid: first two cards span wider */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]",
                // First two cards span 2 cols on large screens for bento effect
                i === 0 && "lg:col-span-2",
                i === 1 && "lg:col-span-1"
              )}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 ring-1 ring-brand/20">
                <DynamicIcon
                  name={feature.icon}
                  size={20}
                  className="text-brand"
                />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted">
                {feature.description}
              </p>

              {/* Hover glow */}
              <div className="pointer-events-none absolute -bottom-1/2 -right-1/2 h-full w-full rounded-full bg-brand/5 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
};
