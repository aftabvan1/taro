"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  Radio,
  RefreshCw,
  Shield,
  Terminal,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import { useDashboard } from "../layout";
import type { MCActivityEntry } from "@/lib/mission-control/types";

type FilterKey = "all" | "tasks" | "agents" | "approvals" | "system";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tasks", label: "Tasks" },
  { key: "agents", label: "Agents" },
  { key: "approvals", label: "Approvals" },
  { key: "system", label: "System" },
];

const filterMatchers: Record<FilterKey, (type: string) => boolean> = {
  all: () => true,
  tasks: (type) =>
    ["task_created", "task_completed", "task_updated", "task_deleted", "command_executed"].includes(type),
  agents: (type) =>
    ["agent_connected", "agent_disconnected", "agent_started", "agent_stopped"].includes(type),
  approvals: (type) =>
    ["approval_requested", "approval_resolved", "approval_denied"].includes(type),
  system: (type) =>
    ["deploy", "error", "backup", "restart", "system", "health_check"].includes(type),
};

// ---------------------------------------------------------------------------
// Event type styling
// ---------------------------------------------------------------------------

interface EventStyle {
  dotColor: string;
  tagBg: string;
  tagText: string;
  icon: React.ElementType;
}

const STYLE_AGENT: EventStyle = {
  dotColor: "bg-emerald-400",
  tagBg: "bg-emerald-500/10 border-emerald-500/20",
  tagText: "text-emerald-400",
  icon: Bot,
};

const STYLE_APPROVAL: EventStyle = {
  dotColor: "bg-amber-400",
  tagBg: "bg-amber-500/10 border-amber-500/20",
  tagText: "text-amber-400",
  icon: Shield,
};

const STYLE_TASK_DONE: EventStyle = {
  dotColor: "bg-cyan-400",
  tagBg: "bg-cyan-500/10 border-cyan-500/20",
  tagText: "text-cyan-400",
  icon: CheckCircle2,
};

const STYLE_DANGER: EventStyle = {
  dotColor: "bg-red-400",
  tagBg: "bg-red-500/10 border-red-500/20",
  tagText: "text-red-400",
  icon: AlertTriangle,
};

const STYLE_TASK: EventStyle = {
  dotColor: "bg-cyan-400",
  tagBg: "bg-cyan-500/10 border-cyan-500/20",
  tagText: "text-cyan-400",
  icon: Terminal,
};

const STYLE_DEFAULT: EventStyle = {
  dotColor: "bg-zinc-500",
  tagBg: "bg-zinc-500/10 border-zinc-500/20",
  tagText: "text-zinc-400",
  icon: Activity,
};

function getEventStyle(type: string): EventStyle {
  if (type.startsWith("agent_")) return STYLE_AGENT;
  if (type.startsWith("approval_")) return STYLE_APPROVAL;
  if (type === "task_completed" || type === "command_executed") return STYLE_TASK_DONE;
  if (type === "deploy" || type === "error") return STYLE_DANGER;
  if (type.startsWith("task_")) return STYLE_TASK;
  return STYLE_DEFAULT;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
  exit: { opacity: 0, x: -8, transition: { duration: 0.15 } },
};

export default function LiveFeedPage() {
  const { instance, token } = useDashboard();
  const [entries, setEntries] = useState<MCActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  const fetchActivity = useCallback(
    async (silent = false) => {
      if (!instance || !token) return;
      if (!silent) setLoading(true);
      try {
        const res = await fetch("/api/mission-control/activity?limit=100", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch activity");
        const data: MCActivityEntry[] = await res.json();
        // Track new entries
        const newIds = new Set(data.map((e) => e.id));
        seenIds.current = newIds;
        setEntries(data);
        setError(null);
      } catch {
        if (!silent) setError("Could not connect to Mission Control");
      } finally {
        setLoading(false);
      }
    },
    [instance, token]
  );

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  useEffect(() => {
    pollRef.current = setInterval(() => fetchActivity(true), 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchActivity]);

  const filtered = entries.filter((e) => filterMatchers[activeFilter](e.type));

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          <p className="font-mono text-xs text-zinc-600">
            CONNECTING TO LIVE FEED...
          </p>
        </div>
      </div>
    );
  }

  // ---- Error state ----
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
              Live Feed
            </h2>
            <p className="font-mono text-xs text-zinc-600">
              Real-time activity stream
            </p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-mono text-[10px] font-bold tracking-wider text-emerald-400">
            LIVE
          </span>
          <span className="font-mono text-[10px] text-emerald-500/50">
            {entries.length} events
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={cn(
              "rounded-md border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors",
              activeFilter === f.key
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-white/[0.06] bg-[#0c0c0d] text-zinc-600 hover:border-white/10 hover:text-zinc-400"
            )}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto font-mono text-[10px] text-zinc-700">
          {filtered.length} {filtered.length === 1 ? "event" : "events"}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/20 via-white/[0.06] to-transparent" />

        <AnimatePresence mode="popLayout">
          <div className="space-y-1">
            {filtered.map((entry) => {
              const style = getEventStyle(entry.type);
              const IconComponent = style.icon;

              return (
                <motion.div
                  key={entry.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className="group relative flex items-start gap-4 rounded-lg py-2.5 pl-1 pr-3 transition-colors hover:bg-white/[0.02]"
                >
                  {/* Dot on timeline */}
                  <div className="relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                    <span
                      className={cn(
                        "h-3 w-3 rounded-full border-2 border-[#0a0a0b]",
                        style.dotColor
                      )}
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-mono text-sm text-zinc-300">
                        {entry.message}
                      </p>
                      <span className="shrink-0 font-mono text-[10px] text-zinc-700">
                        {relativeTime(entry.created_at)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {/* Agent badge */}
                      {entry.agent_name && (
                        <div className="flex items-center gap-1 rounded border border-emerald-500/15 bg-emerald-500/5 px-1.5 py-0.5">
                          <Bot className="h-3 w-3 text-emerald-400" />
                          <span className="font-mono text-[10px] text-emerald-400">
                            {entry.agent_name}
                          </span>
                        </div>
                      )}
                      {/* Event type tag */}
                      <div
                        className={cn(
                          "flex items-center gap-1 rounded border px-1.5 py-0.5",
                          style.tagBg
                        )}
                      >
                        <IconComponent className={cn("h-3 w-3", style.tagText)} />
                        <span
                          className={cn(
                            "font-mono text-[10px]",
                            style.tagText
                          )}
                        >
                          {entry.type.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0d] p-4">
              <Zap className="h-8 w-8 text-zinc-700" />
            </div>
            <p className="mt-4 font-mono text-sm text-zinc-600">
              No activity events
            </p>
            <p className="mt-1 font-mono text-[10px] text-zinc-700">
              Events will appear here in real-time
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
