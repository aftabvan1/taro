"use client";

import { motion } from "framer-motion";
import {
  Check,
  CreditCard,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/constants";
import { useDashboard } from "../layout";

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

const currentPlanName = "Hobby";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BillingPage() {
  useDashboard();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.1 }}
      className="space-y-10"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <CreditCard className="h-5 w-5 text-emerald-500" />
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <span className="hidden font-mono text-xs text-zinc-600 sm:inline">
          // SUBSCRIPTION MANAGEMENT
        </span>
      </motion.div>

      {/* Current Plan Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#0a0a0b] p-6"
      >
        {/* Top glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

        {/* Scanline */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.15) 2px, rgba(16,185,129,0.15) 4px)",
          }}
        />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
              <Zap className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                Active Plan
              </p>
              <p className="text-xl font-bold">{currentPlanName}</p>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-4xl font-bold text-emerald-400">
              ${PLANS.find((p) => p.name === currentPlanName)?.price ?? 0}
            </span>
            <span className="font-mono text-sm text-zinc-600">/mo</span>
          </div>
        </div>
      </motion.div>

      {/* Plan Cards */}
      <div>
        <motion.h2
          variants={itemVariants}
          className="mb-5 text-lg font-semibold"
        >
          Plans
        </motion.h2>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid items-start gap-4 md:grid-cols-3"
        >
          {PLANS.map((plan) => {
            const isCurrent = plan.name === currentPlanName;
            return (
              <motion.div
                key={plan.name}
                variants={itemVariants}
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-6 transition-all duration-300",
                  isCurrent
                    ? "border-emerald-500/20 bg-[#0a0a0b]"
                    : "border-white/[0.06] bg-[#0a0a0b] hover:border-white/[0.1]",
                )}
              >
                {/* Top accent line */}
                {isCurrent && (
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                )}

                {/* Scanline */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.015]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.15) 2px, rgba(16,185,129,0.15) 4px)",
                  }}
                />

                <div className="relative z-10">
                  <div className="mb-4 flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    {isCurrent && (
                      <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-400">
                        CURRENT
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-zinc-500">{plan.description}</p>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-bold">
                      ${plan.price}
                    </span>
                    <span className="font-mono text-sm text-zinc-600">
                      /mo
                    </span>
                  </div>

                  <button
                    disabled
                    className={cn(
                      "mt-5 w-full rounded-lg px-4 py-2.5 font-mono text-xs font-medium transition-colors disabled:cursor-not-allowed",
                      isCurrent
                        ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400/60"
                        : "border border-white/[0.06] bg-white/[0.03] text-zinc-600",
                    )}
                  >
                    {isCurrent ? (
                      "CURRENT PLAN"
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        COMING SOON
                      </span>
                    )}
                  </button>

                  <ul className="mt-6 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-sm text-zinc-500"
                      >
                        <Check
                          size={14}
                          className={cn(
                            "mt-0.5 shrink-0",
                            isCurrent ? "text-emerald-500" : "text-zinc-700",
                          )}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}
