"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "../layout";

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusConfig = {
  provisioning: {
    label: "Provisioning",
    className: "bg-blue-500/15 text-blue-400",
  },
  running: {
    label: "Running",
    className: "bg-emerald-500/15 text-emerald-400",
  },
  stopped: { label: "Stopped", className: "bg-zinc-500/15 text-zinc-400" },
  error: { label: "Error", className: "bg-red-500/15 text-red-400" },
} as const;

export default function SettingsPage() {
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

  if (!instance) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  const status = statusConfig[instance.status];

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

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.1 }}
      className="space-y-8"
    >
      {/* Instance Info */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10">
            <Settings className="h-4 w-4 text-brand" />
          </div>
          <h2 className="text-lg font-semibold">Instance Information</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Name
            </p>
            <p className="mt-1 font-medium">{instance.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Region
            </p>
            <p className="mt-1 font-mono text-sm">{instance.region}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Status
            </p>
            <span
              className={cn(
                "mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                status.className
              )}
            >
              {status.label}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Container
            </p>
            <p className="mt-1 font-mono text-sm text-muted">
              {instance.containerName ?? "--"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Created
            </p>
            <p className="mt-1 text-sm text-muted">
              {formatDate(instance.createdAt)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* MC Auth Token */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
      >
        <h3 className="mb-4 text-sm font-semibold">Mission Control Token</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 font-mono text-sm">
            {instance.mcAuthToken ? (
              showToken ? (
                <span className="break-all">{instance.mcAuthToken}</span>
              ) : (
                <span className="text-muted">
                  {"*".repeat(32)}
                </span>
              )
            ) : (
              <span className="text-muted">Not available</span>
            )}
          </div>
          {instance.mcAuthToken && (
            <>
              <button
                onClick={() => setShowToken(!showToken)}
                className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-muted transition-colors hover:bg-white/[0.08] hover:text-foreground"
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={handleCopyToken}
                className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-muted transition-colors hover:bg-white/[0.08] hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-brand" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Rename */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
      >
        <h3 className="mb-4 text-sm font-semibold">Rename Instance</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Instance name"
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/50 focus:border-brand/40 focus:ring-1 focus:ring-brand/20"
          />
          <button
            onClick={handleRename}
            disabled={saving || !name.trim() || name === instance.name}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveSuccess ? "Saved" : "Save"}
          </button>
        </div>
        {saveError && (
          <p className="mt-2 text-sm text-red-400">{saveError}</p>
        )}
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-red-500/20 bg-red-500/[0.02] p-6"
      >
        <h3 className="mb-1 text-sm font-semibold text-red-400">
          Danger Zone
        </h3>
        <p className="mb-4 text-sm text-muted">
          Permanently delete this instance and all associated data. This action
          cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-red-500/15 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25"
        >
          <Trash2 className="h-4 w-4" />
          Delete Instance
        </button>
      </motion.div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mx-4 w-full max-w-md rounded-2xl border border-red-500/20 bg-[#111113] p-6"
          >
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirm("");
                setDeleteError(null);
              }}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold">Delete Instance</h3>
            </div>

            <p className="mt-4 text-sm text-muted">
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {instance.name}
              </span>{" "}
              and all its data. Type the instance name to confirm.
            </p>

            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={instance.name}
              className="mt-4 w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 font-mono text-sm outline-none transition-colors placeholder:text-muted/40 focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
            />

            {deleteError && (
              <p className="mt-2 text-sm text-red-400">{deleteError}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirm("");
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm transition-colors hover:bg-white/[0.08] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirm !== instance.name}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-400 disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Instance
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
