"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { TaroMascot } from "@/components/shared/taro-mascot";

export const CTASection = () => {
  return (
    <Section withGrid>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border border-border bg-card px-8 py-24 text-center backdrop-blur-sm"
      >
        {/* Background glow */}
        <div className="absolute left-1/2 top-0 -z-10 h-48 w-96 -translate-x-1/2 rounded-full bg-brand/10 blur-[100px]" />

        {/* Mascot */}
        <div className="mx-auto mb-8 flex justify-center">
          <TaroMascot mood="happy" size="md" />
        </div>

        <h2 className="mx-auto max-w-lg text-3xl font-bold tracking-tight sm:text-4xl">
          Your agent could be live in 30 seconds.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted">
          Deploy, monitor, and manage — all from one dashboard.
          No credit card required to get started.
        </p>
        <div className="mt-10 flex justify-center">
          <Button size="lg" href="/auth/register">
            Deploy Your First Agent
            <ArrowRight size={18} />
          </Button>
        </div>
      </motion.div>
    </Section>
  );
};
