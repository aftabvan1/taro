"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Circle,
  Clock,
  Globe,
  Bot,
  Play,
  Square,
  RotateCcw,
  Archive,
  Rocket,
  AlertTriangle,
  CheckCircle2,
  Shield,
  XCircle,
  Plus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "./layout";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ActivityItem {
  id: string;
  type:
    | "deploy"
    | "restart"
    | "stop"
    | "start"
    | "backup"
    | "restore"
    | "approval"
    | "error";
  message: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusColor: Record<string, string> = {
  provisioning: "bg-amber-400",
  running: "bg-emerald-400",
  stopped: "bg-zinc-500",
  error: "bg-red-500",
};

const activityIcon: Record<string, React.ReactNode> = {
  deploy: <Rocket className="h-4 w-4 text-brand" />,
  restart: <RotateCcw className="h-4 w-4 text-amber-400" />,
  stop: <Square className="h-4 w-4 text-zinc-400" />,
  start: <Play className="h-4 w-4 text-emerald-400" />,
  backup: <Archive className="h-4 w-4 text-blue-400" />,
  restore: <Archive className="h-4 w-4 text-violet-400" />,
  approval: <Shield className="h-4 w-4 text-brand" />,
  error: <XCircle className="h-4 w-4 text-red-400" />,
};

function relativeTime(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function uptime(createdAt: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 1000,
  );
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/* ------------------------------------------------------------------ */
/*  Glass Card                                                         */
/* ------------------------------------------------------------------ */

function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton helpers                                                   */
/* ------------------------------------------------------------------ */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-white/[0.06]",
        className,
      )}
    />
  );
}

function StatSkeleton() {
  return (
    <GlassCard className="flex flex-col gap-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
    </GlassCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DashboardOverview() {
  const { instance, instances, loading, token, refreshInstances } =
    useDashboard();

  const [agentCount, setAgentCount] = useState<number | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  /* Create instance form state */
  const [newName, setNewName] = useState("");
  const [newRegion, setNewRegion] = useState("us-east-1");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /* ---- Fetch agents ---- */
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch("/api/mission-control/agents", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAgentCount(Array.isArray(data) ? data.length : 0);
      } catch {
        setAgentCount(null);
      }
    })();
  }, [token]);

  /* ---- Fetch activity ---- */
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setActivityLoading(true);
        const res = await fetch("/api/activity", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setActivities(Array.isArray(data) ? data : []);
      } catch {
        setActivities([]);
      } finally {
        setActivityLoading(false);
      }
    })();
  }, [token]);

  /* ---- Quick actions ---- */
  const performAction = useCallback(
    async (action: "start" | "stop" | "restart") => {
      if (!instance || !token) return;
      try {
        setActionLoading(action);
        setActionError(null);
        const res = await fetch(`/api/instances/${instance.id}/${action}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ?? `Failed to ${action}`,
          );
        }
        await refreshInstances();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : `Failed to ${action}`,
        );
      } finally {
        setActionLoading(null);
      }
    },
    [instance, token, refreshInstances],
  );

  const createBackup = useCallback(async () => {
    if (!instance || !token) return;
    try {
      setActionLoading("backup");
      setActionError(null);
      const res = await fetch("/api/backups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ instanceId: instance.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Failed to create backup",
        );
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to create backup",
      );
    } finally {
      setActionLoading(null);
    }
  }, [instance, token]);

  /* ---- Create instance ---- */
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!token || !newName.trim()) return;
      try {
        setCreating(true);
        setCreateError(null);
        const res = await fetch("/api/instances", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: newName.trim(), region: newRegion }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ?? "Failed to create instance",
          );
        }
        setNewName("");
        await refreshInstances();
      } catch (err) {
        setCreateError(
          err instanceof Error ? err.message : "Failed to create instance",
        );
      } finally {
        setCreating(false);
      }
    },
    [token, newName, newRegion, refreshInstances],
  );

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  /* ---- No instances ---- */
  if (!instances.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center gap-8 py-20"
      >
        <div className="rounded-full border border-white/10 bg-white/[0.03] p-6">
          <Plus className="h-10 w-10 text-brand" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Create your first instance</h2>
          <p className="mt-2 text-muted">
            Deploy an OpenClaw instance to get started.
          </p>
        </div>

        <GlassCard className="w-full max-w-md">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted">Instance name</span>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="my-agent"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-brand/50 focus:ring-1 focus:ring-brand/30"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted">Region</span>
              <select
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30"
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">EU West (Ireland)</option>
                <option value="ap-south-1">Asia Pacific (Mumbai)</option>
              </select>
            </label>

            {createError && (
              <p className="text-sm text-red-400">{createError}</p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Instance
            </button>
          </form>
        </GlassCard>
      </motion.div>
    );
  }

  /* ---- Main dashboard ---- */
  const isRunning = instance?.status === "running";
  const isStopped = instance?.status === "stopped";

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="mt-1 text-muted">
          {instance ? (
            <>
              Instance{" "}
              <span className="font-mono text-foreground">{instance.name}</span>{" "}
              is{" "}
              <span
                className={cn(
                  "font-medium",
                  instance.status === "running" && "text-emerald-400",
                  instance.status === "stopped" && "text-zinc-400",
                  instance.status === "provisioning" && "text-amber-400",
                  instance.status === "error" && "text-red-400",
                )}
              >
                {instance.status}
              </span>
            </>
          ) : (
            "Select an instance to get started."
          )}
        </p>
      </motion.div>

      {/* Quick stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* Status */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Circle className="h-3.5 w-3.5" />
              Status
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  statusColor[instance?.status ?? "stopped"],
                )}
              />
              <span className="text-xl font-semibold capitalize">
                {instance?.status ?? "N/A"}
              </span>
            </div>
          </GlassCard>
        </motion.div>

        {/* Uptime */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Clock className="h-3.5 w-3.5" />
              Uptime
            </div>
            <p className="mt-3 text-xl font-semibold">
              {instance && isRunning ? uptime(instance.createdAt) : "\u2014"}
            </p>
          </GlassCard>
        </motion.div>

        {/* Region */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Globe className="h-3.5 w-3.5" />
              Region
            </div>
            <p className="mt-3 font-mono text-xl font-semibold">
              {instance?.region ?? "\u2014"}
            </p>
          </GlassCard>
        </motion.div>

        {/* Active Agents */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Bot className="h-3.5 w-3.5" />
              Active Agents
            </div>
            <p className="mt-3 text-xl font-semibold">
              {agentCount !== null ? agentCount : "\u2014"}
            </p>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <GlassCard>
          <h2 className="text-sm font-medium text-muted">Quick Actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              disabled={
                !instance || isRunning || actionLoading !== null
              }
              onClick={() => performAction("start")}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionLoading === "start" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 text-emerald-400" />
              )}
              Start
            </button>

            <button
              disabled={
                !instance || !isRunning || actionLoading !== null
              }
              onClick={() => performAction("stop")}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionLoading === "stop" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4 text-zinc-400" />
              )}
              Stop
            </button>

            <button
              disabled={
                !instance || !isRunning || actionLoading !== null
              }
              onClick={() => performAction("restart")}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionLoading === "restart" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 text-amber-400" />
              )}
              Restart
            </button>

            <button
              disabled={
                !instance || !isRunning || actionLoading !== null
              }
              onClick={createBackup}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionLoading === "backup" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 text-blue-400" />
              )}
              Create Backup
            </button>
          </div>

          {actionError && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4" />
              {actionError}
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Activity feed */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <GlassCard>
          <div className="flex items-center gap-2 text-sm font-medium text-muted">
            <Activity className="h-4 w-4" />
            Recent Activity
          </div>

          {activityLoading ? (
            <div className="mt-4 flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-white/20" />
              <p className="text-sm text-muted">No recent activity</p>
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-1">
              {activities.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                    {activityIcon[item.type] ?? (
                      <Activity className="h-4 w-4 text-muted" />
                    )}
                  </span>
                  <span className="flex-1 text-sm">{item.message}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {relativeTime(item.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
