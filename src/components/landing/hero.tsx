"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { landingHeroContainer, landingHeroItem } from "@/lib/animation-variants";

const containerVariants = landingHeroContainer;
const itemVariants = landingHeroItem;

export const Hero = () => {
  return (
    <Section className="relative pt-36 pb-16 md:pt-44 md:pb-24 overflow-hidden">
      {/* Radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-brand/[0.07] blur-[120px]" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center text-center"
      >
        {/* Badge */}
        <motion.div variants={itemVariants}>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-1.5 font-mono text-xs text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            Hermes Agent coming soon
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="mt-8 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
        >
          Both frameworks.{" "}
          <span className="text-gradient">One cockpit.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={itemVariants}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-muted md:text-xl"
        >
          Deploy OpenClaw in 30 seconds with task boards and real-time
          oversight. Hermes Agent support coming soon — same dashboard,
          same workflow.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={itemVariants}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Button size="lg" href="/auth/register">
            Start Free
            <ArrowRight size={18} />
          </Button>
          <Button variant="secondary" size="lg" href="#mission-control">
            See it in action
          </Button>
        </motion.div>

        {/* Trust signals */}
        <motion.div
          variants={itemVariants}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-xs text-muted/70"
        >
          <span>Cancel anytime</span>
          <span className="hidden h-3 w-px bg-white/10 sm:block" />
          <span>30s deploy</span>
        </motion.div>
      </motion.div>
    </Section>
  );
};
