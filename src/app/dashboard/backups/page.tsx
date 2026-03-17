"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  Plus,
  RotateCcw,
  Loader2,
  AlertTriangle,
  X,
  HardDrive,
  Clock,
  CheckCircle2,
  XCircle,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes, formatDate, relativeTime } from "@/lib/format";
import { useDashboard } from "../layout";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Backup {
  id: string;
  instanceId: string;
  size: number | null;
  status: "in_progress" | "completed" | "failed";
  storagePath: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string): string {
  return relativeTime(dateStr);
}

/* ------------------------------------------------------------------ */
/*  Status config                                                      */
/* ------------------------------------------------------------------ */

const statusConfig = {
  completed: {
    label: "COMPLETED",
    icon: CheckCircle2,
    dotClass: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]",
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  },
  in_progress: {
    label: "IN PROGRESS",
    icon: Timer,
    dotClass: "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]",
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  },
  failed: {
    label: "FAILED",
    icon: XCircle,
    dotClass: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]",
    badgeClass: "border-red-500/20 bg-red-500/10 text-red-400",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BackupsPage() {
  const { instance, token } = useDashboard();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
  const [restoring, setRestoring] = useState(false);

  /* ---- Fetch backups ---- */
  const fetchBackups = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backups", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch backups");
      const json = await res.json();
      const list: Backup[] = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json)
          ? json
          : [];
      setBackups(list);
    } catch {
      setError("Could not load backups");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  /* ---- Create backup ---- */
  async function handleCreate() {
    if (!instance || !token) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/backups", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instanceId: instance.id }),
      });
      if (!res.ok) throw new Error("Failed to create backup");
      await fetchBackups();
    } catch {
      setError("Failed to create backup");
    } finally {
      setCreating(false);
    }
  }

  /* ---- Restore backup ---- */
  async function handleRestore(backup: Backup) {
    if (!token) return;
    setRestoring(true);
    setError(null);
    try {
      const res = await fetch(`/api/backups/${backup.id}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to restore backup");
      setRestoreTarget(null);
      await fetchBackups();
    } catch {
      setError("Failed to restore backup");
    } finally {
      setRestoring(false);
    }
  }

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500/50" />
          <span className="font-mono text-xs text-zinc-600">
            LOADING BACKUP MANIFEST...
          </span>
        </div>
      </div>
    );
  }

  /* ---- Error with no data ---- */
  if (error && backups.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <div>
          <p className="font-medium">{error}</p>
          <p className="mt-1 font-mono text-xs text-zinc-600">
            ERR: BACKUP_FETCH_FAILED
          </p>
        </div>
        <button
          onClick={fetchBackups}
          className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2 font-mono text-xs transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5"
        >
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardDrive className="h-5 w-5 text-emerald-500" />
          <h1 className="text-2xl font-semibold tracking-tight">Backups</h1>
          <span className="hidden font-mono text-xs text-zinc-600 sm:inline">
            // SNAPSHOT MANAGER
          </span>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating || !instance}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 font-mono text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          CREATE BACKUP
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 font-mono text-xs text-red-400">
          ERR: {error}
        </div>
      )}

      {/* Empty state */}
      {backups.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex h-72 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/[0.08] bg-[#0a0a0b]"
        >
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
            <Archive className="h-10 w-10 text-zinc-600" />
          </div>
          <div className="text-center">
            <p className="font-medium">No Backups Found</p>
            <p className="mt-1 font-mono text-xs text-zinc-600">
              STATUS: EMPTY_MANIFEST
            </p>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">
              Create your first backup to protect your instance data.
            </p>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Table header */}
          <div className="hidden grid-cols-[1fr_100px_140px_100px_90px] gap-4 rounded-lg border border-white/[0.04] bg-white/[0.02] px-5 py-2.5 font-mono text-[10px] font-medium uppercase tracking-widest text-zinc-600 sm:grid">
            <span>Timestamp</span>
            <span>Size</span>
            <span>Status</span>
            <span>Age</span>
            <span className="text-right">Action</span>
          </div>

          {/* Backup rows */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-1.5"
          >
            {backups.map((backup) => {
              const sc = statusConfig[backup.status];
              const StatusIcon = sc.icon;
              return (
                <motion.div
                  key={backup.id}
                  variants={itemVariants}
                  className="group rounded-xl border border-white/[0.06] bg-[#0a0a0b] px-5 py-4 transition-colors hover:border-emerald-500/10 hover:bg-white/[0.02]"
                >
                  {/* Desktop row */}
                  <div className="hidden grid-cols-[1fr_100px_140px_100px_90px] items-center gap-4 sm:grid">
                    <div className="flex items-center gap-3">
                      <Clock className="h-3.5 w-3.5 text-zinc-600" />
                      <span className="font-mono text-sm">
                        {formatDate(backup.createdAt, { short: true })}
                      </span>
                    </div>
                    <span className="font-mono text-sm text-zinc-400">
                      {formatBytes(backup.size)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={cn("h-1.5 w-1.5 rounded-full", sc.dotClass)} />
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium",
                          sc.badgeClass,
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {sc.label}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-zinc-600">
                      {timeAgo(backup.createdAt)}
                    </span>
                    <div className="flex justify-end">
                      {backup.status === "completed" && (
                        <button
                          onClick={() => setRestoreTarget(backup)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] px-2.5 py-1.5 font-mono text-[10px] font-medium text-zinc-500 opacity-0 transition-all hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-400 group-hover:opacity-100"
                        >
                          <RotateCcw className="h-3 w-3" />
                          RESTORE
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mobile layout */}
                  <div className="space-y-3 sm:hidden">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm">
                        {formatDate(backup.createdAt, { short: true })}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium",
                          sc.badgeClass,
                        )}
                      >
                        {sc.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-500">
                        {formatBytes(backup.size)}
                      </span>
                      {backup.status === "completed" && (
                        <button
                          onClick={() => setRestoreTarget(backup)}
                          className="inline-flex items-center gap-1 font-mono text-xs text-amber-400"
                        >
                          <RotateCcw className="h-3 w-3" />
                          RESTORE
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}

      {/* Restore Confirmation Modal */}
      <AnimatePresence>
        {restoreTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative mx-4 w-full max-w-md rounded-2xl border border-amber-500/20 bg-[#0c0c0d] p-6"
            >
              <button
                onClick={() => setRestoreTarget(null)}
                className="absolute right-4 top-4 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
                  <RotateCcw className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Restore Backup</h3>
                  <p className="font-mono text-xs text-zinc-600">
                    ACTION: ROLLBACK
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-zinc-400">
                Restore the backup from{" "}
                <span className="font-mono font-medium text-zinc-200">
                  {formatDate(restoreTarget.createdAt, { short: true })}
                </span>
                ? This will overwrite your current instance data.
              </p>

              <div className="mt-4 rounded-lg border border-amber-500/10 bg-amber-500/5 px-3 py-2 font-mono text-xs text-amber-400/80">
                WARNING: This operation cannot be undone.
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setRestoreTarget(null)}
                  disabled={restoring}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRestore(restoreTarget)}
                  disabled={restoring}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/15 px-4 py-2 font-mono text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
                >
                  {restoring && <Loader2 className="h-4 w-4 animate-spin" />}
                  RESTORE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
