"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "../layout";
import type { MCAgent, MCApproval } from "@/lib/mission-control/types";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
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
  active: { label: "Active", className: "bg-emerald-500/15 text-emerald-400" },
  pending: { label: "Pending", className: "bg-amber-500/15 text-amber-400" },
  stopped: { label: "Stopped", className: "bg-zinc-500/15 text-zinc-400" },
} as const;

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${Math.min(100, value)}%` }}
      />
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

  const fetchData = useCallback(async () => {
    if (!instance || !token) return;
    setLoading(true);
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
      if (!agentsRes.ok || !approvalsRes.ok) {
        throw new Error("Failed to fetch");
      }
      const agentsData = await agentsRes.json();
      const approvalsData = await approvalsRes.json();
      setAgents(agentsData);
      setApprovals(
        (approvalsData as MCApproval[]).filter((a) => a.status === "pending")
      );
    } catch {
      setError("Could not connect to Mission Control");
    } finally {
      setLoading(false);
    }
  }, [instance, token]);

  useEffect(() => {
    fetchData();
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
      // silently fail — will show on next refresh
    } finally {
      setActioning((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-400" />
        <p className="text-lg font-medium">{error}</p>
        <p className="text-sm text-muted">
          Make sure your instance is running and Mission Control is accessible.
        </p>
        <button
          onClick={fetchData}
          className="mt-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm transition-colors hover:bg-white/[0.08]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (agents.length === 0 && approvals.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <Bot className="h-10 w-10 text-muted" />
        </div>
        <p className="text-lg font-medium">No agents running</p>
        <p className="max-w-sm text-sm text-muted">
          Agents will appear here once they connect to Mission Control.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Agents Grid */}
      <div>
        <h2 className="mb-5 text-lg font-semibold">Agents</h2>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {agents.map((agent) => {
            const status = statusConfig[agent.status];
            return (
              <motion.div
                key={agent.id}
                variants={itemVariants}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10">
                      <Bot className="h-4 w-4 text-brand" />
                    </div>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-xs text-muted">
                        {relativeTime(agent.last_active)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      status.className
                    )}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                  <p className="mb-2 font-mono text-xs text-muted">
                    {agent.tasks_completed} tasks completed
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-3 w-3 shrink-0 text-muted" />
                      <MiniBar
                        value={agent.cpu_usage}
                        color={
                          agent.cpu_usage > 80
                            ? "bg-red-500"
                            : agent.cpu_usage > 50
                              ? "bg-amber-500"
                              : "bg-brand"
                        }
                      />
                      <span className="w-8 text-right font-mono text-xs text-muted">
                        {agent.cpu_usage}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MemoryStick className="h-3 w-3 shrink-0 text-muted" />
                      <MiniBar
                        value={agent.memory_usage}
                        color={
                          agent.memory_usage > 80
                            ? "bg-red-500"
                            : agent.memory_usage > 50
                              ? "bg-amber-500"
                              : "bg-cyan-500"
                        }
                      />
                      <span className="w-8 text-right font-mono text-xs text-muted">
                        {agent.memory_usage}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Pending Approvals */}
      {approvals.length > 0 && (
        <div>
          <div className="mb-5 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold">Pending Approvals</h2>
            <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
              {approvals.length}
            </span>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {approvals.map((approval) => (
              <motion.div
                key={approval.id}
                variants={itemVariants}
                className="flex flex-col gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{approval.agent_name}</p>
                    <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-muted">
                      {approval.action}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-sm text-muted">
                    {approval.command}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <Clock className="h-3 w-3" />
                    {relativeTime(approval.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleApproval(approval.id, "approve")}
                    disabled={actioning.has(approval.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand/15 px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/25 disabled:opacity-50"
                  >
                    {actioning.has(approval.id) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproval(approval.id, "deny")}
                    disabled={actioning.has(approval.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                  >
                    {actioning.has(approval.id) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    Deny
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}
