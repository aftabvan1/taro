"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Cpu,
  MemoryStick,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Zap,
  Activity,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "../layout";
import type { MCAgent, MCApproval } from "@/lib/mission-control/types";

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

const statusConfig = {
  active: {
    label: "ACTIVE",
    dot: "bg-emerald-500",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  pending: {
    label: "PENDING",
    dot: "bg-amber-500",
    text: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  stopped: {
    label: "STOPPED",
    dot: "bg-zinc-600",
    text: "text-zinc-500",
    bg: "bg-zinc-500/10 border-zinc-500/20",
  },
} as const;

function ResourceBar({
  value,
  icon: Icon,
  label,
}: {
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const color =
    value > 80
      ? "bg-red-500"
      : value > 50
        ? "bg-amber-500"
        : "bg-emerald-500";
  const glow =
    value > 80
      ? "shadow-[0_0_6px_rgba(239,68,68,0.4)]"
      : value > 50
        ? "shadow-[0_0_6px_rgba(245,158,11,0.3)]"
        : "";

  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3 w-3 shrink-0 text-zinc-600" />
      <div className="flex-1">
        <div className="h-1 w-full rounded-full bg-white/[0.06]">
          <motion.div
            className={cn("h-full rounded-full", color, glow)}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, value)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
      <span className="w-9 text-right font-mono text-[10px] tabular-nums text-zinc-500">
        {value}%
      </span>
      <span className="hidden font-mono text-[10px] text-zinc-700 sm:inline">
        {label}
      </span>
    </div>
  );
}

export default function AgentsPage() {
  const { instance, token } = useDashboard();
  const [agents, setAgents] = useState<MCAgent[]>([]);
  const [approvals, setApprovals] = useState<MCApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!instance || !token) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const [agentsRes, approvalsRes] = await Promise.all([
          fetch("/api/mission-control/agents", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/mission-control/approvals", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (!agentsRes.ok || !approvalsRes.ok) throw new Error("Failed to fetch");
        const agentsData = await agentsRes.json();
        const approvalsData = await approvalsRes.json();
        setAgents(agentsData);
        setApprovals(
          (approvalsData as MCApproval[]).filter((a) => a.status === "pending")
        );
      } catch {
        if (!silent) setError("Could not connect to Mission Control");
      } finally {
        setLoading(false);
      }
    },
    [instance, token]
  );

  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(() => fetchData(true), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData]);

  async function handleApproval(id: string, action: "approve" | "deny") {
    if (!token) return;
    setActioning((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/mission-control/approvals/${id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setApprovals((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // will refresh on next poll
    } finally {
      setActioning((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // Stats
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const totalTasks = agents.reduce((sum, a) => sum + a.tasks_completed, 0);
  const pendingApprovals = approvals.length;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          <p className="font-mono text-xs text-zinc-600">
            CONNECTING TO MISSION CONTROL...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <p className="font-mono text-sm text-zinc-300">{error}</p>
        <p className="max-w-sm text-center font-mono text-xs text-zinc-600">
          Ensure your instance is running and Mission Control is reachable.
        </p>
        <button
          onClick={() => fetchData()}
          className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-mono text-xs text-emerald-400 transition-colors hover:bg-emerald-500/20"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Stats Bar ---- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "TOTAL AGENTS",
            value: totalAgents,
            icon: Bot,
            accent: "text-emerald-400",
          },
          {
            label: "ACTIVE",
            value: activeAgents,
            icon: Zap,
            accent: "text-emerald-400",
          },
          {
            label: "TASKS DONE",
            value: totalTasks,
            icon: Activity,
            accent: "text-cyan-400",
          },
          {
            label: "APPROVALS",
            value: pendingApprovals,
            icon: ShieldAlert,
            accent: pendingApprovals > 0 ? "text-amber-400" : "text-zinc-500",
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-white/[0.06] bg-[#0c0c0d] p-3"
          >
            <div className="flex items-center gap-2">
              <stat.icon className={cn("h-3.5 w-3.5", stat.accent)} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                {stat.label}
              </span>
            </div>
            <p
              className={cn(
                "mt-1.5 font-mono text-2xl font-bold tabular-nums",
                stat.accent
              )}
            >
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* ---- Live indicator ---- */}
      <div className="flex items-center gap-2">
        <div className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-500/70">
          Live — Polling every 5s
        </span>
      </div>

      {/* ---- Agent Grid ---- */}
      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-white/[0.06] bg-[#0c0c0d] py-16">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <Bot className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="font-mono text-sm text-zinc-400">No agents connected</p>
          <p className="max-w-sm text-center font-mono text-xs text-zinc-600">
            Agents will appear here once they connect to your OpenClaw instance.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-500/50">
              Agent Registry
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/20 to-transparent" />
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {agents.map((agent) => {
              const status = statusConfig[agent.status];
              return (
                <motion.div
                  key={agent.id}
                  variants={itemVariants}
                  className="group rounded-lg border border-white/[0.06] bg-[#0c0c0d] transition-all hover:border-emerald-500/15 hover:shadow-[0_0_20px_rgba(16,185,129,0.04)]"
                >
                  {/* Top glow line */}
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                          <Bot className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-bold tracking-tight text-zinc-200">
                            {agent.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-zinc-700" />
                            <span className="font-mono text-[10px] text-zinc-600">
                              {relativeTime(agent.last_active)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-2 py-0.5",
                          status.bg
                        )}
                      >
                        <span className="relative flex h-1.5 w-1.5">
                          {agent.status === "active" && (
                            <span
                              className={cn(
                                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-50",
                                status.dot
                              )}
                            />
                          )}
                          <span
                            className={cn(
                              "relative inline-flex h-1.5 w-1.5 rounded-full",
                              status.dot
                            )}
                          />
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[10px] font-bold tracking-wider",
                            status.text
                          )}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-4 space-y-2 rounded-md border border-white/[0.04] bg-white/[0.01] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                          Resources
                        </span>
                        <span className="font-mono text-[10px] tabular-nums text-emerald-500/70">
                          {agent.tasks_completed} tasks
                        </span>
                      </div>
                      <ResourceBar
                        value={agent.cpu_usage}
                        icon={Cpu}
                        label="CPU"
                      />
                      <ResourceBar
                        value={agent.memory_usage}
                        icon={MemoryStick}
                        label="MEM"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}

      {/* ---- Pending Approvals ---- */}
      <AnimatePresence>
        {approvals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-amber-500/20 to-transparent" />
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-amber-500/70">
                Pending Approvals
              </span>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-400">
                {approvals.length}
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-amber-500/20 to-transparent" />
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {approvals.map((approval) => (
                <motion.div
                  key={approval.id}
                  variants={itemVariants}
                  className="relative overflow-hidden rounded-lg border border-amber-500/15 bg-[#0c0c0d]"
                >
                  {/* Scanline overlay */}
                  <div
                    className="pointer-events-none absolute inset-0 z-10 opacity-[0.02]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(245,158,11,0.15) 2px, rgba(245,158,11,0.15) 4px)",
                    }}
                  />

                  <div className="relative z-20 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Bot className="h-3.5 w-3.5 text-amber-400" />
                        <span className="font-mono text-sm font-bold text-zinc-200">
                          {approval.agent_name}
                        </span>
                        <span className="rounded border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-zinc-500">
                          {approval.action}
                        </span>
                      </div>
                      <div className="mt-2 rounded-md border border-white/[0.06] bg-black/40 px-3 py-2">
                        <code className="font-mono text-xs text-amber-300/80">
                          {approval.command}
                        </code>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-zinc-700" />
                        <span className="font-mono text-[10px] text-zinc-600">
                          {relativeTime(approval.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handleApproval(approval.id, "approve")}
                        disabled={actioning.has(approval.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-mono text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500/20 hover:shadow-[0_0_12px_rgba(16,185,129,0.2)] disabled:opacity-50"
                      >
                        {actioning.has(approval.id) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        APPROVE
                      </button>
                      <button
                        onClick={() => handleApproval(approval.id, "deny")}
                        disabled={actioning.has(approval.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 font-mono text-xs font-bold text-red-400 transition-all hover:bg-red-500/20 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] disabled:opacity-50"
                      >
                        {actioning.has(approval.id) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        DENY
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
