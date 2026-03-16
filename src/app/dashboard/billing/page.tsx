"use client";

import { motion } from "framer-motion";
import { Check, CreditCard, BarChart3, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/constants";
import { useDashboard } from "../layout";

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

export default function BillingPage() {
  // keep the hook call for when plan data becomes available
  useDashboard();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.1 }}
      className="space-y-10"
    >
      {/* Current Plan Banner */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-brand/20 bg-brand/[0.04] p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15">
              <CreditCard className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-sm text-muted">Current Plan</p>
              <p className="text-xl font-bold">{currentPlanName}</p>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-3xl font-bold">
              ${PLANS.find((p) => p.name === currentPlanName)?.price ?? 0}
            </span>
            <span className="text-sm text-muted">/mo</span>
          </div>
        </div>
      </motion.div>

      {/* Plan Comparison */}
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
          className="grid items-start gap-5 md:grid-cols-3"
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
                    ? "border-brand/30 bg-white/[0.04]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
                )}
              >
                {isCurrent && (
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent" />
                )}

                <div className="mb-4 flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {isCurrent && (
                    <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-medium text-brand">
                      Current Plan
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted">{plan.description}</p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-bold">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-muted">/mo</span>
                </div>

                <button
                  disabled
                  className={cn(
                    "mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed",
                    isCurrent
                      ? "border border-white/10 bg-white/5 text-muted"
                      : "border border-white/10 bg-white/5 text-muted opacity-60"
                  )}
                >
                  {isCurrent ? (
                    "Current Plan"
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Coming Soon
                    </span>
                  )}
                </button>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-muted"
                    >
                      <Check
                        size={15}
                        className={cn(
                          "mt-0.5 shrink-0",
                          isCurrent ? "text-brand" : "text-muted/50"
                        )}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Usage Placeholder */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06]">
            <BarChart3 className="h-4 w-4 text-muted" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Usage</h3>
            <p className="text-sm text-muted">
              Usage tracking coming soon
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {["CPU Hours", "Storage", "Bandwidth"].map((metric) => (
            <div
              key={metric}
              className="rounded-xl border border-dashed border-white/10 p-4 text-center"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                {metric}
              </p>
              <p className="mt-2 font-mono text-2xl font-bold text-muted/40">
                --
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
