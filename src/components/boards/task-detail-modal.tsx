"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { relativeTime } from "@/lib/format";
import type { MCTask, MCAgent } from "@/lib/mission-control/types";

export interface TaskDetailModalProps {
  task: MCTask;
  agents: MCAgent[];
  token: string;
  onClose: () => void;
  onSave: (taskId: string, updates: Record<string, unknown>) => Promise<void>;
  onDispatch: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export function TaskDetailModal({
  task,
  agents,
  token: _token,
  onClose,
  onSave,
  onDispatch,
  onDelete,
}: TaskDetailModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [agentName, setAgentName] = useState(task.agent_name);
  const [dueDate, setDueDate] = useState(
    task.due_date ? task.due_date.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasChanges =
    title !== task.title ||
    description !== task.description ||
    status !== task.status ||
    priority !== task.priority ||
    agentName !== task.agent_name ||
    (dueDate || null) !== (task.due_date ? task.due_date.slice(0, 10) : null);

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    const updates: Record<string, unknown> = {};
    if (title !== task.title) updates.title = title;
    if (description !== task.description) updates.description = description;
    if (status !== task.status) updates.status = status;
    if (priority !== task.priority) updates.priority = priority;
    if (agentName !== task.agent_name) updates.agent_name = agentName;
    if ((dueDate || null) !== (task.due_date ? task.due_date.slice(0, 10) : null))
      updates.due_date = dueDate || null;
    await onSave(task.id, updates);
    setSaving(false);
  };

  const copySessionId = () => {
    if (task.openclaw_session_id) {
      navigator.clipboard.writeText(task.openclaw_session_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/[0.08] bg-[#0c0c0d] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-500">
            Task Detail
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-white/[0.04] hover:text-zinc-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-sm text-zinc-200 outline-none focus:border-emerald-500/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              Description / Agent Instructions
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Detailed instructions for the agent..."
              className="w-full resize-y rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-xs text-zinc-200 placeholder-zinc-700 outline-none focus:border-emerald-500/30"
            />
          </div>

          {/* Row: Status, Priority, Agent */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                Status
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as MCTask["status"])
                }
                className="w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-xs text-zinc-300 outline-none focus:border-emerald-500/30"
              >
                <option value="inbox">Inbox</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as MCTask["priority"])
                }
                className="w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-xs text-zinc-300 outline-none focus:border-emerald-500/30"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                Agent
              </label>
              <select
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-xs text-zinc-300 outline-none focus:border-emerald-500/30"
              >
                <option value="">No agent</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-xs text-zinc-300 outline-none focus:border-emerald-500/30"
            />
          </div>

          {/* Dispatch Info */}
          {task.dispatched_at && (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[10px]">
                {task.dispatch_output ? (
                  <div className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    COMPLETED
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-blue-400">
                    <Zap className="h-3 w-3" />
                    DISPATCHED
                  </div>
                )}
                <div className="flex items-center gap-1 text-zinc-500">
                  <Clock className="h-3 w-3" />
                  {relativeTime(task.dispatched_at)}
                </div>
                {task.openclaw_session_id && (
                  <button
                    onClick={copySessionId}
                    className="flex items-center gap-1 rounded border border-white/[0.08] bg-white/[0.02] px-1.5 py-0.5 text-zinc-600 transition-colors hover:text-zinc-400"
                  >
                    <Copy className="h-2.5 w-2.5" />
                    {copied ? "Copied!" : `Session: ${task.openclaw_session_id.slice(0, 16)}...`}
                  </button>
                )}
              </div>
              {task.dispatch_output && (
                <div className="max-h-48 overflow-y-auto rounded-md border border-white/[0.06] bg-black/40 p-3">
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-300">
                    {task.dispatch_output}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
          <button
            onClick={() => {
              onDelete(task.id);
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-mono text-[10px] text-red-400 transition-colors hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            DELETE
          </button>
          <div className="flex items-center gap-2">
            {agentName && !task.dispatched_at && (
              <button
                onClick={() => {
                  onDispatch(task.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 font-mono text-[10px] font-bold text-emerald-400 transition-all hover:bg-emerald-500/20"
              >
                <Zap className="h-3.5 w-3.5" />
                DISPATCH
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-mono text-[10px] font-bold text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              SAVE
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
