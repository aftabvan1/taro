"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings2,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Type,
  Hash,
  CalendarDays,
  List,
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

const FIELD_TYPES = ["text", "number", "date", "select"] as const;
type FieldType = (typeof FIELD_TYPES)[number];

const fieldTypeConfig: Record<
  FieldType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string;
  }
> = {
  text: {
    label: "TEXT",
    icon: Type,
    badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  },
  number: {
    label: "NUMBER",
    icon: Hash,
    badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  },
  date: {
    label: "DATE",
    icon: CalendarDays,
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  select: {
    label: "SELECT",
    icon: List,
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
};

interface MCCustomField {
  id: string;
  name: string;
  field_type: FieldType;
  options?: string[];
  created_at: string;
}

export default function CustomFieldsPage() {
  const { instance, token } = useDashboard();
  const [fields, setFields] = useState<MCCustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  // New field form state
  const [showNewField, setShowNewField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchFields = useCallback(async () => {
    if (!instance || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mission-control/custom-fields", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch custom fields");
      const data = await res.json();
      setFields(data);
    } catch {
      setError("Could not connect to Mission Control");
    } finally {
      setLoading(false);
    }
  }, [instance, token]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  async function handleCreateField() {
    if (!token || !newFieldName.trim()) return;
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: newFieldName.trim(),
        field_type: newFieldType,
      };
      if (newFieldType === "select" && newFieldOptions.trim()) {
        body.options = newFieldOptions
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean);
      }
      const res = await fetch("/api/mission-control/custom-fields", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create custom field");
      const field = await res.json();
      setFields((prev) => [...prev, field]);
      setNewFieldName("");
      setNewFieldType("text");
      setNewFieldOptions("");
      setShowNewField(false);
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteField(id: string) {
    if (!token) return;
    setDeleting((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/mission-control/custom-fields/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete custom field");
      setFields((prev) => prev.filter((f) => f.id !== id));
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

  function resetForm() {
    setShowNewField(false);
    setNewFieldName("");
    setNewFieldType("text");
    setNewFieldOptions("");
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          <p className="font-mono text-xs text-zinc-600">
            LOADING CUSTOM FIELDS...
          </p>
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
          onClick={fetchFields}
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
          Custom Fields
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
          <Settings2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            TOTAL FIELDS
          </span>
        </div>
        <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-emerald-400">
          {fields.length}
        </p>
      </motion.div>

      {/* Fields list */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-2"
      >
        {fields.map((field) => {
          const config = fieldTypeConfig[field.field_type];
          const IconComponent = config.icon;
          return (
            <motion.div
              key={field.id}
              variants={itemVariants}
              className="group overflow-hidden rounded-lg border border-white/[0.06] bg-[#0c0c0d] transition-all hover:border-emerald-500/15 hover:shadow-[0_0_20px_rgba(16,185,129,0.04)]"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <IconComponent className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold tracking-tight text-zinc-200">
                      {field.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold",
                          config.badge
                        )}
                      >
                        {config.label}
                      </span>
                      {field.field_type === "select" &&
                        field.options &&
                        field.options.length > 0 && (
                          <span className="font-mono text-[10px] text-zinc-600">
                            {field.options.length}{" "}
                            {field.options.length === 1 ? "option" : "options"}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteField(field.id)}
                  disabled={deleting.has(field.id)}
                  className="shrink-0 rounded p-1.5 text-zinc-700 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
                  title="Delete field"
                >
                  {deleting.has(field.id) ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Show options for select fields */}
              {field.field_type === "select" &&
                field.options &&
                field.options.length > 0 && (
                  <div className="border-t border-white/[0.04] px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {field.options.map((opt, i) => (
                        <span
                          key={i}
                          className="rounded-md border border-violet-500/15 bg-violet-500/5 px-2 py-0.5 font-mono text-[10px] text-violet-400"
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* New Field form / button */}
      {showNewField ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="overflow-hidden rounded-lg border border-emerald-500/20 bg-[#0c0c0d]"
        >
          <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <div className="p-4 space-y-3">
            {/* Name input */}
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="Field name..."
              autoFocus
              disabled={creating}
              className="w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newFieldName.trim())
                  handleCreateField();
                if (e.key === "Escape") resetForm();
              }}
            />

            {/* Type selector */}
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                FIELD TYPE
              </span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {FIELD_TYPES.map((type) => {
                  const cfg = fieldTypeConfig[type];
                  const TypeIcon = cfg.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setNewFieldType(type)}
                      disabled={creating}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-2 font-mono text-xs font-bold transition-all",
                        newFieldType === type
                          ? cn(
                              cfg.badge,
                              "shadow-[0_0_8px_rgba(255,255,255,0.05)]"
                            )
                          : "border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:border-white/10 hover:text-zinc-300"
                      )}
                    >
                      <TypeIcon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Options input for select type */}
            {newFieldType === "select" && (
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  OPTIONS (COMMA-SEPARATED)
                </span>
                <input
                  type="text"
                  value={newFieldOptions}
                  onChange={(e) => setNewFieldOptions(e.target.value)}
                  placeholder="Option 1, Option 2, Option 3..."
                  disabled={creating}
                  className="mt-1.5 w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newFieldName.trim())
                      handleCreateField();
                    if (e.key === "Escape") resetForm();
                  }}
                />
                {newFieldOptions.trim() && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {newFieldOptions
                      .split(",")
                      .map((o) => o.trim())
                      .filter(Boolean)
                      .map((opt, i) => (
                        <span
                          key={i}
                          className="rounded-md border border-violet-500/15 bg-violet-500/5 px-2 py-0.5 font-mono text-[10px] text-violet-400"
                        >
                          {opt}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateField}
                disabled={!newFieldName.trim() || creating}
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
                onClick={resetForm}
                className="rounded-lg px-3 py-2 font-mono text-xs text-zinc-600 hover:text-zinc-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <button
          onClick={() => setShowNewField(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.08] bg-[#0c0c0d] py-4 font-mono text-xs text-zinc-600 transition-all hover:border-emerald-500/20 hover:text-emerald-500/70"
        >
          <Plus className="h-4 w-4" />
          NEW FIELD
        </button>
      )}

      {/* Empty state */}
      {fields.length === 0 && !showNewField && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-white/[0.06] bg-[#0c0c0d] py-16">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <Settings2 className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="font-mono text-sm text-zinc-400">
            No custom fields created
          </p>
          <p className="max-w-sm text-center font-mono text-xs text-zinc-600">
            Custom fields let you add extra metadata to your tasks and agents
            beyond the built-in properties.
          </p>
        </div>
      )}
    </div>
  );
}
