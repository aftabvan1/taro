"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/section";
import { DynamicIcon } from "@/components/ui/icon-map";
import { FEATURES } from "@/lib/constants";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

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
            From deployment to monitoring, we handle the infrastructure so you
            can focus on what your agent does.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-sm transition-all duration-300 hover:border-white/15 hover:bg-white/[0.06]"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
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
