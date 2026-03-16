"use client";

import { motion } from "framer-motion";
import {
  Plug,
  GitBranch,
  FolderOpen,
  Mail,
  FileText,
  SquareKanban,
  CreditCard,
  Calendar,
  Puzzle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "../layout";

/* ------------------------------------------------------------------ */
/*  Types & Data                                                       */
/* ------------------------------------------------------------------ */

interface Integration {
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
}

const INTEGRATIONS: Integration[] = [
  {
    name: "Slack",
    description: "Send messages, manage channels",
    icon: <Plug className="h-5 w-5" />,
    category: "Communication",
  },
  {
    name: "GitHub",
    description: "Manage repos, PRs, issues",
    icon: <GitBranch className="h-5 w-5" />,
    category: "Development",
  },
  {
    name: "Google Drive",
    description: "Read and write files",
    icon: <FolderOpen className="h-5 w-5" />,
    category: "Storage",
  },
  {
    name: "Gmail",
    description: "Send and read emails",
    icon: <Mail className="h-5 w-5" />,
    category: "Communication",
  },
  {
    name: "Notion",
    description: "Manage pages and databases",
    icon: <FileText className="h-5 w-5" />,
    category: "Productivity",
  },
  {
    name: "Linear",
    description: "Track issues and projects",
    icon: <SquareKanban className="h-5 w-5" />,
    category: "Project Management",
  },
  {
    name: "Stripe",
    description: "Manage payments and subscriptions",
    icon: <CreditCard className="h-5 w-5" />,
    category: "Finance",
  },
  {
    name: "Calendar",
    description: "Schedule and manage events",
    icon: <Calendar className="h-5 w-5" />,
    category: "Productivity",
  },
];

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

/* ------------------------------------------------------------------ */
/*  Scanline overlay                                                   */
/* ------------------------------------------------------------------ */

function ScanlineOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.015]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.15) 2px, rgba(16,185,129,0.15) 4px)",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function IntegrationsPage() {
  useDashboard();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.1 }}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <Puzzle className="h-5 w-5 text-emerald-500" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Integrations
          </h1>
          <span className="hidden font-mono text-xs text-zinc-600 sm:inline">
            // COMPOSIO CONNECTORS
          </span>
        </div>
        <p className="mt-2 max-w-lg text-sm text-zinc-500">
          Connect your AI agent to 850+ tools via Composio. Enable integrations
          to extend your agent&apos;s capabilities across platforms.
        </p>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-6 rounded-xl border border-white/[0.06] bg-[#0a0a0b] px-5 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          <span className="font-mono text-xs text-zinc-500">
            AVAILABLE: {INTEGRATIONS.length}
          </span>
        </div>
        <span className="font-mono text-xs text-zinc-700">|</span>
        <span className="font-mono text-xs text-zinc-500">CONNECTED: 0</span>
        <span className="font-mono text-xs text-zinc-700">|</span>
        <span className="font-mono text-xs text-zinc-600">
          TOTAL ECOSYSTEM: 850+
        </span>
      </motion.div>

      {/* Integration grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {INTEGRATIONS.map((integration) => (
          <motion.div
            key={integration.name}
            variants={itemVariants}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0b] p-5 transition-all duration-300 hover:border-emerald-500/15"
          >
            <ScanlineOverlay />

            <div className="relative z-10">
              {/* Icon */}
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-400 transition-colors group-hover:border-emerald-500/20 group-hover:bg-emerald-500/5 group-hover:text-emerald-400">
                {integration.icon}
              </div>

              {/* Name & description */}
              <h3 className="text-sm font-semibold">{integration.name}</h3>
              <p className="mt-1 text-xs text-zinc-500">
                {integration.description}
              </p>

              {/* Category tag */}
              <span className="mt-3 inline-block font-mono text-[10px] text-zinc-700">
                {integration.category.toUpperCase()}
              </span>

              {/* Connect button */}
              <button
                disabled
                className={cn(
                  "mt-4 w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 font-mono text-[10px] font-medium text-zinc-600 transition-colors",
                  "disabled:cursor-not-allowed",
                )}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  COMING SOON
                </span>
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Footer note */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.06] py-4"
      >
        <Puzzle className="h-3.5 w-3.5 text-zinc-600" />
        <span className="font-mono text-xs text-zinc-600">
          Powered by Composio &mdash; 850+ integrations available
        </span>
      </motion.div>
    </motion.div>
  );
}
