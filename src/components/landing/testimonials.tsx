"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/section";
import { TESTIMONIALS } from "@/lib/constants";
import { bouncyContainer, bouncyItem } from "@/lib/animation-variants";

export const Testimonials = () => {
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
              variants={bouncyItem}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 300, damping: 20 } }}
              className="group relative rounded-2xl border border-border bg-card p-7 backdrop-blur-sm transition-colors duration-300 hover:border-brand/20"
            >
              {/* Decorative quote mark */}
              <span className="pointer-events-none absolute right-6 top-4 font-[family-name:var(--font-fredoka)] text-6xl leading-none text-brand/10">
                &ldquo;
              </span>

              <p className="relative mb-6 text-[15px] leading-relaxed text-muted">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-light/20 to-accent/20 font-mono text-sm font-medium text-brand ring-1 ring-brand/20">
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
