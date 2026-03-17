"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Tag,
  Plus,
  X,
  Trash2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "../layout";

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

const PREDEFINED_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#ec4899",
];

interface MCTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export default function TagsPage() {
  const { instance, token } = useDashboard();
  const [tags, setTags] = useState<MCTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  // New tag form state
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PREDEFINED_COLORS[3]);
  const [creating, setCreating] = useState(false);

  const fetchTags = useCallback(async () => {
    if (!instance || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mission-control/tags", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch tags");
      const data = await res.json();
      setTags(data);
    } catch {
      setError("Could not connect to Mission Control");
    } finally {
      setLoading(false);
    }
  }, [instance, token]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  async function handleCreateTag() {
    if (!token || !newTagName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/mission-control/tags", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
        }),
      });
      if (!res.ok) throw new Error("Failed to create tag");
      const tag = await res.json();
      setTags((prev) => [...prev, tag]);
      setNewTagName("");
      setNewTagColor(PREDEFINED_COLORS[3]);
      setShowNewTag(false);
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteTag(id: string) {
    if (!token) return;
    setDeleting((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/mission-control/tags/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete tag");
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // ignore
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          <p className="font-mono text-xs text-zinc-600">LOADING TAGS...</p>
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
        <p className="max-w-sm text-center font-mono text-xs text-zinc-600">
          Ensure your instance is running and Mission Control is reachable.
        </p>
        <button
          onClick={fetchTags}
          className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-mono text-xs text-emerald-400 transition-colors hover:bg-emerald-500/20"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-500/50">
          Tag Management
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/20 to-transparent" />
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-white/[0.06] bg-[#0c0c0d] p-3"
      >
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            TOTAL TAGS
          </span>
        </div>
        <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-emerald-400">
          {tags.length}
        </p>
      </motion.div>

      {/* Tag grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {tags.map((tag) => (
          <motion.div
            key={tag.id}
            variants={itemVariants}
            className="group overflow-hidden rounded-lg border border-white/[0.06] bg-[#0c0c0d] transition-all hover:border-emerald-500/15 hover:shadow-[0_0_20px_rgba(16,185,129,0.04)]"
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-6 w-6 shrink-0 rounded-full border border-white/10"
                    style={{ backgroundColor: tag.color }}
                  />
                  <p className="font-mono text-sm font-bold tracking-tight text-zinc-200">
                    {tag.name}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  disabled={deleting.has(tag.id)}
                  className="shrink-0 rounded p-1.5 text-zinc-700 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
                  title="Delete tag"
                >
                  {deleting.has(tag.id) ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-zinc-600">
                  {tag.color}
                </span>
              </div>
            </div>
          </motion.div>
        ))}

        {/* New Tag Card */}
        {showNewTag ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="overflow-hidden rounded-lg border border-emerald-500/20 bg-[#0c0c0d]"
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
            <div className="p-4">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name..."
                autoFocus
                disabled={creating}
                className="w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTagName.trim()) handleCreateTag();
                  if (e.key === "Escape") {
                    setShowNewTag(false);
                    setNewTagName("");
                    setNewTagColor(PREDEFINED_COLORS[3]);
                  }
                }}
              />

              {/* Color picker */}
              <div className="mt-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  COLOR
                </span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {PREDEFINED_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition-all",
                        newTagColor === color
                          ? "border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                          : "border-transparent hover:border-white/30"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || creating}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-mono text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  CREATE
                </button>
                <button
                  onClick={() => {
                    setShowNewTag(false);
                    setNewTagName("");
                    setNewTagColor(PREDEFINED_COLORS[3]);
                  }}
                  className="rounded-lg px-3 py-2 font-mono text-xs text-zinc-600 hover:text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            variants={itemVariants}
            onClick={() => setShowNewTag(true)}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/[0.08] bg-[#0c0c0d] p-8 transition-all hover:border-emerald-500/20 hover:bg-emerald-500/[0.02]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-white/[0.12] bg-white/[0.02]">
              <Plus className="h-4 w-4 text-zinc-600" />
            </div>
            <span className="font-mono text-xs text-zinc-600">NEW TAG</span>
          </motion.button>
        )}
      </motion.div>

      {/* Empty state */}
      {tags.length === 0 && !showNewTag && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-white/[0.06] bg-[#0c0c0d] py-16">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <Tag className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="font-mono text-sm text-zinc-400">No tags created</p>
          <p className="max-w-sm text-center font-mono text-xs text-zinc-600">
            Tags help you organize and categorize your agents, tasks, and boards.
          </p>
        </div>
      )}
    </div>
  );
}
