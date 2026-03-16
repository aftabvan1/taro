"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";

export const CTASection = () => {
  return (
    <Section withGrid>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-20 text-center backdrop-blur-sm"
      >
        {/* Background glow */}
        <div className="absolute left-1/2 top-0 -z-10 h-40 w-80 -translate-x-1/2 rounded-full bg-brand/15 blur-[80px]" />

        <h2 className="mx-auto max-w-lg text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to stop babysitting servers?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted">
          Deploy your first OpenClaw agent in 30 seconds. No credit card
          required.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" href="#pricing">
            Get Started Free
            <ArrowRight size={18} />
          </Button>
        </div>
        <p className="mt-6 font-mono text-xs text-muted/60">
          Join 2,000+ developers already using Taro
        </p>
      </motion.div>
    </Section>
  );
};
