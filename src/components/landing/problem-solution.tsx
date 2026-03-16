"use client";

import { motion } from "framer-motion";
import { XCircle, CheckCircle, TrendingUp } from "lucide-react";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const PAIN_POINTS = [
  "Provision a VPS & install Docker",
  "Configure SSL certificates",
  "Set up monitoring & alerts",
  "Write backup cron jobs",
  "Patch security vulnerabilities",
  "Debug networking issues",
];

const TARO_STEPS = [
  "Pick a plan",
  "Click deploy",
  "Your agent is live",
];

const RESULTS = [
  { label: "Deploy time", value: "30s" },
  { label: "Uptime", value: "99.9%" },
  { label: "Servers to manage", value: "0" },
];

interface CardProps {
  children: React.ReactNode;
  className?: string;
  accentColor: string;
}

const Card = ({ children, className, accentColor }: CardProps) => (
  <motion.div
    variants={cardVariants}
    className={cn(
      "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm",
      className
    )}
  >
    <div
      className={cn(
        "absolute inset-x-0 top-0 h-px",
        accentColor
      )}
    />
    {children}
  </motion.div>
);

export const ProblemSolution = () => {
  return (
    <Section>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="space-y-12"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Self-hosting is a <span className="text-red-400">time sink</span>
          </h2>
          <p className="mt-4 text-muted">
            You want an AI agent, not a second job managing infrastructure.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Pain */}
          <Card accentColor="bg-gradient-to-r from-red-500/80 to-red-500/0">
            <div className="mb-5 flex items-center gap-2">
              <XCircle size={18} className="text-red-400" />
              <h3 className="font-semibold text-red-400">Without Taro</h3>
            </div>
            <ul className="space-y-3">
              {PAIN_POINTS.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm text-muted"
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-400/60" />
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-6 font-mono text-xs text-red-400/70">
              ~105 minutes of setup
            </p>
          </Card>

          {/* Solution */}
          <Card accentColor="bg-gradient-to-r from-brand/80 to-brand/0">
            <div className="mb-5 flex items-center gap-2">
              <CheckCircle size={18} className="text-brand" />
              <h3 className="font-semibold text-brand">With Taro</h3>
            </div>
            <ol className="space-y-4">
              {TARO_STEPS.map((step, i) => (
                <li key={step} className="flex items-center gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 font-mono text-xs text-brand">
                    {i + 1}
                  </span>
                  <span className="text-foreground">{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 font-mono text-xs text-brand/70">
              30 seconds. Done.
            </p>
          </Card>

          {/* Result */}
          <Card accentColor="bg-gradient-to-r from-accent/80 to-accent/0">
            <div className="mb-5 flex items-center gap-2">
              <TrendingUp size={18} className="text-accent" />
              <h3 className="font-semibold text-accent">The Result</h3>
            </div>
            <div className="space-y-6">
              {RESULTS.map((stat) => (
                <div key={stat.label}>
                  <p className="font-mono text-3xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </motion.div>
    </Section>
  );
};
