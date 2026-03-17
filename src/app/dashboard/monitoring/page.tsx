"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  MemoryStick,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Clock,
  ServerOff,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import { useDashboard } from "../layout";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Stats {
  cpuPercent: number;
  memoryUsageMB: number;
  memoryLimitMB: number;
  networkRxMB: number;
  networkTxMB: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatMB(mb: number): string {
  return formatBytes(mb, "mb");
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getThresholdColor(percent: number): string {
  if (percent >= 80) return "bg-red-500";
  if (percent >= 50) return "bg-amber-400";
  return "bg-emerald-500";
}

function getThresholdTextColor(percent: number): string {
  if (percent >= 80) return "text-red-400";
  if (percent >= 50) return "text-amber-400";
  return "text-emerald-400";
}

/* ------------------------------------------------------------------ */
/*  Scanline overlay                                                   */
/* ------------------------------------------------------------------ */

function ScanlineOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-[0.02]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.15) 2px, rgba(16,185,129,0.15) 4px)",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Animated value                                                     */
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
/*  Progress bar                                                       */
/* ------------------------------------------------------------------ */

function ProgressBar({
  percent,
  colorClass,
}: {
  percent: number;
  colorClass: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <motion.div
        className={cn("h-full rounded-full", colorClass)}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Metric card                                                        */
/* ------------------------------------------------------------------ */

function MetricCard({
  icon,
  label,
  value,
  suffix,
  subtext,
  percent,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  subtext?: string;
  percent?: number;
  delay?: number;
}) {
  const hasBar = percent !== undefined;
  const barColor = hasBar ? getThresholdColor(percent) : "bg-emerald-500";
  const textColor = hasBar ? getThresholdTextColor(percent) : "text-emerald-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0b] p-5"
    >
      <ScanlineOverlay />

      {/* Top glow line */}
      {hasBar && percent >= 80 && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
      )}

      <div className="relative z-20 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            {icon}
            <span className="font-mono text-xs uppercase tracking-wider">
              {label}
            </span>
          </div>
          {hasBar && (
            <span className={cn("font-mono text-xs", textColor)}>
              {percent.toFixed(1)}%
            </span>
          )}
        </div>

        <div className="font-mono text-2xl font-bold tracking-tight">
          <AnimatedValue value={value} suffix={suffix} />
        </div>

        {hasBar && <ProgressBar percent={percent} colorClass={barColor} />}

        {subtext && (
          <p className="font-mono text-xs text-zinc-600">{subtext}</p>
        )}
      </div>
    </motion.div>
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
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0b] p-5">
      <ScanlineOverlay />
      <div className="relative z-20">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          {icon}
          <span className="font-mono text-xs uppercase tracking-wider">
            {label}
          </span>
        </div>
        <p className="mt-3 font-mono text-2xl font-bold text-zinc-700">
          &mdash;
        </p>
        <div className="mt-3 h-1.5 w-full rounded-full bg-white/[0.04]" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const POLL_INTERVAL = 5000;

export default function MonitoringPage() {
  const { instance, loading, token } = useDashboard();

  const [stats, setStats] = useState<Stats | null>(null);
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
      const json = await res.json();
      const data: Stats = json.data ?? json;
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
              className="h-36 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
              style={{ animationDelay: `${i * 80}ms` }}
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
        className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center gap-6"
      >
        <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0b] p-6">
          <ServerOff className="h-10 w-10 text-zinc-600" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">No Instance Selected</h2>
          <p className="mt-2 font-mono text-xs text-zinc-500">
            SYS_STATUS: NO_TARGET
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Create or select an instance to view monitoring data.
          </p>
        </div>
      </motion.div>
    );
  }

  /* ---- Derived values ---- */
  const cpuPercent = stats?.cpuPercent ?? 0;
  const memPercent =
    stats && stats.memoryLimitMB > 0
      ? (stats.memoryUsageMB / stats.memoryLimitMB) * 100
      : 0;

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
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-emerald-500" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Monitoring
            </h1>
            <span className="font-mono text-xs text-zinc-600">
              // SYSTEM DIAGNOSTICS
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 font-mono text-xs text-red-400">
            ERR: {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PlaceholderCard
            icon={<Cpu className="h-3.5 w-3.5" />}
            label="CPU"
          />
          <PlaceholderCard
            icon={<MemoryStick className="h-3.5 w-3.5" />}
            label="Memory"
          />
          <PlaceholderCard
            icon={<ArrowDownToLine className="h-3.5 w-3.5" />}
            label="Network RX"
          />
          <PlaceholderCard
            icon={<ArrowUpFromLine className="h-3.5 w-3.5" />}
            label="Network TX"
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
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-emerald-500" />
          <h1 className="text-2xl font-semibold tracking-tight">Monitoring</h1>
          <span className="hidden font-mono text-xs text-zinc-600 sm:inline">
            // SYSTEM DIAGNOSTICS
          </span>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="flex items-center gap-1.5 font-mono text-xs text-zinc-600">
              <Clock className="h-3 w-3" />
              {formatTime(lastUpdated)}
            </span>
          )}
          <button
            onClick={fetchStats}
            disabled={fetching}
            className="rounded-lg border border-white/[0.06] p-2 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5 disabled:opacity-50"
            aria-label="Refresh stats"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 text-zinc-400",
                fetching && "animate-spin",
              )}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 font-mono text-xs text-red-400">
          ERR: {error}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Cpu className="h-3.5 w-3.5" />}
          label="CPU"
          value={cpuPercent.toFixed(1)}
          suffix="%"
          percent={cpuPercent}
          delay={0}
        />
        <MetricCard
          icon={<MemoryStick className="h-3.5 w-3.5" />}
          label="Memory"
          value={stats ? formatMB(stats.memoryUsageMB) : "\u2014"}
          percent={memPercent}
          subtext={
            stats
              ? `${formatMB(stats.memoryUsageMB)} / ${formatMB(stats.memoryLimitMB)}`
              : undefined
          }
          delay={0.05}
        />
        <MetricCard
          icon={<ArrowDownToLine className="h-3.5 w-3.5" />}
          label="Network RX"
          value={stats ? formatMB(stats.networkRxMB) : "\u2014"}
          delay={0.1}
        />
        <MetricCard
          icon={<ArrowUpFromLine className="h-3.5 w-3.5" />}
          label="Network TX"
          value={stats ? formatMB(stats.networkTxMB) : "\u2014"}
          delay={0.15}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0a0a0b] px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                instance.status === "running"
                  ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                  : "bg-zinc-600",
              )}
            />
            <span className="font-mono text-xs uppercase text-zinc-500">
              {instance.status}
            </span>
          </div>
          <span className="font-mono text-xs text-zinc-700">|</span>
          <span className="font-mono text-xs text-zinc-600">
            {instance.containerName ?? "no-container"}
          </span>
          <span className="font-mono text-xs text-zinc-700">|</span>
          <span className="font-mono text-xs text-zinc-600">
            {instance.region}
          </span>
        </div>
        <span className="font-mono text-xs text-zinc-700">
          POLL: {POLL_INTERVAL / 1000}s
        </span>
      </div>
    </motion.div>
  );
}
