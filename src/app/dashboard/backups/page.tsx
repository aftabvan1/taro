"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  Plus,
  RotateCcw,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "../layout";

interface Backup {
  id: string;
  instanceId: string;
  size: number | null;
  status: "in_progress" | "completed" | "failed";
  storagePath: string | null;
  createdAt: string;
}

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

const statusConfig = {
  completed: {
    label: "Completed",
    className: "bg-emerald-500/15 text-emerald-400",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-500/15 text-amber-400",
  },
  failed: { label: "Failed", className: "bg-red-500/15 text-red-400" },
} as const;

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "--";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BackupsPage() {
  const { instance, token } = useDashboard();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
  const [restoring, setRestoring] = useState(false);

  const fetchBackups = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backups", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch backups");
      const data = await res.json();
      setBackups(data);
    } catch {
      setError("Could not load backups");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  async function handleCreate() {
    if (!instance || !token) return;
    setCreating(true);
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

  async function handleRestore(backup: Backup) {
    if (!token) return;
    setRestoring(true);
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

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (error && backups.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-400" />
        <p className="text-lg font-medium">{error}</p>
        <button
          onClick={fetchBackups}
          className="mt-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm transition-colors hover:bg-white/[0.08]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Backups</h2>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create Backup
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {backups.length === 0 ? (
        <div className="flex h-72 flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Archive className="h-10 w-10 text-muted" />
          </div>
          <p className="text-lg font-medium">No backups yet</p>
          <p className="max-w-sm text-sm text-muted">
            Create your first backup to protect your instance data.
          </p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          {/* Table header */}
          <div className="hidden grid-cols-[1fr_100px_120px_140px_80px] gap-4 px-5 py-2 text-xs font-medium uppercase tracking-wider text-muted sm:grid">
            <span>Date</span>
            <span>Size</span>
            <span>Status</span>
            <span>Instance</span>
            <span />
          </div>

          {backups.map((backup) => {
            const status = statusConfig[backup.status];
            return (
              <motion.div
                key={backup.id}
                variants={itemVariants}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
              >
                {/* Desktop row */}
                <div className="hidden grid-cols-[1fr_100px_120px_140px_80px] items-center gap-4 sm:grid">
                  <span className="text-sm">
                    {formatDate(backup.createdAt)}
                  </span>
                  <span className="font-mono text-sm text-muted">
                    {formatBytes(backup.size)}
                  </span>
                  <span
                    className={cn(
                      "inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium",
                      status.className
                    )}
                  >
                    {status.label}
                  </span>
                  <span className="truncate font-mono text-xs text-muted">
                    {backup.instanceId.slice(0, 8)}
                  </span>
                  <div className="flex justify-end">
                    {backup.status === "completed" && (
                      <button
                        onClick={() => setRestoreTarget(backup)}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </button>
                    )}
                  </div>
                </div>

                {/* Mobile layout */}
                <div className="space-y-2 sm:hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {formatDate(backup.createdAt)}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        status.className
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className="font-mono">{formatBytes(backup.size)}</span>
                    {backup.status === "completed" && (
                      <button
                        onClick={() => setRestoreTarget(backup)}
                        className="inline-flex items-center gap-1 text-brand"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Restore Confirmation Modal */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#111113] p-6"
          >
            <button
              onClick={() => setRestoreTarget(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
                <RotateCcw className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold">Restore Backup</h3>
            </div>

            <p className="mt-4 text-sm text-muted">
              Are you sure you want to restore the backup from{" "}
              <span className="font-medium text-foreground">
                {formatDate(restoreTarget.createdAt)}
              </span>
              ? This will overwrite your current instance data.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setRestoreTarget(null)}
                disabled={restoring}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm transition-colors hover:bg-white/[0.08] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(restoreTarget)}
                disabled={restoring}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
              >
                {restoring && <Loader2 className="h-4 w-4 animate-spin" />}
                Restore
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
