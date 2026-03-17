"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock,
  Inbox,
  LayoutGrid,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  Rocket,
  RotateCcw,
  Shield,
  ShieldCheck,
  Square,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import { dashboardContainer, dashboardItemBlur } from "@/lib/animation-variants";
import { useDashboard } from "./layout";
import { ConnectionStatus } from "@/components/dashboard/connection-status";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardStats {
  activeAgents: number;
  totalTasks: number;
  inbox: number;
  inProgress: number;
  review: number;
  pendingApprovals: number;
}

interface TaskBreakdown {
  inbox: number;
  todo: number;
  in_progress: number;
  review: number;
  done: number;
}

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

interface DashboardData {
  stats: DashboardStats;
  taskBreakdown: TaskBreakdown;
  recentActivity: ActivityItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const containerVariants = dashboardContainer;
const itemVariants = dashboardItemBlur;

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

// ---------------------------------------------------------------------------
// Panel card
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
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  glowColor: string;
}

function StatCard({ label, value, icon, color, glowColor }: StatCardProps) {
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn("flex h-6 w-6 items-center justify-center rounded-md border border-white/[0.06]", glowColor)}>
            {icon}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            {label}
          </span>
        </div>
      </div>
      <p className={cn("mt-3 font-mono text-3xl font-bold tabular-nums", color)}>
        {value}
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Tasks Breakdown Bar
// ---------------------------------------------------------------------------

interface TasksBreakdownBarProps {
  breakdown: TaskBreakdown;
}

const breakdownSegments: {
  key: keyof TaskBreakdown;
  label: string;
  color: string;
  bg: string;
}[] = [
  { key: "inbox", label: "Inbox", color: "text-blue-400", bg: "bg-blue-500" },
  { key: "todo", label: "Todo", color: "text-zinc-400", bg: "bg-zinc-500" },
  { key: "in_progress", label: "In Progress", color: "text-amber-400", bg: "bg-amber-500" },
  { key: "review", label: "Review", color: "text-violet-400", bg: "bg-violet-500" },
  { key: "done", label: "Done", color: "text-emerald-400", bg: "bg-emerald-500" },
];

function TasksBreakdownBar({ breakdown }: TasksBreakdownBarProps) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return (
    <Panel label="tasks breakdown">
      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <ClipboardList className="h-6 w-6 text-zinc-800" />
          <p className="font-mono text-xs text-zinc-600">No tasks yet</p>
        </div>
      ) : (
        <>
          {/* Stacked bar */}
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-white/[0.04]">
            {breakdownSegments.map((seg) => {
              const pct = total > 0 ? (breakdown[seg.key] / total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <motion.div
                  key={seg.key}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={cn("h-full first:rounded-l-full last:rounded-r-full", seg.bg)}
                  title={`${seg.label}: ${breakdown[seg.key]}`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {breakdownSegments.map((seg) => (
              <div key={seg.key} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", seg.bg)} />
                <span className="font-mono text-[10px] text-zinc-500">
                  {seg.label}
                </span>
                <span className={cn("font-mono text-[11px] font-bold tabular-nums", seg.color)}>
                  {breakdown[seg.key]}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardOverview() {
  const router = useRouter();
  const { instance, instances, loading, token, refreshInstances } =
    useDashboard();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  /* Create instance form state */
  const [newName, setNewName] = useState("");
  const [newRegion, setNewRegion] = useState("us-east");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /* Instance actions state */
  const [syncing, setSyncing] = useState(false);

  /* Getting started state */
  const [agentCount, setAgentCount] = useState<number | null>(null);
  const [boardCount, setBoardCount] = useState<number | null>(null);

  /* ---- Push sync daemon update ---- */
  const handlePushSync = useCallback(async () => {
    if (!token || !instance) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/instances/${instance.id}/update-sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
    } catch {
      // ConnectionStatus will re-check automatically
    } finally {
      setSyncing(false);
    }
  }, [token, instance]);

  /* ---- Fetch dashboard data ---- */
  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/mission-control/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const data = await res.json();
      const payload: DashboardData = data.data ?? data;
      setDashboardData(payload);
      setDataError(null);
    } catch {
      // Only set error on first load, not polling failures
      if (!dashboardData) {
        setDataError("Unable to load dashboard data");
      }
    } finally {
      setDataLoading(false);
    }
  }, [token, dashboardData]);

  // Initial fetch + agent/board counts for getting started
  useEffect(() => {
    if (!token) return;
    fetchDashboard();

    // Fetch counts for getting started flow
    const fetchCounts = async () => {
      try {
        const [agentsRes, boardsRes] = await Promise.all([
          fetch("/api/mission-control/agents", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/mission-control/boards", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (agentsRes.ok) {
          const agents = await agentsRes.json();
          setAgentCount(Array.isArray(agents) ? agents.length : 0);
        }
        if (boardsRes.ok) {
          const boards = await boardsRes.json();
          setBoardCount(Array.isArray(boards) ? boards.length : 0);
        }
      } catch {
        // non-critical
      }
    };
    fetchCounts();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // 10-second polling
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchDashboard();
    }, 10_000);
    return () => clearInterval(interval);
  }, [token, fetchDashboard]);

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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
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
  const stats = dashboardData?.stats ?? {
    activeAgents: 0,
    totalTasks: 0,
    inbox: 0,
    inProgress: 0,
    review: 0,
    pendingApprovals: 0,
  };

  const taskBreakdown = dashboardData?.taskBreakdown ?? {
    inbox: 0,
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  };

  const recentActivity = dashboardData?.recentActivity ?? [];

  // Determine if user is "new" (no agents AND no tasks)
  const isNewUser =
    agentCount !== null &&
    boardCount !== null &&
    agentCount === 0 &&
    stats.totalTasks === 0;

  const hasDispatched = dashboardData
    ? stats.inProgress > 0 || taskBreakdown.done > 0
    : false;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      {/* ================================================================== */}
      {/* CONNECTION STATUS (always visible when instance exists)             */}
      {/* ================================================================== */}
      {instance && token && (
        <motion.div variants={itemVariants}>
          <ConnectionStatus
            token={token}
            onPushSync={handlePushSync}
            pushSyncing={syncing}
          />
        </motion.div>
      )}

      {/* ================================================================== */}
      {/* GETTING STARTED (shown for new users)                               */}
      {/* ================================================================== */}
      {instance && isNewUser && (
        <motion.div variants={itemVariants}>
          <Panel label="getting started">
            <div className="space-y-3">
              <p className="font-mono text-xs text-zinc-400">
                Follow these steps to get your first agent working.
              </p>

              {/* Step 1: OpenClaw Connected — handled by ConnectionStatus above */}
              <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                    <span className="font-mono text-[10px] font-bold text-emerald-400">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-xs font-bold text-zinc-300">Connect to OpenClaw</p>
                    <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
                      If OpenClaw is unreachable above, click &quot;Push Sync&quot; to push the latest config.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Create Agent */}
              <button
                onClick={() => router.push("/dashboard/agents")}
                className="group w-full rounded-lg border border-violet-500/15 bg-violet-500/[0.03] p-3 text-left transition-all hover:border-violet-500/25 hover:bg-violet-500/[0.06]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10">
                    {agentCount && agentCount > 0 ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <span className="font-mono text-[10px] font-bold text-violet-400">2</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-xs font-bold text-zinc-300">Create Your First Agent</p>
                    <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
                      Agents are AI workers that execute tasks autonomously through OpenClaw.
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-400" />
                </div>
              </button>

              {/* Step 3: Create Board + Tasks */}
              <button
                onClick={() => router.push("/dashboard/boards")}
                className="group w-full rounded-lg border border-white/[0.04] bg-white/[0.01] p-3 text-left transition-all hover:border-blue-500/20 hover:bg-blue-500/[0.03]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-white/[0.02]">
                    {boardCount && boardCount > 0 ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <span className="font-mono text-[10px] font-bold text-zinc-600">3</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-xs font-bold text-zinc-400">Create a Board & Add Tasks</p>
                    <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
                      Boards organize tasks into a workflow: Inbox → In Progress → Review → Done.
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-400" />
                </div>
              </button>

              {/* Step 4: Dispatch */}
              <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-white/[0.02]">
                    {hasDispatched ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <span className="font-mono text-[10px] font-bold text-zinc-600">4</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-xs font-bold text-zinc-400">Dispatch a Task</p>
                    <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
                      Assign an agent to a task, then hit Dispatch. The agent will execute it through OpenClaw.
                    </p>
                  </div>
                  <Zap className="h-4 w-4 text-zinc-700" />
                </div>
              </div>
            </div>
          </Panel>
        </motion.div>
      )}

      {/* ================================================================== */}
      {/* KPI STAT CARDS                                                      */}
      {/* ================================================================== */}
      <motion.div variants={itemVariants}>
        {dataLoading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : dataError && !dashboardData ? (
          <Panel>
            <div className="flex items-center gap-2 font-mono text-xs text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {dataError}
            </div>
          </Panel>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Active Agents"
              value={stats.activeAgents}
              icon={<Bot className="h-3.5 w-3.5 text-emerald-400" />}
              color="text-emerald-400"
              glowColor="bg-emerald-500/[0.08]"
            />
            <StatCard
              label="Total Tasks"
              value={stats.totalTasks}
              icon={<ClipboardList className="h-3.5 w-3.5 text-blue-400" />}
              color="text-blue-400"
              glowColor="bg-blue-500/[0.08]"
            />
            <StatCard
              label="Inbox"
              value={stats.inbox}
              icon={<Inbox className="h-3.5 w-3.5 text-cyan-400" />}
              color="text-cyan-400"
              glowColor="bg-cyan-500/[0.08]"
            />
            <StatCard
              label="In Progress"
              value={stats.inProgress}
              icon={<Clock className="h-3.5 w-3.5 text-amber-400" />}
              color="text-amber-400"
              glowColor="bg-amber-500/[0.08]"
            />
            <StatCard
              label="Review"
              value={stats.review}
              icon={<MessageSquare className="h-3.5 w-3.5 text-violet-400" />}
              color="text-violet-400"
              glowColor="bg-violet-500/[0.08]"
            />
            <StatCard
              label="Pending Approvals"
              value={stats.pendingApprovals}
              icon={<ShieldCheck className="h-3.5 w-3.5 text-rose-400" />}
              color="text-rose-400"
              glowColor="bg-rose-500/[0.08]"
            />
          </div>
        )}
      </motion.div>

      {/* ================================================================== */}
      {/* TASKS BREAKDOWN BAR                                                 */}
      {/* ================================================================== */}
      <motion.div variants={itemVariants}>
        <TasksBreakdownBar breakdown={taskBreakdown} />
      </motion.div>

      {/* ================================================================== */}
      {/* RECENT ACTIVITY FEED                                                */}
      {/* ================================================================== */}
      <motion.div variants={itemVariants}>
        <Panel label="recent activity">
          {dataLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-6 w-6 text-zinc-800" />
              <p className="font-mono text-xs text-zinc-600">
                No recent activity
              </p>
            </div>
          ) : (
            <div className="relative flex flex-col">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-3 bottom-3 w-px bg-white/[0.04]" />

              {recentActivity.slice(0, 10).map((item, idx) => (
                <div
                  key={item.id}
                  className={cn(
                    "relative flex items-start gap-3 py-2.5 pl-1",
                    idx !== Math.min(recentActivity.length, 10) - 1 && "border-b border-white/[0.03]"
                  )}
                >
                  {/* Timeline dot */}
                  <span className="relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-[#0c0c0d]">
                    {activityIcon[item.type] ?? (
                      <Activity className="h-3.5 w-3.5 text-zinc-600" />
                    )}
                  </span>

                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pt-1">
                    <span className="flex-1 truncate font-mono text-xs text-zinc-400">
                      {item.message}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-zinc-600">
                      {relativeTime(item.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </motion.div>
    </motion.div>
  );
}
