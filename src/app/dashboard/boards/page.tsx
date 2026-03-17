"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  ClipboardList,
  CheckCircle2,
  Bot,
  Calendar,
  RefreshCw,
  Clock,
  Plus,
  X,
  Trash2,
  Eye,
  List,
  Columns3,
  Inbox,
  Zap,
  GripVertical,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime, daysUntil } from "@/lib/format";
import { dashboardContainer, dashboardItem } from "@/lib/animation-variants";
import { useDashboard } from "../layout";
import type { MCBoard, MCTask, MCAgent, MCTag } from "@/lib/mission-control/types";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const containerVariants = dashboardContainer;
const itemVariants = dashboardItem;

const priorityConfig = {
  high: {
    label: "HIGH",
    stripe: "bg-red-500",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  medium: {
    label: "MED",
    stripe: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  low: {
    label: "LOW",
    stripe: "bg-zinc-600",
    badge: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  },
} as const;

const VALID_STATUSES = new Set(["inbox", "todo", "in_progress", "review", "done"]);

const columnConfig = [
  {
    key: "inbox" as const,
    label: "Inbox",
    icon: Inbox,
    dotColor: "bg-amber-400",
    color: "text-amber-400",
    headerBorder: "border-amber-500/20",
    countBg: "bg-amber-500/10 text-amber-400",
  },
  {
    key: "todo" as const,
    label: "To Do",
    icon: ClipboardList,
    dotColor: "bg-zinc-400",
    color: "text-zinc-400",
    headerBorder: "border-zinc-500/20",
    countBg: "bg-zinc-500/10 text-zinc-400",
  },
  {
    key: "in_progress" as const,
    label: "In Progress",
    icon: Loader2,
    dotColor: "bg-blue-400",
    color: "text-blue-400",
    headerBorder: "border-blue-500/20",
    countBg: "bg-blue-500/10 text-blue-400",
  },
  {
    key: "review" as const,
    label: "Review",
    icon: Eye,
    dotColor: "bg-purple-400",
    color: "text-purple-400",
    headerBorder: "border-purple-500/20",
    countBg: "bg-purple-500/10 text-purple-400",
  },
  {
    key: "done" as const,
    label: "Done",
    icon: CheckCircle2,
    dotColor: "bg-emerald-400",
    color: "text-emerald-400",
    headerBorder: "border-emerald-500/20",
    countBg: "bg-emerald-500/10 text-emerald-400",
  },
];

// ---------------------------------------------------------------------------
// Droppable Column
// ---------------------------------------------------------------------------

function DroppableColumn({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "space-y-2 min-h-[100px] rounded-lg transition-colors",
        isOver && "bg-emerald-500/[0.03] ring-1 ring-emerald-500/20"
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draggable Task Card
// ---------------------------------------------------------------------------

interface DraggableTaskCardProps {
  task: MCTask;
  agents: MCAgent[];
  token: string;
  onUpdateTask: (taskId: string, updates: Partial<MCTask>) => void;
  onDispatch: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onOpenDetail: (task: MCTask) => void;
}

function DraggableTaskCard({
  task,
  agents,
  token,
  onUpdateTask,
  onDispatch,
  onDelete,
  onOpenDetail,
}: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const priority = priorityConfig[task.priority];
  const isOverdue =
    task.due_date &&
    new Date(task.due_date).getTime() < Date.now() &&
    task.status !== "done";

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#0c0c0d] transition-all hover:border-white/10">
        {/* Priority stripe */}
        <div className={cn("h-[2px] w-full", priority.stripe)} />
        <div className="p-3">
          <div className="flex items-start gap-2">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 shrink-0 cursor-grab rounded p-0.5 text-zinc-700 opacity-0 transition-all hover:bg-white/[0.04] hover:text-zinc-500 group-hover:opacity-100 active:cursor-grabbing"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => onOpenDetail(task)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="font-mono text-sm font-medium text-zinc-300 transition-colors hover:text-white">
                {task.title}
              </p>
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="shrink-0 rounded p-1 text-zinc-700 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
              title="Delete task"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          {/* Description preview */}
          {task.description && (
            <p className="mt-1.5 ml-6 line-clamp-2 font-mono text-[10px] text-zinc-500">
              {task.description}
            </p>
          )}

          {/* Dispatch status */}
          {task.dispatched_at ? (
            <div className="mt-1.5 ml-6 space-y-1">
              {task.dispatch_output ? (
                <div className="flex items-center gap-1 rounded border border-emerald-500/15 bg-emerald-500/5 px-1.5 py-0.5 w-fit">
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                  <span className="font-mono text-[9px] text-emerald-400">
                    COMPLETED
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 rounded border border-blue-500/15 bg-blue-500/5 px-1.5 py-0.5 w-fit">
                  <Zap className="h-2.5 w-2.5 text-blue-400" />
                  <span className="font-mono text-[9px] text-blue-400">
                    DISPATCHED
                  </span>
                </div>
              )}
              {task.dispatch_output && (
                <p className="line-clamp-2 font-mono text-[10px] text-zinc-500">
                  {task.dispatch_output.slice(0, 120)}
                  {task.dispatch_output.length > 120 ? "..." : ""}
                </p>
              )}
            </div>
          ) : task.agent_name && task.status !== "done" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDispatch(task.id);
              }}
              className="mt-1.5 ml-6 flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-[10px] font-bold text-emerald-400 transition-all hover:bg-emerald-500/20 hover:shadow-[0_0_8px_rgba(16,185,129,0.15)]"
            >
              <Zap className="h-3 w-3" />
              DISPATCH
            </button>
          ) : null}

          {/* Bottom row: agent, priority, due date, tags */}
          <div className="mt-2.5 ml-6 flex flex-wrap items-center gap-2">
            {/* Agent assignment dropdown */}
            <select
              value={task.agent_name || ""}
              onChange={(e) =>
                onUpdateTask(task.id, { agent_name: e.target.value })
              }
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "rounded border px-1.5 py-0.5 font-mono text-[10px] outline-none cursor-pointer",
                task.agent_name
                  ? "border-emerald-500/15 bg-emerald-500/5 text-emerald-400"
                  : "border-white/[0.08] bg-transparent text-zinc-600"
              )}
            >
              <option value="">No agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>

            {/* Priority picker */}
            <select
              value={task.priority}
              onChange={(e) =>
                onUpdateTask(task.id, {
                  priority: e.target.value as MCTask["priority"],
                })
              }
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold outline-none cursor-pointer",
                priority.badge
              )}
            >
              <option value="low">LOW</option>
              <option value="medium">MED</option>
              <option value="high">HIGH</option>
            </select>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center gap-1">
                {task.tags.map((tag: MCTag) => (
                  <span
                    key={tag.id}
                    className="rounded-full border px-1.5 py-0.5 font-mono text-[9px]"
                    style={{
                      backgroundColor: `${tag.color}15`,
                      borderColor: `${tag.color}30`,
                      color: tag.color,
                    }}
                    title={tag.name}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Due date */}
            {task.due_date && (
              <div
                className={cn(
                  "flex items-center gap-1",
                  isOverdue ? "text-red-400" : "text-zinc-600"
                )}
              >
                <Calendar className="h-3 w-3" />
                <span className="font-mono text-[10px]">
                  {daysUntil(task.due_date)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task Detail Modal
// ---------------------------------------------------------------------------

interface TaskDetailModalProps {
  task: MCTask;
  agents: MCAgent[];
  token: string;
  onClose: () => void;
  onSave: (taskId: string, updates: Record<string, unknown>) => Promise<void>;
  onDispatch: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

function TaskDetailModal({
  task,
  agents,
  token,
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

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function BoardsPage() {
  const { instance, token } = useDashboard();
  const [boards, setBoards] = useState<MCBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<MCBoard | null>(null);
  const [tasks, setTasks] = useState<MCTask[]>([]);
  const [agents, setAgents] = useState<MCAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // New board form state
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);

  // New task form state
  const [addingTaskColumn, setAddingTaskColumn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAgent, setNewTaskAgent] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  // Modal state
  const [detailTask, setDetailTask] = useState<MCTask | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Drag state
  const [activeTask, setActiveTask] = useState<MCTask | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchBoards = useCallback(async () => {
    if (!instance || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mission-control/boards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch boards");
      const data = await res.json();
      setBoards(data);
    } catch {
      setError("Could not connect to Mission Control");
    } finally {
      setLoading(false);
    }
  }, [instance, token]);

  const fetchAgents = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/mission-control/agents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    }
  }, [token]);

  const fetchTasks = useCallback(
    async (board: MCBoard, silent = false) => {
      if (!token) return;
      if (!silent) setTasksLoading(true);
      try {
        const res = await fetch(
          `/api/mission-control/boards/${board.id}/tasks`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch tasks");
        const data = await res.json();
        setTasks(data);
        if (!silent) setSelectedBoard(board);
      } catch {
        if (!silent) setError("Could not load tasks for this board");
      } finally {
        setTasksLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    if (!selectedBoard) return;
    fetchAgents();
    pollRef.current = setInterval(() => fetchTasks(selectedBoard, true), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedBoard, fetchTasks, fetchAgents]);

  // ---------------------------------------------------------------------------
  // Task actions
  // ---------------------------------------------------------------------------

  async function patchTask(taskId: string, body: Record<string, unknown>) {
    if (!token) return;
    try {
      const res = await fetch(`/api/mission-control/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t))
        );
        // Update detail modal if open
        if (detailTask?.id === taskId) {
          setDetailTask((prev) => (prev ? { ...prev, ...updated } : null));
        }
      }
    } catch {
      // will refresh on next poll
    }
  }

  function handleUpdateTask(taskId: string, updates: Partial<MCTask>) {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
    patchTask(taskId, updates);
  }

  async function handleCreateBoard() {
    if (!token || !newBoardName.trim()) return;
    setCreatingBoard(true);
    try {
      const res = await fetch("/api/mission-control/boards", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newBoardName.trim(),
          description: newBoardDesc.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create board");
      setNewBoardName("");
      setNewBoardDesc("");
      setShowNewBoard(false);
      await fetchBoards();
    } catch {
      // ignore
    } finally {
      setCreatingBoard(false);
    }
  }

  async function handleCreateTask(status: string) {
    if (!token || !selectedBoard || !newTaskTitle.trim()) return;
    setCreatingTask(true);
    try {
      const res = await fetch(
        `/api/mission-control/boards/${selectedBoard.id}/tasks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: newTaskTitle.trim(),
            description: newTaskDescription.trim(),
            agent_name: newTaskAgent || undefined,
            status,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to create task");
      const task = await res.json();
      setTasks((prev) => [...prev, task]);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskAgent("");
      setAddingTaskColumn(null);
    } catch {
      // ignore
    } finally {
      setCreatingTask(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!token) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setDetailTask((prev) => (prev?.id === taskId ? null : prev));
    try {
      await fetch(`/api/mission-control/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // will refresh on next poll
    }
  }

  async function handleDispatchTask(taskId: string) {
    if (!token) return;
    setDispatchError(null);
    try {
      const res = await fetch(`/api/mission-control/tasks/${taskId}/dispatch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: "in_progress" as const,
                  dispatched_at: new Date().toISOString(),
                }
              : t
          )
        );
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = (data as { error?: string }).error || "Dispatch failed";
        setDispatchError(msg);
        setTimeout(() => setDispatchError(null), 5000);
      }
    } catch {
      setDispatchError("Network error — could not dispatch");
      setTimeout(() => setDispatchError(null), 5000);
    }
  }

  // ---------------------------------------------------------------------------
  // Drag & Drop
  // ---------------------------------------------------------------------------

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Only accept drops on valid column targets, not on other task cards
    if (!VALID_STATUSES.has(overId)) return;

    const newStatus = overId as MCTask["status"];
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update + PATCH
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    patchTask(taskId, { status: newStatus });
  }

  // ---------------------------------------------------------------------------
  // Board agents panel
  // ---------------------------------------------------------------------------

  const boardAgentNames = [
    ...new Set(tasks.map((t) => t.agent_name).filter(Boolean)),
  ];
  const boardAgents = agents.filter((a) => boardAgentNames.includes(a.name));
  const agentPanelItems =
    boardAgents.length > 0
      ? boardAgents
      : boardAgentNames.map((name) => ({
          id: name,
          name,
          status: "active" as const,
          tasks_completed: tasks.filter(
            (t) => t.agent_name === name && t.status === "done"
          ).length,
          last_active: new Date().toISOString(),
          cpu_usage: 0,
          memory_usage: 0,
        }));

  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          <p className="font-mono text-xs text-zinc-600">LOADING BOARDS...</p>
        </div>
      </div>
    );
  }

  if (error && !selectedBoard) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <p className="font-mono text-sm text-zinc-300">{error}</p>
        <button
          onClick={fetchBoards}
          className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-mono text-xs text-emerald-400 transition-colors hover:bg-emerald-500/20"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          RETRY
        </button>
      </div>
    );
  }

  // ---- Kanban View ----
  if (selectedBoard) {
    const grouped = columnConfig.map((col) => ({
      ...col,
      tasks: tasks.filter((t) => t.status === col.key),
    }));

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedBoard(null);
              setTasks([]);
              setAgents([]);
              setError(null);
              setAddingTaskColumn(null);
            }}
            className="rounded-lg border border-white/[0.06] bg-[#0c0c0d] p-2 transition-colors hover:border-emerald-500/20 hover:bg-emerald-500/5"
          >
            <ArrowLeft className="h-4 w-4 text-zinc-400" />
          </button>
          <div>
            <h2 className="font-mono text-lg font-bold tracking-tight text-zinc-200">
              {selectedBoard.name}
            </h2>
            {selectedBoard.description && (
              <p className="font-mono text-xs text-zinc-600">
                {selectedBoard.description}
              </p>
            )}
          </div>

          {/* View mode toggle */}
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-white/[0.06] bg-[#0c0c0d] p-0.5">
            <button
              onClick={() => setViewMode("board")}
              className={cn(
                "rounded-md px-2.5 py-1.5 font-mono text-[10px] transition-colors",
                viewMode === "board"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-zinc-600 hover:text-zinc-400"
              )}
            >
              <Columns3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-md px-2.5 py-1.5 font-mono text-[10px] transition-colors",
                viewMode === "list"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-zinc-600 hover:text-zinc-400"
              )}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <span className="font-mono text-[10px] text-emerald-500/70">
              LIVE
            </span>
          </div>
        </div>

        {/* Dispatch error banner */}
        {dispatchError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
            <span className="font-mono text-[10px] text-red-400">
              {dispatchError}
            </span>
          </div>
        )}

        {tasksLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        ) : viewMode === "list" ? (
          /* ---- List View ---- */
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_100px_100px_100px_100px] gap-2 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-600">
              <span>Task</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Agent</span>
              <span>Due</span>
            </div>
            <AnimatePresence mode="popLayout">
              {tasks.map((task) => {
                const priority = priorityConfig[task.priority];
                const col = columnConfig.find((c) => c.key === task.status);
                const isOverdue =
                  task.due_date &&
                  new Date(task.due_date).getTime() < Date.now() &&
                  task.status !== "done";
                return (
                  <motion.div
                    key={task.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    layout
                    className="group grid grid-cols-[1fr_100px_100px_100px_100px] items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c0c0d] px-3 py-2.5 transition-all hover:border-white/10"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => setDetailTask(task)}
                        className="min-w-0 truncate text-left font-mono text-sm text-zinc-300 transition-colors hover:text-white"
                      >
                        {task.title}
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="shrink-0 rounded p-1 text-zinc-700 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn("h-2 w-2 rounded-full", col?.dotColor)}
                      />
                      <span
                        className={cn("font-mono text-[10px]", col?.color)}
                      >
                        {col?.label}
                      </span>
                    </div>
                    <select
                      value={task.priority}
                      onChange={(e) =>
                        handleUpdateTask(task.id, {
                          priority: e.target.value as MCTask["priority"],
                        })
                      }
                      className={cn(
                        "rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold w-fit outline-none cursor-pointer",
                        priority.badge
                      )}
                    >
                      <option value="low">LOW</option>
                      <option value="medium">MED</option>
                      <option value="high">HIGH</option>
                    </select>
                    {task.agent_name ? (
                      <div className="flex items-center gap-1">
                        <Bot className="h-3 w-3 text-emerald-400" />
                        <span className="truncate font-mono text-[10px] text-emerald-400">
                          {task.agent_name}
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] text-zinc-700">
                        --
                      </span>
                    )}
                    <div>
                      {task.due_date ? (
                        <span
                          className={cn(
                            "font-mono text-[10px]",
                            isOverdue ? "text-red-400" : "text-zinc-600"
                          )}
                        >
                          {daysUntil(task.due_date)}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-zinc-700">
                          --
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {tasks.length === 0 && (
              <div className="rounded-lg border border-dashed border-white/[0.06] py-12 text-center font-mono text-[10px] text-zinc-700">
                NO TASKS
              </div>
            )}
          </div>
        ) : (
          /* ---- Board View (Agents + 4 status columns with drag & drop) ---- */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3 overflow-x-auto pb-4">
              {/* Agents Panel */}
              <div className="w-48 shrink-0">
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c0c0d] px-3 py-2">
                  <Bot className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-mono text-xs font-bold tracking-wider text-emerald-400">
                    AGENTS
                  </span>
                  <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                    {agentPanelItems.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {agentPanelItems.map((agent) => {
                    const agentTaskCount = tasks.filter(
                      (t) => t.agent_name === agent.name
                    ).length;
                    const activeCount = tasks.filter(
                      (t) =>
                        t.agent_name === agent.name &&
                        t.status === "in_progress"
                    ).length;
                    return (
                      <motion.div
                        key={agent.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        className="rounded-lg border border-white/[0.06] bg-[#0c0c0d] p-3 transition-all hover:border-emerald-500/15"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-500/20 bg-emerald-500/10">
                            <Bot className="h-3.5 w-3.5 text-emerald-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-mono text-[11px] font-bold text-zinc-300">
                              {agent.name}
                            </p>
                            <div className="flex items-center gap-1">
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  agent.status === "active"
                                    ? "bg-emerald-400"
                                    : agent.status === "pending"
                                      ? "bg-amber-400"
                                      : "bg-zinc-600"
                                )}
                              />
                              <span className="font-mono text-[9px] uppercase text-zinc-600">
                                {agent.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-white/[0.04] pt-2">
                          <span className="font-mono text-[9px] text-zinc-600">
                            {agentTaskCount} task
                            {agentTaskCount !== 1 ? "s" : ""}
                          </span>
                          {activeCount > 0 && (
                            <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 font-mono text-[9px] text-blue-400">
                              {activeCount} active
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  {agentPanelItems.length === 0 && (
                    <div className="rounded-lg border border-dashed border-white/[0.06] py-6 text-center font-mono text-[9px] text-zinc-700">
                      NO AGENTS
                    </div>
                  )}
                </div>
              </div>

              {/* Status Columns */}
              {grouped.map((column) => (
                <div key={column.key} className="min-w-[240px] flex-1">
                  {/* Column header */}
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c0c0d] px-3 py-2">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        column.dotColor
                      )}
                    />
                    <span
                      className={cn(
                        "font-mono text-xs font-bold tracking-wider",
                        column.color
                      )}
                    >
                      {column.label.toUpperCase()}
                    </span>
                    <span
                      className={cn(
                        "ml-auto rounded-full px-2 py-0.5 font-mono text-[10px] font-bold",
                        column.countBg
                      )}
                    >
                      {column.tasks.length}
                    </span>
                  </div>

                  {/* Droppable zone */}
                  <DroppableColumn id={column.key}>
                    <SortableContext
                      items={column.tasks.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {column.tasks.map((task) => (
                        <DraggableTaskCard
                          key={task.id}
                          task={task}
                          agents={agents}
                          token={token!}
                          onUpdateTask={handleUpdateTask}
                          onDispatch={handleDispatchTask}
                          onDelete={handleDeleteTask}
                          onOpenDetail={setDetailTask}
                        />
                      ))}
                    </SortableContext>

                    {column.tasks.length === 0 &&
                      addingTaskColumn !== column.key && (
                        <div className="rounded-lg border border-dashed border-white/[0.06] py-6 text-center">
                          <p className="font-mono text-[10px] text-zinc-700">
                            NO TASKS
                          </p>
                          {column.key === "inbox" && (
                            <p className="mt-1 font-mono text-[9px] text-zinc-800">
                              Add a task, assign an agent, and dispatch
                            </p>
                          )}
                        </div>
                      )}
                  </DroppableColumn>

                  {/* Add task form / button */}
                  {addingTaskColumn === column.key ? (
                    <div className="mt-2 rounded-lg border border-emerald-500/20 bg-[#0c0c0d] p-3 space-y-2">
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            newTaskTitle.trim() &&
                            !e.shiftKey
                          ) {
                            handleCreateTask(column.key);
                          }
                          if (e.key === "Escape") {
                            setAddingTaskColumn(null);
                            setNewTaskTitle("");
                            setNewTaskDescription("");
                            setNewTaskAgent("");
                          }
                        }}
                        placeholder="Task title..."
                        autoFocus
                        disabled={creatingTask}
                        className="w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/30"
                      />
                      <textarea
                        value={newTaskDescription}
                        onChange={(e) =>
                          setNewTaskDescription(e.target.value)
                        }
                        placeholder="Description (context for the agent)..."
                        rows={2}
                        disabled={creatingTask}
                        className="w-full resize-none rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-[10px] text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/30"
                      />
                      {agents.length > 0 && (
                        <select
                          value={newTaskAgent}
                          onChange={(e) => setNewTaskAgent(e.target.value)}
                          disabled={creatingTask}
                          className="w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-1.5 font-mono text-[10px] text-zinc-400 outline-none focus:border-emerald-500/30"
                        >
                          <option value="">Assign agent (optional)</option>
                          {agents.map((a) => (
                            <option key={a.id} value={a.name}>
                              {a.name}
                              {a.role ? ` — ${a.role}` : ""}
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCreateTask(column.key)}
                          disabled={!newTaskTitle.trim() || creatingTask}
                          className="flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[10px] font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          {creatingTask ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                          ADD
                        </button>
                        <button
                          onClick={() => {
                            setAddingTaskColumn(null);
                            setNewTaskTitle("");
                            setNewTaskDescription("");
                            setNewTaskAgent("");
                          }}
                          className="rounded-md px-2 py-1.5 font-mono text-[10px] text-zinc-600 hover:text-zinc-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingTaskColumn(column.key);
                        setNewTaskTitle("");
                      }}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.06] py-2 font-mono text-[10px] text-zinc-700 transition-colors hover:border-emerald-500/20 hover:text-emerald-500/70"
                    >
                      <Plus className="h-3 w-3" />
                      ADD TASK
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Drag overlay */}
            <DragOverlay>
              {activeTask && (
                <div className="w-[240px] rounded-lg border border-emerald-500/30 bg-[#0c0c0d] p-3 shadow-2xl">
                  <p className="font-mono text-sm font-medium text-zinc-200">
                    {activeTask.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold",
                        priorityConfig[activeTask.priority].badge
                      )}
                    >
                      {priorityConfig[activeTask.priority].label}
                    </span>
                    {activeTask.agent_name && (
                      <span className="font-mono text-[10px] text-emerald-400">
                        {activeTask.agent_name}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        {/* Task Detail Modal */}
        <AnimatePresence>
          {detailTask && (
            <TaskDetailModal
              key={detailTask.id}
              task={detailTask}
              agents={agents}
              token={token!}
              onClose={() => setDetailTask(null)}
              onSave={async (taskId, updates) => {
                await patchTask(taskId, updates);
              }}
              onDispatch={handleDispatchTask}
              onDelete={handleDeleteTask}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ---- Board List View ----
  const boardsByGroup: Record<string, MCBoard[]> = {};
  const ungroupedBoards: MCBoard[] = [];
  boards.forEach((board) => {
    if (board.board_group_id) {
      if (!boardsByGroup[board.board_group_id]) {
        boardsByGroup[board.board_group_id] = [];
      }
      boardsByGroup[board.board_group_id].push(board);
    } else {
      ungroupedBoards.push(board);
    }
  });

  const groupIds = Object.keys(boardsByGroup);

  function renderBoardCard(board: MCBoard) {
    return (
      <motion.button
        key={board.id}
        variants={itemVariants}
        onClick={() => fetchTasks(board)}
        className="group overflow-hidden rounded-lg border border-white/[0.06] bg-[#0c0c0d] text-left transition-all hover:border-emerald-500/15 hover:shadow-[0_0_20px_rgba(16,185,129,0.04)]"
      >
        <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
              <LayoutGrid className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-bold tracking-tight text-zinc-200">
                {board.name}
              </p>
              {board.board_group_id && (
                <span className="mt-0.5 inline-block rounded border border-zinc-700/50 bg-zinc-800/50 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">
                  GROUP {board.board_group_id.slice(0, 6)}
                </span>
              )}
              <p className="mt-1 line-clamp-2 font-mono text-xs text-zinc-600">
                {board.description}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-3">
            <div className="flex items-center gap-1.5">
              <ClipboardList className="h-3 w-3 text-zinc-600" />
              <span className="font-mono text-[10px] text-zinc-500">
                {board.task_count}{" "}
                {board.task_count === 1 ? "task" : "tasks"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-zinc-700" />
              <span className="font-mono text-[10px] text-zinc-600">
                {relativeTime(board.created_at)}
              </span>
            </div>
          </div>
        </div>
      </motion.button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
            <LayoutGrid className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-mono text-lg font-bold tracking-tight text-zinc-200">
              Task Boards
            </h1>
            <p className="font-mono text-xs text-zinc-600">
              {boards.length} board{boards.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNewBoard(true)}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 font-mono text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500/20"
        >
          <Plus className="h-3.5 w-3.5" />
          NEW BOARD
        </button>
      </div>

      {/* New board form */}
      <AnimatePresence>
        {showNewBoard && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-emerald-500/20 bg-[#0c0c0d] p-4 space-y-3">
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newBoardName.trim())
                    handleCreateBoard();
                  if (e.key === "Escape") setShowNewBoard(false);
                }}
                placeholder="Board name..."
                autoFocus
                className="w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/30"
              />
              <textarea
                value={newBoardDesc}
                onChange={(e) => setNewBoardDesc(e.target.value)}
                placeholder="Description (optional)..."
                rows={2}
                className="w-full resize-none rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/30"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateBoard}
                  disabled={!newBoardName.trim() || creatingBoard}
                  className="flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {creatingBoard ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  CREATE
                </button>
                <button
                  onClick={() => setShowNewBoard(false)}
                  className="rounded-md px-3 py-1.5 font-mono text-xs text-zinc-600 hover:text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boards grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {ungroupedBoards.map(renderBoardCard)}
      </motion.div>

      {groupIds.map((groupId) => (
        <div key={groupId} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-zinc-700/40 to-transparent" />
            <span className="rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 font-mono text-[9px] text-zinc-500">
              GROUP {groupId.slice(0, 8)}
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-zinc-700/40 to-transparent" />
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {boardsByGroup[groupId].map(renderBoardCard)}
          </motion.div>
        </div>
      ))}

      {boards.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0d] p-4">
            <LayoutGrid className="h-8 w-8 text-zinc-700" />
          </div>
          <p className="font-mono text-sm text-zinc-500">No boards yet</p>
          <p className="font-mono text-xs text-zinc-700">
            Create a board to start organizing tasks
          </p>
        </div>
      )}
    </div>
  );
}
