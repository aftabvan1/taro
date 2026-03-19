"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/section";
import { DynamicIcon } from "@/components/ui/icon-map";
import { FEATURES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { bouncyContainer, bouncyItem } from "@/lib/animation-variants";

export const FeaturesGrid = () => {
  return (
    <Section id="features">
      <motion.div
        variants={bouncyContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        <motion.div variants={bouncyItem} className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Two frameworks. One platform.{" "}
            <span className="text-gradient">Zero ops.</span>
          </h2>
          <p className="mt-4 text-muted">
            Deploy OpenClaw today, Hermes soon — both get first-class treatment. Deploy, connect, monitor, and control from one dashboard.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={bouncyItem}
              whileHover={{ scale: 1.02, transition: { type: "spring", stiffness: 300, damping: 20 } }}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-border bg-card p-7 backdrop-blur-sm transition-colors duration-300 hover:border-brand/20 hover:bg-card/80",
                i === 0 && "lg:col-span-2",
                i === 1 && "lg:col-span-1"
              )}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 ring-1 ring-brand/20">
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
