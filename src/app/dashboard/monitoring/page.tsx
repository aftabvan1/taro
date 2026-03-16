"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  MemoryStick,
  Network,
  Container,
  RefreshCw,
  Clock,
  ServerOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "../layout";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ContainerStats {
  cpu_percent: number;
  memory_usage: number;
  memory_limit: number;
  network_rx: number;
  network_tx: number;
  pids: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const idx = Math.min(i, units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Animated number                                                    */
/* ------------------------------------------------------------------ */

function AnimatedValue({
  value,
  suffix = "",
  className,
}: {
  value: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={className}
      >
        {value}
        {suffix}
      </motion.span>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Glass card                                                         */
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
/*  Progress bar                                                       */
/* ------------------------------------------------------------------ */

function ProgressBar({
  percent,
  colorClass = "bg-brand",
}: {
  percent: number;
  colorClass?: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <motion.div
        className={cn("h-full rounded-full", colorClass)}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Placeholder card                                                   */
/* ------------------------------------------------------------------ */

function PlaceholderCard({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <GlassCard>
      <div className="flex items-center gap-2 text-sm text-muted">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold">&mdash;</p>
    </GlassCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const POLL_INTERVAL = 5000;

export default function MonitoringPage() {
  const { instance, loading, token } = useDashboard();

  const [stats, setStats] = useState<ContainerStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- Fetch stats ---- */
  const fetchStats = useCallback(async () => {
    if (!instance || !token) return;
    try {
      setFetching(true);
      const res = await fetch(`/api/instances/${instance.id}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Failed to fetch stats",
        );
      }
      const data: ContainerStats = await res.json();
      setStats(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch stats",
      );
      setStats(null);
    } finally {
      setFetching(false);
    }
  }, [instance, token]);

  /* ---- Polling ---- */
  useEffect(() => {
    if (!instance || !token) return;

    fetchStats();
    intervalRef.current = setInterval(fetchStats, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [instance, token, fetchStats]);

  /* ---- Loading skeleton ---- */
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-white/[0.06]"
            />
          ))}
        </div>
      </div>
    );
  }

  /* ---- No instance ---- */
  if (!instance) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex h-full flex-col items-center justify-center gap-6"
      >
        <div className="rounded-full border border-white/10 bg-white/[0.03] p-6">
          <ServerOff className="h-10 w-10 text-muted" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">No instance selected</h2>
          <p className="mt-2 text-sm text-muted">
            Create or select an instance to view monitoring data.
          </p>
        </div>
      </motion.div>
    );
  }

  /* ---- Derived values ---- */
  const cpuPercent = stats?.cpu_percent ?? 0;
  const memPercent =
    stats && stats.memory_limit > 0
      ? (stats.memory_usage / stats.memory_limit) * 100
      : 0;
  const cpuColor =
    cpuPercent > 80
      ? "bg-red-500"
      : cpuPercent > 50
        ? "bg-amber-400"
        : "bg-brand";
  const memColor =
    memPercent > 80
      ? "bg-red-500"
      : memPercent > 50
        ? "bg-amber-400"
        : "bg-brand";

  const showPlaceholders = !stats && (error || instance.status !== "running");

  /* ---- Placeholder state ---- */
  if (showPlaceholders) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Monitoring</h1>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PlaceholderCard
            icon={<Cpu className="h-3.5 w-3.5" />}
            label="CPU Usage"
          />
          <PlaceholderCard
            icon={<MemoryStick className="h-3.5 w-3.5" />}
            label="Memory"
          />
          <PlaceholderCard
            icon={<Network className="h-3.5 w-3.5" />}
            label="Network I/O"
          />
          <PlaceholderCard
            icon={<Container className="h-3.5 w-3.5" />}
            label="Container"
          />
        </div>
      </motion.div>
    );
  }

  /* ---- Main monitoring view ---- */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Monitoring</h1>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Clock className="h-3 w-3" />
              Last updated {formatTime(lastUpdated)}
            </span>
          )}
          <button
            onClick={fetchStats}
            disabled={fetching}
            className="rounded-md p-1.5 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
            aria-label="Refresh stats"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 text-muted",
                fetching && "animate-spin",
              )}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* CPU */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0, duration: 0.4 }}
        >
          <GlassCard className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Cpu className="h-3.5 w-3.5" />
              CPU Usage
            </div>
            <div className="text-2xl font-semibold">
              <AnimatedValue
                value={cpuPercent.toFixed(1)}
                suffix="%"
              />
            </div>
            <ProgressBar percent={cpuPercent} colorClass={cpuColor} />
          </GlassCard>
        </motion.div>

        {/* Memory */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
        >
          <GlassCard className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-muted">
              <MemoryStick className="h-3.5 w-3.5" />
              Memory
            </div>
            <div className="text-2xl font-semibold">
              <AnimatedValue
                value={stats ? formatBytes(stats.memory_usage) : "\u2014"}
              />
            </div>
            <ProgressBar percent={memPercent} colorClass={memColor} />
            <p className="text-xs text-muted">
              {stats
                ? `${formatBytes(stats.memory_usage)} / ${formatBytes(stats.memory_limit)}`
                : "\u2014"}
            </p>
          </GlassCard>
        </motion.div>

        {/* Network I/O */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <GlassCard className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Network className="h-3.5 w-3.5" />
              Network I/O
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">RX</span>
                <span className="font-mono text-sm font-medium">
                  <AnimatedValue
                    value={stats ? formatBytes(stats.network_rx) : "\u2014"}
                  />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">TX</span>
                <span className="font-mono text-sm font-medium">
                  <AnimatedValue
                    value={stats ? formatBytes(stats.network_tx) : "\u2014"}
                  />
                </span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Container Status */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <GlassCard className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Container className="h-3.5 w-3.5" />
              Container
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  instance.status === "running"
                    ? "bg-emerald-400"
                    : instance.status === "error"
                      ? "bg-red-500"
                      : "bg-zinc-500",
                )}
              />
              <span className="text-xl font-semibold capitalize">
                {instance.status}
              </span>
            </div>
            {stats && (
              <p className="text-xs text-muted">
                {stats.pids} active process{stats.pids !== 1 ? "es" : ""}
              </p>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
