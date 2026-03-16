"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export const Pricing = () => {
  return (
    <Section id="pricing">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        <motion.div variants={itemVariants} className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-muted">
            Start building for $5/mo. Scale when you&apos;re ready.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-5xl items-start gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-8 transition-all duration-300",
                plan.highlighted
                  ? "border-brand/20 bg-white/[0.04] shadow-[0_0_40px_-10px_rgba(16,185,129,0.15)] md:scale-[1.03]"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.03]"
              )}
            >
              {plan.highlighted && (
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent" />
              )}

              {plan.highlighted && (
                <span className="mb-4 inline-block rounded-full bg-brand/10 px-3 py-1 font-mono text-xs text-brand ring-1 ring-brand/20">
                  Most Popular
                </span>
              )}

              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted">{plan.description}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-mono text-4xl font-bold">
                  ${plan.price}
                </span>
                <span className="text-sm text-muted">/mo</span>
              </div>

              <Button
                variant={plan.highlighted ? "primary" : "secondary"}
                className="mt-6 w-full"
                href="/auth/register"
              >
                {plan.cta}
              </Button>

              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-muted"
                  >
                    <Check
                      size={16}
                      className={cn(
                        "mt-0.5 shrink-0",
                        plan.highlighted ? "text-brand" : "text-muted/50"
                      )}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
};
