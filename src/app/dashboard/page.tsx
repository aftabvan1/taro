"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  Radar,
  Rocket,
  RotateCcw,
  Shield,
  Square,
  Terminal,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "./layout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusMeta: Record<
  string,
  { color: string; glow: string; label: string; textColor: string }
> = {
  running: {
    color: "bg-emerald-500",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.4)]",
    label: "ONLINE",
    textColor: "text-emerald-400",
  },
  provisioning: {
    color: "bg-amber-500",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.4)]",
    label: "BOOTING",
    textColor: "text-amber-400",
  },
  stopped: {
    color: "bg-zinc-600",
    glow: "",
    label: "OFFLINE",
    textColor: "text-zinc-500",
  },
  error: {
    color: "bg-red-500",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.4)]",
    label: "FAULT",
    textColor: "text-red-400",
  },
};

const activityIcon: Record<string, React.ReactNode> = {
  deploy: <Rocket className="h-3.5 w-3.5 text-emerald-400" />,
  restart: <RotateCcw className="h-3.5 w-3.5 text-amber-400" />,
  stop: <Square className="h-3.5 w-3.5 text-zinc-400" />,
  start: <Play className="h-3.5 w-3.5 text-emerald-400" />,
  backup: <Archive className="h-3.5 w-3.5 text-blue-400" />,
  restore: <Archive className="h-3.5 w-3.5 text-violet-400" />,
  approval: <Shield className="h-3.5 w-3.5 text-emerald-400" />,
  error: <XCircle className="h-3.5 w-3.5 text-red-400" />,
};

function relativeTime(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function uptimeStr(createdAt: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

// ---------------------------------------------------------------------------
// Panel card (command center style)
// ---------------------------------------------------------------------------

function Panel({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-lg border border-white/[0.06] bg-[#0c0c0d] p-4",
        className
      )}
    >
      {label && (
        <div className="mb-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-500/50">
            {label}
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/30 to-transparent" />
        </div>
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-white/[0.04]", className)}
    />
  );
}

// ---------------------------------------------------------------------------
// Live uptime counter
// ---------------------------------------------------------------------------

function UptimeCounter({ createdAt }: { createdAt: string }) {
  const [display, setDisplay] = useState(uptimeStr(createdAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(uptimeStr(createdAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return <>{display}</>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardOverview() {
  const router = useRouter();
  const { instance, instances, loading, token, refreshInstances } =
    useDashboard();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  /* Create instance form state */
  const [newName, setNewName] = useState("");
  const [newRegion, setNewRegion] = useState("us-east");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
        // API returns {data: ActivityItem[]}
        const list = Array.isArray(data.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];
        setActivities(list);
      } catch {
        setActivities([]);
      } finally {
        setActivityLoading(false);
      }
    })();
  }, [token]);

  /* ---- Quick actions ---- */
  const openWebChat = useCallback(() => {
    if (!instance?.serverIp || !instance?.openclawPort) return;
    window.open(
      `http://${instance.serverIp}:${instance.openclawPort}`,
      "_blank"
    );
  }, [instance]);

  const openMissionControl = useCallback(() => {
    if (!instance?.serverIp) return;
    window.open(`http://${instance.serverIp}:10002`, "_blank");
  }, [instance]);

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
          (body as { error?: string }).error ?? "Backup failed"
        );
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Backup failed"
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
            (body as { error?: string }).error ?? "Creation failed"
          );
        }
        setNewName("");
        await refreshInstances();
      } catch (err) {
        setCreateError(
          err instanceof Error ? err.message : "Creation failed"
        );
      } finally {
        setCreating(false);
      }
    },
    [token, newName, newRegion, refreshInstances]
  );

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  /* ---- No instances: create form ---- */
  if (!instances.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center gap-8 py-16"
      >
        {/* Terminal-style header */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <Plus className="h-8 w-8 text-emerald-400" />
          </div>
          <div className="text-center">
            <h2 className="font-mono text-xl font-bold tracking-tight text-zinc-200">
              INITIALIZE INSTANCE
            </h2>
            <p className="mt-1 font-mono text-xs text-zinc-600">
              Deploy an OpenClaw agent to begin operations
            </p>
          </div>
        </div>

        <Panel className="w-full max-w-md" label="new deployment">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Instance Designation
              </span>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="my-agent-01"
                className="rounded-md border border-zinc-800 bg-black/50 px-3 py-2 font-mono text-sm text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-emerald-500/40 focus:shadow-[0_0_10px_rgba(16,185,129,0.1)]"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Region
              </span>
              <select
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                className="rounded-md border border-zinc-800 bg-black/50 px-3 py-2 font-mono text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
              >
                <option value="us-east">US-EAST (Ashburn, VA)</option>
                <option value="us-west-2">US-WEST-2 (Oregon)</option>
                <option value="eu-west-1">EU-WEST-1 (Ireland)</option>
                <option value="ap-south-1">AP-SOUTH-1 (Mumbai)</option>
              </select>
            </label>

            {createError && (
              <div className="flex items-center gap-2 font-mono text-xs text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {createError}
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              className="mt-1 flex items-center justify-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 font-mono text-sm font-bold tracking-wider text-emerald-400 transition-all hover:bg-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-40"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              DEPLOY
            </button>
          </form>
        </Panel>
      </motion.div>
    );
  }

  /* ---- Main dashboard ---- */
  const status = instance?.status ?? "stopped";
  const sm = statusMeta[status] ?? statusMeta.stopped;
  const isRunning = status === "running";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      {/* ================================================================== */}
      {/* STATUS HERO                                                        */}
      {/* ================================================================== */}
      <motion.div variants={itemVariants}>
        <Panel className="relative overflow-hidden">
          {/* Background grid pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }} />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Status orb */}
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border",
                  status === "running" && "border-emerald-500/30 bg-emerald-500/10",
                  status === "provisioning" && "border-amber-500/30 bg-amber-500/10",
                  status === "stopped" && "border-zinc-700 bg-zinc-800/50",
                  status === "error" && "border-red-500/30 bg-red-500/10",
                  sm.glow
                )}
              >
                <span className="relative flex h-3 w-3">
                  {(status === "running" || status === "provisioning") && (
                    <span
                      className={cn(
                        "absolute inline-flex h-full w-full animate-ping rounded-full opacity-40",
                        sm.color
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "relative inline-flex h-3 w-3 rounded-full",
                      sm.color
                    )}
                  />
                </span>
              </div>

              <div>
                <h1 className="font-mono text-xl font-bold tracking-tight text-zinc-100">
                  {instance?.name ?? "—"}
                </h1>
                <div className="mt-1 flex items-center gap-3">
                  <span className={cn("font-mono text-xs font-bold tracking-widest", sm.textColor)}>
                    {sm.label}
                  </span>
                  {instance?.serverIp && (
                    <span className="font-mono text-[10px] text-zinc-600">
                      {instance.serverIp}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Live uptime */}
            {isRunning && instance && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/10 bg-emerald-500/[0.04] px-3 py-2">
                <Clock className="h-3.5 w-3.5 text-emerald-500/50" />
                <span className="font-mono text-sm font-bold tabular-nums text-emerald-400">
                  <UptimeCounter createdAt={instance.createdAt} />
                </span>
                <span className="font-mono text-[10px] text-emerald-500/40">
                  UPTIME
                </span>
              </div>
            )}
          </div>
        </Panel>
      </motion.div>

      {/* ================================================================== */}
      {/* QUICK ACTIONS                                                       */}
      {/* ================================================================== */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Web Chat */}
          <button
            onClick={openWebChat}
            disabled={!instance?.serverIp || !instance?.openclawPort}
            className="group flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c0c0d] px-4 py-4 transition-all hover:border-emerald-500/20 hover:bg-emerald-500/[0.04] hover:shadow-[0_0_15px_rgba(16,185,129,0.08)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <MessageSquare className="h-5 w-5 text-emerald-400 transition-transform group-hover:scale-110" />
            <span className="font-mono text-[11px] font-bold tracking-wider text-zinc-400 group-hover:text-emerald-400">
              WEB CHAT
            </span>
          </button>

          {/* Terminal */}
          <button
            onClick={() => router.push("/dashboard/terminal")}
            className="group flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c0c0d] px-4 py-4 transition-all hover:border-amber-500/20 hover:bg-amber-500/[0.04] hover:shadow-[0_0_15px_rgba(245,158,11,0.08)]"
          >
            <Terminal className="h-5 w-5 text-amber-400 transition-transform group-hover:scale-110" />
            <span className="font-mono text-[11px] font-bold tracking-wider text-zinc-400 group-hover:text-amber-400">
              TERMINAL
            </span>
          </button>

          {/* Mission Control */}
          <button
            onClick={openMissionControl}
            disabled={!instance?.serverIp}
            className="group flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c0c0d] px-4 py-4 transition-all hover:border-violet-500/20 hover:bg-violet-500/[0.04] hover:shadow-[0_0_15px_rgba(139,92,246,0.08)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Radar className="h-5 w-5 text-violet-400 transition-transform group-hover:scale-110" />
            <span className="font-mono text-[11px] font-bold tracking-wider text-zinc-400 group-hover:text-violet-400">
              MISSION CTRL
            </span>
          </button>

          {/* Create Backup */}
          <button
            onClick={createBackup}
            disabled={!isRunning || actionLoading === "backup"}
            className="group flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c0c0d] px-4 py-4 transition-all hover:border-blue-500/20 hover:bg-blue-500/[0.04] hover:shadow-[0_0_15px_rgba(59,130,246,0.08)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            {actionLoading === "backup" ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            ) : (
              <Archive className="h-5 w-5 text-blue-400 transition-transform group-hover:scale-110" />
            )}
            <span className="font-mono text-[11px] font-bold tracking-wider text-zinc-400 group-hover:text-blue-400">
              BACKUP
            </span>
          </button>
        </div>

        {actionError && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/[0.06] px-3 py-2 font-mono text-xs text-red-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {actionError}
          </div>
        )}
      </motion.div>

      {/* ================================================================== */}
      {/* STATS GRID                                                          */}
      {/* ================================================================== */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* Instance Status */}
          <Panel>
            <div className="flex items-center gap-1.5">
              <div className={cn("h-1.5 w-1.5 rounded-full", sm.color)} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                Status
              </span>
            </div>
            <p className={cn("mt-2 font-mono text-2xl font-bold tabular-nums", sm.textColor)}>
              {sm.label}
            </p>
          </Panel>

          {/* Region */}
          <Panel>
            <div className="flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-zinc-600" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                Region
              </span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-zinc-300">
              {instance?.region ?? "---"}
            </p>
          </Panel>

          {/* Uptime */}
          <Panel>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-zinc-600" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                Uptime
              </span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-zinc-300">
              {instance && isRunning ? (
                <UptimeCounter createdAt={instance.createdAt} />
              ) : (
                "---"
              )}
            </p>
          </Panel>

          {/* Active Since */}
          <Panel>
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-zinc-600" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                Active Since
              </span>
            </div>
            <p className="mt-2 font-mono text-lg font-bold tabular-nums text-zinc-300">
              {instance
                ? new Date(instance.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "---"}
            </p>
          </Panel>
        </div>
      </motion.div>

      {/* ================================================================== */}
      {/* ACTIVITY FEED                                                       */}
      {/* ================================================================== */}
      <motion.div variants={itemVariants}>
        <Panel label="activity log">
          {activityLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-6 w-6 text-zinc-800" />
              <p className="font-mono text-xs text-zinc-600">
                No activity recorded
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Column headers */}
              <div className="mb-1 flex items-center gap-3 px-3 py-1">
                <span className="w-6 font-mono text-[9px] uppercase tracking-widest text-zinc-700">
                  Type
                </span>
                <span className="flex-1 font-mono text-[9px] uppercase tracking-widest text-zinc-700">
                  Event
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-700">
                  Time
                </span>
              </div>

              <div className="h-px w-full bg-white/[0.04]" />

              {activities.map((item, idx) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.02]",
                    idx !== activities.length - 1 && "border-b border-white/[0.03]"
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-white/[0.06] bg-white/[0.02]">
                    {activityIcon[item.type] ?? (
                      <Activity className="h-3.5 w-3.5 text-zinc-600" />
                    )}
                  </span>
                  <span className="flex-1 font-mono text-xs text-zinc-400">
                    {item.message}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-zinc-600">
                    {relativeTime(item.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </motion.div>
    </motion.div>
  );
}
