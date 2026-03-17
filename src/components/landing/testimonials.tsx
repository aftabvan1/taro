"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/section";
import { TESTIMONIALS } from "@/lib/constants";
import { landingItem } from "@/lib/animation-variants";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = landingItem;

export const Testimonials = () => {
  return (
    <Section>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        <motion.div variants={itemVariants} className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by builders
          </h2>
          <p className="mt-4 text-muted">
            Developers shipping real agents with Taro.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              variants={itemVariants}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.04] hover:-translate-y-1"
            >
              <p className="mb-6 text-[15px] leading-relaxed text-muted">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 font-mono text-sm font-medium text-brand ring-1 ring-brand/20">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted/70">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
};
