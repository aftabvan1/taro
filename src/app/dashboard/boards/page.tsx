"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  ClipboardList,
  Circle,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "../layout";
import type { MCBoard, MCTask, MCAgent, MCTag } from "@/lib/mission-control/types";

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

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

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

const statusCycle: Record<string, MCTask["status"]> = {
  inbox: "in_progress",
  in_progress: "review",
  review: "done",
  done: "inbox",
  todo: "in_progress",
};

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

  async function handleUpdateTaskAgent(taskId: string, agentName: string) {
    if (!token) return;
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, agent_name: agentName } : t
      )
    );
    try {
      await fetch(`/api/mission-control/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agent_name: agentName }),
      });
    } catch {
      // Revert on error — will refresh on next poll
    }
  }

  async function handleCycleStatus(task: MCTask) {
    if (!token) return;
    const nextStatus = statusCycle[task.status] || "inbox";
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: nextStatus } : t
      )
    );
    try {
      await fetch(`/api/mission-control/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!token) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await fetch(`/api/mission-control/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // will refresh on next poll
    }
  }

  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [viewingOutput, setViewingOutput] = useState<MCTask | null>(null);

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

  // Get unique agent names from tasks for the agents panel
  const boardAgentNames = [...new Set(tasks.map((t) => t.agent_name).filter(Boolean))];
  const boardAgents = agents.filter((a) => boardAgentNames.includes(a.name));
  // If we don't have agent data yet, create placeholder entries from task agent names
  const agentPanelItems = boardAgents.length > 0
    ? boardAgents
    : boardAgentNames.map((name) => ({
        id: name,
        name,
        status: "active" as const,
        tasks_completed: tasks.filter((t) => t.agent_name === name && t.status === "done").length,
        last_active: new Date().toISOString(),
        cpu_usage: 0,
        memory_usage: 0,
      }));

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
            <span className="font-mono text-[10px] text-red-400">{dispatchError}</span>
          </div>
        )}

        {tasksLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        ) : viewMode === "list" ? (
          /* ---- List View ---- */
          <div className="space-y-1">
            {/* List header */}
            <div className="grid grid-cols-[1fr_100px_100px_100px_80px] gap-2 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-600">
              <span>Task</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Agent</span>
              <span>Tags</span>
            </div>
            <AnimatePresence mode="popLayout">
              {tasks.map((task) => {
                const priority = priorityConfig[task.priority];
                const col = columnConfig.find((c) => c.key === task.status);
                return (
                  <motion.div
                    key={task.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    layout
                    className="group grid grid-cols-[1fr_100px_100px_100px_80px] items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c0c0d] px-3 py-2.5 transition-all hover:border-white/10"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => handleCycleStatus(task)}
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
                      <span className={cn("h-2 w-2 rounded-full", col?.dotColor)} />
                      <span className={cn("font-mono text-[10px]", col?.color)}>
                        {col?.label}
                      </span>
                    </div>
                    <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold w-fit", priority.badge)}>
                      {priority.label}
                    </span>
                    {task.agent_name ? (
                      <div className="flex items-center gap-1">
                        <Bot className="h-3 w-3 text-emerald-400" />
                        <span className="truncate font-mono text-[10px] text-emerald-400">
                          {task.agent_name}
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] text-zinc-700">--</span>
                    )}
                    <div className="flex items-center gap-1">
                      {task.tags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag.id}
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                          title={tag.name}
                        />
                      ))}
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
          /* ---- Board View (5-column: Agents + 4 status columns) ---- */
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
                    (t) => t.agent_name === agent.name && t.status === "in_progress"
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
                          {agentTaskCount} task{agentTaskCount !== 1 ? "s" : ""}
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
                <div
                  className={cn(
                    "mb-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c0c0d] px-3 py-2"
                  )}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full", column.dotColor)} />
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

                {/* Tasks */}
                <AnimatePresence mode="popLayout">
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                  >
                    {column.tasks.map((task) => {
                      const priority = priorityConfig[task.priority];
                      const isOverdue =
                        task.due_date &&
                        new Date(task.due_date).getTime() < Date.now() &&
                        task.status !== "done";

                      return (
                        <motion.div
                          key={task.id}
                          variants={itemVariants}
                          layout
                          className="group overflow-hidden rounded-lg border border-white/[0.06] bg-[#0c0c0d] transition-all hover:border-white/10"
                        >
                          {/* Priority stripe */}
                          <div
                            className={cn("h-[2px] w-full", priority.stripe)}
                          />
                          <div className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <button
                                onClick={() => handleCycleStatus(task)}
                                className="min-w-0 flex-1 text-left"
                                title={`Click to move to ${statusCycle[task.status]?.replace("_", " ")}`}
                              >
                                <p className="font-mono text-sm font-medium text-zinc-300 transition-colors hover:text-white">
                                  {task.title}
                                </p>
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="shrink-0 rounded p-1 text-zinc-700 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                                title="Delete task"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            {/* Description preview */}
                            {task.description && (
                              <p className="mt-1.5 line-clamp-2 font-mono text-[10px] text-zinc-500">
                                {task.description}
                              </p>
                            )}
                            {/* Dispatch button / Dispatched indicator */}
                            {task.dispatched_at ? (
                              <div className="mt-1.5 space-y-1">
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
                                {task.dispatch_output && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingOutput(task);
                                    }}
                                    className="flex items-center gap-1 rounded border border-white/[0.08] bg-white/[0.02] px-1.5 py-0.5 font-mono text-[9px] text-zinc-400 transition-colors hover:border-emerald-500/20 hover:text-emerald-400"
                                  >
                                    <Eye className="h-2.5 w-2.5" />
                                    VIEW OUTPUT
                                  </button>
                                )}
                              </div>
                            ) : task.agent_name && task.status !== "done" ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDispatchTask(task.id);
                                }}
                                className="mt-1.5 flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-[10px] font-bold text-emerald-400 transition-all hover:bg-emerald-500/20 hover:shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                              >
                                <Zap className="h-3 w-3" />
                                DISPATCH
                              </button>
                            ) : null}
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              {/* Agent assignment dropdown */}
                              <select
                                value={task.agent_name || ""}
                                onChange={(e) =>
                                  handleUpdateTaskAgent(task.id, e.target.value)
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
                              <span
                                className={cn(
                                  "rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold",
                                  priority.badge
                                )}
                              >
                                {priority.label}
                              </span>
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
                              {task.due_date && (
                                <div
                                  className={cn(
                                    "flex items-center gap-1",
                                    isOverdue
                                      ? "text-red-400"
                                      : "text-zinc-600"
                                  )}
                                >
                                  <Calendar className="h-3 w-3" />
                                  <span className="font-mono text-[10px]">
                                    {new Date(
                                      task.due_date
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>
                            {task.assignee && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 font-mono text-[9px] font-bold text-zinc-400">
                                  {task.assignee[0]?.toUpperCase()}
                                </div>
                                <span className="font-mono text-[10px] text-zinc-600">
                                  {task.assignee}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                    {column.tasks.length === 0 && addingTaskColumn !== column.key && (
                      <div className="rounded-lg border border-dashed border-white/[0.06] py-6 text-center">
                        <p className="font-mono text-[10px] text-zinc-700">NO TASKS</p>
                        {column.key === "inbox" && (
                          <p className="mt-1 font-mono text-[9px] text-zinc-800">
                            Add a task, assign an agent, and dispatch
                          </p>
                        )}
                      </div>
                    )}

                    {/* Add task form */}
                    {addingTaskColumn === column.key ? (
                      <div className="rounded-lg border border-emerald-500/20 bg-[#0c0c0d] p-3 space-y-2">
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newTaskTitle.trim() && !e.shiftKey) {
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
                          onChange={(e) => setNewTaskDescription(e.target.value)}
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
                                {a.name}{a.role ? ` — ${a.role}` : ""}
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
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.06] py-2 font-mono text-[10px] text-zinc-700 transition-colors hover:border-emerald-500/20 hover:text-emerald-500/70"
                      >
                        <Plus className="h-3 w-3" />
                        ADD TASK
                      </button>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {/* Dispatch Output Modal */}
        <AnimatePresence>
          {viewingOutput && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setViewingOutput(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0c0d] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="font-mono text-sm font-bold text-zinc-200">
                      {viewingOutput.title}
                    </span>
                  </div>
                  <button
                    onClick={() => setViewingOutput(null)}
                    className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-white/[0.04] hover:text-zinc-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3 text-[10px]">
                    {viewingOutput.agent_name && (
                      <div className="flex items-center gap-1 font-mono text-emerald-400">
                        <Bot className="h-3 w-3" />
                        {viewingOutput.agent_name}
                      </div>
                    )}
                    {viewingOutput.dispatched_at && (
                      <div className="flex items-center gap-1 font-mono text-zinc-500">
                        <Clock className="h-3 w-3" />
                        Dispatched {relativeTime(viewingOutput.dispatched_at)}
                      </div>
                    )}
                    {viewingOutput.openclaw_session_id && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(viewingOutput.openclaw_session_id!);
                        }}
                        className="flex items-center gap-1 rounded border border-white/[0.08] bg-white/[0.02] px-1.5 py-0.5 font-mono text-zinc-600 transition-colors hover:text-zinc-400"
                        title="Copy session ID"
                      >
                        Session: {viewingOutput.openclaw_session_id.slice(0, 20)}...
                      </button>
                    )}
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-white/[0.06] bg-black/40 p-4">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-300">
                      {viewingOutput.dispatch_output || "No output available"}
                    </pre>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ---- Board List View ----
  // Group boards by board_group_id
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

  // No boards — show a helpful empty state
  if (boards.length === 0) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-white/[0.06] bg-[#0c0c0d] py-16">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
            <LayoutGrid className="h-8 w-8 text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="font-mono text-sm font-bold text-zinc-300">No boards yet</p>
            <p className="mt-1.5 max-w-md font-mono text-xs text-zinc-600">
              Boards organize tasks into a Kanban workflow. Create a board, add tasks, assign agents, and dispatch.
            </p>
          </div>

          {/* Mini Kanban preview */}
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-2.5">
            {["Inbox", "In Progress", "Review", "Done"].map((col, i) => (
              <div key={col} className="flex items-center gap-2">
                {i > 0 && <span className="text-zinc-700">→</span>}
                <span className="rounded border border-white/[0.06] bg-white/[0.03] px-2 py-1 font-mono text-[9px] text-zinc-500">
                  {col}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowNewBoard(true)}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-mono text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            CREATE YOUR FIRST BOARD
          </button>
        </div>

        {/* New board form (shows when button clicked) */}
        {showNewBoard && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto w-full max-w-md rounded-lg border border-emerald-500/20 bg-[#0c0c0d] p-4 space-y-3"
          >
            <input
              type="text"
              placeholder="Board name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newBoardName.trim()) handleCreateBoard();
              }}
              autoFocus
              className="w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/30"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newBoardDesc}
              onChange={(e) => setNewBoardDesc(e.target.value)}
              className="w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/30"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateBoard}
                disabled={!newBoardName.trim() || creatingBoard}
                className="flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[10px] font-bold text-emerald-400 disabled:opacity-40"
              >
                {creatingBoard ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                CREATE
              </button>
              <button
                onClick={() => setShowNewBoard(false)}
                className="font-mono text-[10px] text-zinc-600 hover:text-zinc-400"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-500/50">
          Project Boards
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/20 to-transparent" />
      </div>

      {/* Grouped boards */}
      {groupIds.map((groupId) => (
        <div key={groupId} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px w-4 bg-zinc-700/50" />
            <span className="rounded border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              Group {groupId.slice(0, 8)}
            </span>
            <div className="h-px flex-1 bg-zinc-700/30" />
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

      {/* Ungrouped boards + New Board card */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {ungroupedBoards.map(renderBoardCard)}

        {/* New Board Card */}
        {showNewBoard ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="overflow-hidden rounded-lg border border-emerald-500/20 bg-[#0c0c0d]"
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
            <div className="p-4">
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Board name..."
                autoFocus
                disabled={creatingBoard}
                className="w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newBoardName.trim()) handleCreateBoard();
                  if (e.key === "Escape") {
                    setShowNewBoard(false);
                    setNewBoardName("");
                    setNewBoardDesc("");
                  }
                }}
              />
              <input
                type="text"
                value={newBoardDesc}
                onChange={(e) => setNewBoardDesc(e.target.value)}
                placeholder="Description (optional)..."
                disabled={creatingBoard}
                className="mt-2 w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newBoardName.trim()) handleCreateBoard();
                  if (e.key === "Escape") {
                    setShowNewBoard(false);
                    setNewBoardName("");
                    setNewBoardDesc("");
                  }
                }}
              />
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleCreateBoard}
                  disabled={!newBoardName.trim() || creatingBoard}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-mono text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {creatingBoard ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  CREATE
                </button>
                <button
                  onClick={() => {
                    setShowNewBoard(false);
                    setNewBoardName("");
                    setNewBoardDesc("");
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
            onClick={() => setShowNewBoard(true)}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/[0.08] bg-[#0c0c0d] p-8 transition-all hover:border-emerald-500/20 hover:bg-emerald-500/[0.02]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-white/[0.12] bg-white/[0.02]">
              <Plus className="h-4 w-4 text-zinc-600" />
            </div>
            <span className="font-mono text-xs text-zinc-600">NEW BOARD</span>
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
