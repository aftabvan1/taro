"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Section } from "@/components/ui/section";
import { bouncyContainer, bouncyItem } from "@/lib/animation-variants";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "When is Hermes support coming?",
    a: "Soon. We're building first-class Hermes Agent support with the same Mission Control dashboard, backups, and monitoring you get with OpenClaw. Join the waitlist and we'll let you know the moment it's live.",
  },
  {
    q: "Why two frameworks?",
    a: "Because the 'best' framework depends on what you're building. OpenClaw excels at always-on multi-channel bots — Telegram, Discord, Slack, all at once. Hermes excels at long-running tasks with persistent memory. We think you should pick the right tool, not be forced into one.",
  },
  {
    q: "How is Taro different from other hosting platforms?",
    a: "Most platforms give you a container and a terminal — that's it. Taro is the only one that includes a full Mission Control dashboard, automated hourly backups, real-time resource monitoring, and 850+ one-click integrations. You get the infrastructure and the cockpit.",
  },
  {
    q: "Can I SSH into my instance?",
    a: "We don't expose SSH for security reasons. Instead, you get a full web terminal in your browser with complete shell access — install packages, debug, configure, run openclaw commands. Everything you'd do over SSH, without the setup.",
  },
  {
    q: "What AI models are supported?",
    a: "All of them. OpenClaw works with OpenAI, Anthropic, Google, OpenRouter, and any OpenAI-compatible endpoint. Switch models anytime from your dashboard settings.",
  },
{
    q: "What integrations are available?",
    a: "850+ tools via Composio — GitHub, Gmail, Slack, Notion, Linear, Stripe, Google Sheets, Discord, Trello, Jira, Figma, and hundreds more. One click to authenticate, zero config.",
  },
  {
    q: "What does \"beta pricing locked in forever\" mean?",
    a: "If you sign up now at $14/mo, that's your price forever — even after we raise prices at launch. Early supporters get rewarded.",
  },
] as const;

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-brand"
      >
        <span className="pr-4 text-sm font-medium sm:text-base">{q}</span>
        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180 text-brand"
          )}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-muted">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const FAQ = () => {
  return (
    <Section id="faq">
      <motion.div
        variants={bouncyContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        <motion.div variants={bouncyItem} className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Questions? Answers.
          </h2>
        </motion.div>

        <motion.div
          variants={bouncyItem}
          className="mx-auto max-w-2xl rounded-2xl border border-border bg-card px-6"
        >
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </motion.div>
      </motion.div>
    </Section>
  );
};
