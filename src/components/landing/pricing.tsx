"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { bouncyContainer, bouncyItem } from "@/lib/animation-variants";

const CupIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const heights = { sm: 32, md: 40, lg: 48 };
  const h = heights[size];
  return (
    <svg
      width={h * 0.75}
      height={h}
      viewBox="0 0 30 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 10h22l-2 26a3 3 0 0 1-3 2H9a3 3 0 0 1-3-2L4 10z"
        fill="currentColor"
        opacity="0.15"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect x="3" y="8" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.3" />
      <line x1="20" y1="2" x2="18" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="28" r="2" fill="currentColor" opacity="0.4" />
      <circle cx="18" cy="30" r="2" fill="currentColor" opacity="0.4" />
      {size === "lg" && (
        <>
          <circle cx="15" cy="25" r="1.5" fill="currentColor" opacity="0.3" />
          <line x1="10" y1="3" x2="12" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        </>
      )}
    </svg>
  );
};

export const Pricing = () => {
  return (
    <Section id="pricing">
      <motion.div
        variants={bouncyContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        <motion.div variants={bouncyItem} className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            One plan. Everything included.
          </h2>
          <p className="mt-4 text-muted">
            Terminal, dashboard, backups, monitoring, 850+ integrations. No hidden fees.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-5xl items-start justify-center gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <motion.div
              key={plan.name}
              variants={bouncyItem}
              whileHover={!plan.comingSoon ? { y: -4, transition: { type: "spring", stiffness: 300, damping: 20 } } : undefined}
              className={cn(
                "relative overflow-hidden rounded-3xl border p-8 transition-all duration-300",
                plan.highlighted
                  ? "border-brand/30 bg-card shadow-[0_0_50px_-10px_rgba(155,126,200,0.2)] md:scale-[1.03]"
                  : "border-border bg-card",
                plan.comingSoon && "select-none"
              )}
            >
              {plan.highlighted && (
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent" />
              )}

              {/* Cup icon */}
              <div className={cn(
                "mb-4 flex items-center gap-3",
                plan.highlighted ? "text-brand" : "text-muted"
              )}>
                <CupIcon size={plan.highlighted ? "md" : plan.name === "Teams" ? "lg" : "sm"} />
                <div>
                  <span className="text-xs font-medium text-muted">{plan.cupSize}</span>
                  {plan.highlighted && (
                    <span className="ml-2 rounded-full bg-brand/10 px-2.5 py-0.5 font-mono text-[10px] text-brand ring-1 ring-brand/20">
                      Beta price — locked in forever
                    </span>
                  )}
                </div>
              </div>

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
                className={cn("mt-6 w-full", plan.comingSoon && "pointer-events-none opacity-50")}
                href={plan.comingSoon ? undefined : "/auth/register"}
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
