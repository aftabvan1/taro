"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Bot,
  RefreshCw,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "../layout";
import type { MCApproval } from "@/lib/mission-control/types";

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

type FilterTab = "all" | "pending" | "approved" | "denied";

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "denied", label: "Denied" },
];

const statusStyles = {
  pending: {
    label: "PENDING",
    bg: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-400",
    icon: ShieldAlert,
  },
  approved: {
    label: "APPROVED",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-400",
    icon: CheckCircle2,
  },
  denied: {
    label: "DENIED",
    bg: "bg-red-500/10 border-red-500/20",
    text: "text-red-400",
    icon: XCircle,
  },
} as const;

export default function ApprovalsPage() {
  const { instance, token } = useDashboard();
  const [approvals, setApprovals] = useState<MCApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [actioning, setActioning] = useState<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!instance || !token) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/mission-control/approvals", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setApprovals(data);
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
      // Update local state immediately
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: action === "approve" ? "approved" : "denied" } : a
        )
      );
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
  const pending = approvals.filter((a) => a.status === "pending");
  const approved = approvals.filter((a) => a.status === "approved");
  const denied = approvals.filter((a) => a.status === "denied");

  const filtered =
    filter === "all"
      ? approvals
      : approvals.filter((a) => a.status === filter);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          <p className="font-mono text-xs text-zinc-600">
            LOADING APPROVALS...
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
        <button
          onClick={() => fetchData()}
          className="mt-2 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 font-mono text-xs text-amber-400 transition-colors hover:bg-amber-500/20"
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
            label: "PENDING",
            value: pending.length,
            icon: ShieldAlert,
            accent: pending.length > 0 ? "text-amber-400" : "text-zinc-500",
          },
          {
            label: "APPROVED",
            value: approved.length,
            icon: CheckCircle2,
            accent: "text-emerald-400",
          },
          {
            label: "DENIED",
            value: denied.length,
            icon: XCircle,
            accent: "text-red-400",
          },
          {
            label: "TOTAL",
            value: approvals.length,
            icon: ShieldCheck,
            accent: "text-violet-400",
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

      {/* ---- Live indicator + Filter ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-amber-500/70">
            Live — Polling every 5s
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-[#0c0c0d] p-1">
          <Filter className="ml-1.5 h-3 w-3 text-zinc-600" />
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "rounded-md px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider transition-colors",
                filter === tab.key
                  ? "bg-white/[0.08] text-zinc-200"
                  : "text-zinc-600 hover:text-zinc-400"
              )}
            >
              {tab.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Approval Cards ---- */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-white/[0.06] bg-[#0c0c0d] py-16">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <ShieldCheck className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="font-mono text-sm text-zinc-400">
            {filter === "all"
              ? "No approvals yet"
              : `No ${filter} approvals`}
          </p>
          <p className="max-w-sm text-center font-mono text-xs text-zinc-600">
            {filter === "pending"
              ? "Approval requests from agents will appear here when they need permission to execute commands."
              : "Approvals will appear here once agents request permission to execute commands."}
          </p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((approval) => {
              const style = statusStyles[approval.status];
              const isPending = approval.status === "pending";

              return (
                <motion.div
                  key={approval.id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, x: -20 }}
                  className="relative overflow-hidden rounded-lg border border-white/[0.06] bg-[#0c0c0d] transition-all hover:border-white/10"
                >
                  {/* Status stripe */}
                  <div
                    className={cn(
                      "absolute left-0 top-0 h-full w-[3px]",
                      approval.status === "pending" && "bg-amber-500",
                      approval.status === "approved" && "bg-emerald-500",
                      approval.status === "denied" && "bg-red-500"
                    )}
                  />

                  <div className="flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <Bot className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="font-mono text-sm font-bold text-zinc-200">
                            {approval.agent_name}
                          </span>
                        </div>
                        <span className="rounded border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-zinc-500">
                          {approval.action}
                        </span>
                        <div
                          className={cn(
                            "flex items-center gap-1 rounded-md border px-2 py-0.5",
                            style.bg
                          )}
                        >
                          <style.icon className={cn("h-3 w-3", style.text)} />
                          <span
                            className={cn(
                              "font-mono text-[10px] font-bold tracking-wider",
                              style.text
                            )}
                          >
                            {style.label}
                          </span>
                        </div>
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

                    {isPending && (
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
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
