"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Check,
  MessageSquare,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { useDashboard } from "../layout";
import type { ComposioToolkit, ComposioConnectedAccount } from "@/lib/composio/types";

/* ------------------------------------------------------------------ */
/*  Icon map for known toolkits                                        */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, LucideIcon> = {
  github: GitBranch,
  gmail: Mail,
  "google-drive": FolderOpen,
  googledrive: FolderOpen,
  slack: MessageSquare,
  notion: FileText,
  linear: SquareKanban,
  stripe: CreditCard,
  "google-calendar": Calendar,
  googlecalendar: Calendar,
  calendar: Calendar,
};

function getIcon(slug: string): LucideIcon {
  return ICON_MAP[slug.toLowerCase()] || Plug;
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
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
/*  Skeleton card                                                      */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0b] p-5">
      <div className="mb-4 h-10 w-10 animate-pulse rounded-xl bg-white/[0.04]" />
      <div className="mb-2 h-4 w-24 animate-pulse rounded bg-white/[0.04]" />
      <div className="mb-3 h-3 w-36 animate-pulse rounded bg-white/[0.04]" />
      <div className="h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
      <div className="mt-4 h-9 w-full animate-pulse rounded-lg bg-white/[0.04]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function IntegrationsPage() {
  const { token } = useDashboard();
  const router = useRouter();

  const [toolkits, setToolkits] = useState<ComposioToolkit[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<
    ComposioConnectedAccount[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const headers = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : undefined;

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [toolkitsRes, connectedRes] = await Promise.all([
        fetch("/api/integrations", { headers }),
        fetch("/api/integrations/connected", { headers }),
      ]);

      const toolkitsData = await toolkitsRes.json();
      const connectedData = await connectedRes.json();

      if (toolkitsData.data) setToolkits(toolkitsData.data);
      if (connectedData.data) setConnectedAccounts(connectedData.data);
    } catch {
      setError("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isConnected = (slug: string) =>
    connectedAccounts.some(
      (a) => a.toolkitSlug === slug && a.status === "active"
    );

  const connectedCount = connectedAccounts.filter(
    (a) => a.status === "active"
  ).length;

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
            {"// COMPOSIO CONNECTORS"}
          </span>
        </div>
        <p className="mt-2 max-w-lg text-sm text-zinc-500">
          Connect your AI agent to 1000+ tools via Composio. Enable integrations
          to extend your agent&apos;s capabilities across platforms.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-2 max-w-lg">
          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <p className="text-xs text-zinc-400">
            To connect an integration, ask your agent in the{" "}
            <button
              onClick={() => router.push("/dashboard/terminal")}
              className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
            >
              webchat
            </button>
            . It will guide you through the setup process.
          </p>
        </div>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-6 rounded-xl border border-white/[0.06] bg-[#0a0a0b] px-5 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          <span className="font-mono text-xs text-zinc-500">
            AVAILABLE: {loading ? "..." : toolkits.length}
          </span>
        </div>
        <span className="font-mono text-xs text-zinc-700">|</span>
        <span className="font-mono text-xs text-zinc-500">
          CONNECTED: {loading ? "..." : connectedCount}
        </span>
        <span className="font-mono text-xs text-zinc-700">|</span>
        <span className="font-mono text-xs text-zinc-600">
          TOTAL ECOSYSTEM: 1000+
        </span>
      </motion.div>

      {/* Search bar */}
      <motion.div variants={itemVariants} className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search integrations..."
          className="w-full rounded-xl border border-white/[0.06] bg-[#0a0a0b] py-3 pl-11 pr-10 font-mono text-sm text-zinc-300 placeholder-zinc-600 outline-none transition-colors focus:border-emerald-500/30"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </motion.div>

      {/* Error state */}
      {error && (
        <motion.div
          variants={itemVariants}
          className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-3"
        >
          <p className="font-mono text-xs text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Integration grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-500/10 bg-red-500/5 py-12">
          <p className="font-mono text-xs text-red-400">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); fetchData(); }}
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 font-mono text-xs text-zinc-400 transition-colors hover:bg-white/[0.03]"
          >
            RETRY
          </button>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {toolkits
          .filter((t) => {
            if (!search) return true;
            const q = search.toLowerCase();
            return (
              t.name.toLowerCase().includes(q) ||
              t.slug.toLowerCase().includes(q) ||
              t.category.toLowerCase().includes(q) ||
              t.description.toLowerCase().includes(q)
            );
          })
          .map((toolkit) => {
            const Icon = getIcon(toolkit.slug);
            const connected = isConnected(toolkit.slug);

            return (
              <motion.div
                key={toolkit.slug}
                variants={itemVariants}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0b] p-5 transition-all duration-300 hover:border-emerald-500/15"
              >
                <ScanlineOverlay />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-400 transition-colors group-hover:border-emerald-500/20 group-hover:bg-emerald-500/5 group-hover:text-emerald-400">
                    {toolkit.logo ? (
                      <img
                        src={toolkit.logo}
                        alt={toolkit.name}
                        className="h-5 w-5 rounded"
                      />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>

                  {/* Name & description */}
                  <h3 className="text-sm font-semibold">{toolkit.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                    {toolkit.description}
                  </p>

                  {/* Category tag */}
                  <span className="mt-3 inline-block font-mono text-[10px] text-zinc-700">
                    {toolkit.category.toUpperCase()}
                  </span>

                  {/* Connect button */}
                  {connected ? (
                    <button
                      disabled
                      className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 font-mono text-[10px] font-medium text-emerald-400"
                    >
                      <Check className="h-3 w-3" />
                      CONNECTED
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push("/dashboard/terminal")}
                      className="mt-4 w-full rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 font-mono text-[10px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <MessageSquare className="h-3 w-3" />
                        CONNECT VIA CHAT
                      </span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Footer note */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.06] py-4"
      >
        <Puzzle className="h-3.5 w-3.5 text-zinc-600" />
        <span className="font-mono text-xs text-zinc-600">
          Powered by Composio &mdash; 1000+ integrations available
        </span>
      </motion.div>
    </motion.div>
  );
}
