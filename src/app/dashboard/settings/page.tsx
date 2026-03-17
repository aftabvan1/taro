"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Settings,
  Save,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  X,
  Copy,
  Check,
  LogOut,
  Server,
  Globe,
  Container,
  Clock,
  Wifi,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { useDashboard } from "../layout";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

const statusConfig = {
  provisioning: {
    label: "PROVISIONING",
    dotClass: "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]",
    badgeClass: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  },
  running: {
    label: "RUNNING",
    dotClass: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]",
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  },
  stopped: {
    label: "STOPPED",
    dotClass: "bg-zinc-500",
    badgeClass: "border-zinc-500/20 bg-zinc-500/10 text-zinc-400",
  },
  error: {
    label: "ERROR",
    dotClass: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]",
    badgeClass: "border-red-500/20 bg-red-500/10 text-red-400",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Info Row                                                           */
/* ------------------------------------------------------------------ */

function InfoRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] px-4 py-3">
      <div className="mt-0.5 text-zinc-600">{icon}</div>
      <div className="flex-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          {label}
        </p>
        <div className={cn("mt-0.5 text-sm", mono && "font-mono text-zinc-300")}>
          {value}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const router = useRouter();
  const { instance, token, refreshInstances } = useDashboard();

  const [name, setName] = useState(instance?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /* ---- Loading / no instance ---- */
  if (!instance) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500/50" />
          <span className="font-mono text-xs text-zinc-600">
            LOADING INSTANCE CONFIG...
          </span>
        </div>
      </div>
    );
  }

  const status = statusConfig[instance.status];

  /* ---- Handlers ---- */
  async function handleRename() {
    if (!instance || !token || !name.trim()) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/instances/${instance.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setSaveSuccess(true);
      refreshInstances();
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      setSaveError("Failed to rename instance");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!instance || !token) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/instances/${instance.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      setShowDeleteModal(false);
      refreshInstances();
    } catch {
      setDeleteError("Failed to delete instance");
    } finally {
      setDeleting(false);
    }
  }

  function handleCopyToken() {
    if (!instance?.mcAuthToken) return;
    navigator.clipboard.writeText(instance.mcAuthToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.replace("/");
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.08 }}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-emerald-500" />
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <span className="hidden font-mono text-xs text-zinc-600 sm:inline">
          // INSTANCE CONFIGURATION
        </span>
      </motion.div>

      {/* Instance Information */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-white/[0.06] bg-[#0a0a0b] p-6"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
            <Server className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Instance Information</h2>
            <p className="font-mono text-[10px] text-zinc-600">
              ID: {instance.id.slice(0, 12)}...
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <InfoRow
            icon={<Server className="h-3.5 w-3.5" />}
            label="Name"
            value={instance.name}
          />
          <InfoRow
            icon={<Globe className="h-3.5 w-3.5" />}
            label="Region"
            value={instance.region}
            mono
          />
          <InfoRow
            icon={
              <span className={cn("inline-block h-2 w-2 rounded-full", status.dotClass)} />
            }
            label="Status"
            value={
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium",
                  status.badgeClass,
                )}
              >
                {status.label}
              </span>
            }
          />
          <InfoRow
            icon={<Container className="h-3.5 w-3.5" />}
            label="Container"
            value={instance.containerName ?? "--"}
            mono
          />
          <InfoRow
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Created"
            value={formatDate(instance.createdAt)}
          />
          <InfoRow
            icon={<Wifi className="h-3.5 w-3.5" />}
            label="Server IP"
            value={instance.serverIp ?? "--"}
            mono
          />
          <InfoRow
            icon={<span className="font-mono text-[10px]">OC</span>}
            label="OpenClaw Port"
            value={instance.openclawPort ?? "--"}
            mono
          />
          <InfoRow
            icon={<span className="font-mono text-[10px]">MC</span>}
            label="MC Port"
            value={instance.mcPort ?? "--"}
            mono
          />
        </div>
      </motion.div>

      {/* MC Auth Token */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-white/[0.06] bg-[#0a0a0b] p-6"
      >
        <div className="mb-4 flex items-center gap-3">
          <Key className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold">Mission Control Auth Token</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 font-mono text-sm">
            {instance.mcAuthToken ? (
              showToken ? (
                <span className="break-all text-emerald-400/80">
                  {instance.mcAuthToken}
                </span>
              ) : (
                <span className="text-zinc-600">
                  {"*".repeat(32)}
                </span>
              )
            ) : (
              <span className="text-zinc-600">Not available</span>
            )}
          </div>
          {instance.mcAuthToken && (
            <>
              <button
                onClick={() => setShowToken(!showToken)}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5 text-zinc-500 transition-colors hover:border-emerald-500/20 hover:text-zinc-300"
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={handleCopyToken}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5 text-zinc-500 transition-colors hover:border-emerald-500/20 hover:text-zinc-300"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Rename Instance */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-white/[0.06] bg-[#0a0a0b] p-6"
      >
        <h3 className="mb-4 text-sm font-semibold">Rename Instance</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Instance name"
            className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 font-mono text-sm outline-none transition-colors placeholder:text-zinc-700 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20"
          />
          <button
            onClick={handleRename}
            disabled={saving || !name.trim() || name === instance.name}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 font-mono text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveSuccess ? "SAVED" : "SAVE"}
          </button>
        </div>
        {saveError && (
          <p className="mt-2 font-mono text-xs text-red-400">
            ERR: {saveError}
          </p>
        )}
      </motion.div>

      {/* Logout */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-white/[0.06] bg-[#0a0a0b] p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Session</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Sign out and clear your session token.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 font-mono text-xs text-zinc-400 transition-colors hover:border-zinc-500/30 hover:bg-white/[0.06]"
          >
            <LogOut className="h-4 w-4" />
            LOGOUT
          </button>
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-red-500/20 bg-red-500/[0.02] p-6"
      >
        <h3 className="mb-1 font-mono text-xs font-semibold uppercase tracking-wider text-red-400">
          Danger Zone
        </h3>
        <p className="mb-4 text-sm text-zinc-500">
          Permanently delete this instance and all associated data. This action
          cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 font-mono text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
        >
          <Trash2 className="h-4 w-4" />
          DELETE INSTANCE
        </button>
      </motion.div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mx-4 w-full max-w-md rounded-2xl border border-red-500/20 bg-[#0c0c0d] p-6"
          >
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirm("");
                setDeleteError(null);
              }}
              className="absolute right-4 top-4 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Delete Instance</h3>
                <p className="font-mono text-xs text-zinc-600">
                  ACTION: TERMINATE
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-zinc-400">
              This will permanently delete{" "}
              <span className="font-mono font-medium text-zinc-200">
                {instance.name}
              </span>{" "}
              and all its data. Type the instance name to confirm.
            </p>

            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={instance.name}
              className="mt-4 w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 font-mono text-sm outline-none transition-colors placeholder:text-zinc-700 focus:border-red-500/30 focus:ring-1 focus:ring-red-500/20"
            />

            {deleteError && (
              <p className="mt-2 font-mono text-xs text-red-400">
                ERR: {deleteError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirm("");
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm transition-colors hover:bg-white/[0.06] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirm !== instance.name}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/15 px-4 py-2 font-mono text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                DELETE
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
