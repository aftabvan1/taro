"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Bot,
  ClipboardList,
  CheckCircle2,
  ShieldAlert,
  Terminal,
  Zap,
  Clock,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "../layout";
import type { MCActivityEntry } from "@/lib/mission-control/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const typeIconMap: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  task_created: ClipboardList,
  task_completed: CheckCircle2,
  agent_connected: Bot,
  agent_disconnected: Bot,
  approval_requested: ShieldAlert,
  approval_resolved: ShieldAlert,
  command_executed: Terminal,
  board_created: ClipboardList,
};

const typeColorMap: Record<string, { dot: string; icon: string; glow: string }> = {
  task_created: {
    dot: "bg-blue-500",
    icon: "text-blue-400",
    glow: "shadow-[0_0_6px_rgba(59,130,246,0.4)]",
  },
  task_completed: {
    dot: "bg-emerald-500",
    icon: "text-emerald-400",
    glow: "shadow-[0_0_6px_rgba(16,185,129,0.4)]",
  },
  agent_connected: {
    dot: "bg-emerald-500",
    icon: "text-emerald-400",
    glow: "shadow-[0_0_6px_rgba(16,185,129,0.4)]",
  },
  agent_disconnected: {
    dot: "bg-zinc-500",
    icon: "text-zinc-400",
    glow: "",
  },
  approval_requested: {
    dot: "bg-amber-500",
    icon: "text-amber-400",
    glow: "shadow-[0_0_6px_rgba(245,158,11,0.4)]",
  },
  approval_resolved: {
    dot: "bg-teal-500",
    icon: "text-teal-400",
    glow: "shadow-[0_0_6px_rgba(20,184,166,0.4)]",
  },
  command_executed: {
    dot: "bg-violet-500",
    icon: "text-violet-400",
    glow: "shadow-[0_0_6px_rgba(139,92,246,0.4)]",
  },
  board_created: {
    dot: "bg-blue-500",
    icon: "text-blue-400",
    glow: "shadow-[0_0_6px_rgba(59,130,246,0.4)]",
  },
};

const defaultColor = {
  dot: "bg-zinc-500",
  icon: "text-zinc-400",
  glow: "",
};

const filters = [
  { key: "all", label: "All" },
  { key: "tasks", label: "Tasks" },
  { key: "agents", label: "Agents" },
  { key: "approvals", label: "Approvals" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

function matchesFilter(type: string, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "tasks")
    return type.startsWith("task_") || type === "board_created";
  if (filter === "agents")
    return type.startsWith("agent_") || type === "command_executed";
  if (filter === "approvals") return type.startsWith("approval_");
  return true;
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    x: 16,
    transition: { duration: 0.2 },
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ActivityPage() {
  const { token } = useDashboard();
  const [entries, setEntries] = useState<MCActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActivity = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      try {
        const res = await fetch("/api/mission-control/activity?limit=50", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch activity");
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : []);
        setError(null);
      } catch {
        if (!silent) setError("Could not load activity feed");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  useEffect(() => {
    pollRef.current = setInterval(() => fetchActivity(true), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchActivity]);

  const filtered = entries.filter((e) => matchesFilter(e.type, filter));

  // ---- Loading ----
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          <p className="font-mono text-xs text-zinc-600">
            LOADING ACTIVITY...
          </p>
        </div>
      </div>
    );
  }

  // ---- Error ----
  if (error) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <p className="font-mono text-sm text-zinc-300">{error}</p>
        <button
          onClick={() => fetchActivity()}
          className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-mono text-xs text-emerald-400 transition-colors hover:bg-emerald-500/20"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
            <Radio className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-mono text-lg font-bold tracking-tight text-zinc-200">
              Activity Feed
            </h2>
            <p className="font-mono text-[10px] text-zinc-600">
              Real-time system events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <span className="font-mono text-[10px] text-emerald-500/70">
            LIVE
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-zinc-600" />
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-md border px-3 py-1 font-mono text-[10px] font-bold tracking-wider transition-all",
              filter === f.key
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:border-white/10 hover:text-zinc-300"
            )}
          >
            {f.label.toUpperCase()}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] text-zinc-600">
          {filtered.length} events
        </span>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-white/[0.06] bg-[#0c0c0d]">
          <Radio className="h-8 w-8 text-zinc-600" />
          <p className="font-mono text-xs text-zinc-500">
            No activity to display.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/30 via-emerald-500/10 to-transparent" />

          <AnimatePresence mode="popLayout">
            <div className="space-y-1">
              {filtered.map((entry, idx) => {
                const colors = typeColorMap[entry.type] ?? defaultColor;
                const Icon = typeIconMap[entry.type] ?? Zap;

                return (
                  <motion.div
                    key={entry.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    transition={{ delay: idx * 0.03 }}
                    className="group relative flex gap-4 py-2"
                  >
                    {/* Timeline dot */}
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.06] bg-[#0c0c0d] transition-all group-hover:border-white/10",
                          colors.glow && "group-hover:" + colors.glow
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5", colors.icon)} />
                      </div>
                    </div>

                    {/* Entry card */}
                    <div className="min-w-0 flex-1 rounded-lg border border-white/[0.06] bg-[#0c0c0d] p-3 transition-all group-hover:border-white/10">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-mono text-sm text-zinc-300">
                          {entry.message}
                        </p>
                        <div className="flex shrink-0 items-center gap-1 text-zinc-600">
                          <Clock className="h-3 w-3" />
                          <span className="font-mono text-[10px]">
                            {relativeTime(entry.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {entry.agent_name && (
                          <div className="flex items-center gap-1 rounded border border-emerald-500/15 bg-emerald-500/5 px-1.5 py-0.5">
                            <Bot className="h-3 w-3 text-emerald-400" />
                            <span className="font-mono text-[10px] text-emerald-400">
                              {entry.agent_name}
                            </span>
                          </div>
                        )}
                        <span
                          className={cn(
                            "rounded border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500"
                          )}
                        >
                          {entry.type.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
