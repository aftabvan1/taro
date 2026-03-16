"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { TerminalDemo } from "@/components/landing/terminal-demo";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export const Hero = () => {
  return (
    <Section withGrid className="pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Text column */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
          <motion.div variants={itemVariants}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-xs text-muted backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              Now in public beta
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            Your AI agent,{" "}
            <span className="text-gradient">hosted and ready</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="max-w-lg text-lg leading-relaxed text-muted"
          >
            The only managed OpenClaw platform with built-in mission control.
            Deploy in 30 seconds. Manage your agents like a team, not a terminal.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-wrap gap-3"
          >
            <Button size="lg" href="#pricing">
              Deploy in 30 Seconds
            </Button>
            <Button variant="secondary" size="lg" href="#">
              View Docs
            </Button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="flex items-center gap-6 pt-2 font-mono text-xs text-muted"
          >
            <span>No credit card required</span>
            <span className="h-3 w-px bg-border" />
            <span>Cancel anytime</span>
          </motion.div>
        </motion.div>

        {/* Terminal column */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
          className="relative"
        >
          {/* Glow behind terminal */}
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-brand/10 blur-3xl" />
          <div className="absolute -inset-8 -z-20 rounded-3xl bg-brand/5 blur-[60px]" />
          <TerminalDemo />
        </motion.div>
      </div>
    </Section>
  );
};
