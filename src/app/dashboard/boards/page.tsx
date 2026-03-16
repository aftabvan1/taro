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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "../layout";
import type { MCBoard, MCTask } from "@/lib/mission-control/types";

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

const columnConfig = [
  {
    key: "todo" as const,
    label: "Todo",
    icon: Circle,
    color: "text-zinc-400",
    headerBorder: "border-zinc-500/20",
    countBg: "bg-zinc-500/10 text-zinc-400",
  },
  {
    key: "in_progress" as const,
    label: "In Progress",
    icon: Loader2,
    color: "text-amber-400",
    headerBorder: "border-amber-500/20",
    countBg: "bg-amber-500/10 text-amber-400",
  },
  {
    key: "done" as const,
    label: "Done",
    icon: CheckCircle2,
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
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Auto-refresh tasks when viewing a board
  useEffect(() => {
    if (!selectedBoard) return;
    pollRef.current = setInterval(() => fetchTasks(selectedBoard, true), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedBoard, fetchTasks]);

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
              setError(null);
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
          <div className="ml-auto flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <span className="font-mono text-[10px] text-emerald-500/70">LIVE</span>
          </div>
        </div>

        {tasksLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-white/[0.06] bg-[#0c0c0d]">
            <ClipboardList className="h-8 w-8 text-zinc-600" />
            <p className="font-mono text-xs text-zinc-500">
              No tasks on this board yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            {grouped.map((column) => (
              <div key={column.key}>
                {/* Column header */}
                <div
                  className={cn(
                    "mb-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c0c0d] px-3 py-2",
                    column.key === "in_progress" && "border-t-amber-500/30"
                  )}
                >
                  <column.icon
                    className={cn(
                      "h-3.5 w-3.5",
                      column.color,
                      column.key === "in_progress" && "animate-spin"
                    )}
                    style={
                      column.key === "in_progress"
                        ? { animationDuration: "3s" }
                        : undefined
                    }
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
                            <p className="font-mono text-sm font-medium text-zinc-300">
                              {task.title}
                            </p>
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              {task.agent_name && (
                                <div className="flex items-center gap-1 rounded border border-emerald-500/15 bg-emerald-500/5 px-1.5 py-0.5">
                                  <Bot className="h-3 w-3 text-emerald-400" />
                                  <span className="font-mono text-[10px] text-emerald-400">
                                    {task.agent_name}
                                  </span>
                                </div>
                              )}
                              <span
                                className={cn(
                                  "rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold",
                                  priority.badge
                                )}
                              >
                                {priority.label}
                              </span>
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
                    {column.tasks.length === 0 && (
                      <div className="rounded-lg border border-dashed border-white/[0.06] py-8 text-center font-mono text-[10px] text-zinc-700">
                        NO TASKS
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- Board List View ----
  if (boards.length === 0) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <LayoutGrid className="h-8 w-8 text-zinc-600" />
        </div>
        <p className="font-mono text-sm text-zinc-400">No boards yet</p>
        <p className="max-w-sm text-center font-mono text-xs text-zinc-600">
          Boards will appear here once agents create them through Mission
          Control.
        </p>
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

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {boards.map((board) => (
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
        ))}
      </motion.div>
    </div>
  );
}
