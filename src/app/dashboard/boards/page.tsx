"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "../layout";
import type { MCBoard, MCTask } from "@/lib/mission-control/types";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

const priorityConfig = {
  high: { label: "High", className: "bg-red-500/15 text-red-400" },
  medium: { label: "Medium", className: "bg-amber-500/15 text-amber-400" },
  low: { label: "Low", className: "bg-zinc-500/15 text-zinc-400" },
} as const;

const columns = [
  { key: "todo" as const, label: "Todo", color: "text-zinc-400" },
  {
    key: "in_progress" as const,
    label: "In Progress",
    color: "text-amber-400",
  },
  { key: "done" as const, label: "Done", color: "text-emerald-400" },
];

export default function BoardsPage() {
  const { instance, token } = useDashboard();
  const [boards, setBoards] = useState<MCBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<MCBoard | null>(null);
  const [tasks, setTasks] = useState<MCTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    async (board: MCBoard) => {
      if (!token) return;
      setTasksLoading(true);
      try {
        const res = await fetch(
          `/api/mission-control/boards/${board.id}/tasks`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch tasks");
        const data = await res.json();
        setTasks(data);
        setSelectedBoard(board);
      } catch {
        setError("Could not load tasks for this board");
      } finally {
        setTasksLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (error && !selectedBoard) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-400" />
        <p className="text-lg font-medium">{error}</p>
        <p className="text-sm text-muted">
          Make sure your instance is running and Mission Control is accessible.
        </p>
        <button
          onClick={fetchBoards}
          className="mt-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm transition-colors hover:bg-white/[0.08]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (boards.length === 0 && !selectedBoard) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <LayoutGrid className="h-10 w-10 text-muted" />
        </div>
        <p className="text-lg font-medium">No boards yet</p>
        <p className="max-w-sm text-sm text-muted">
          Boards will appear here once agents create them through Mission
          Control.
        </p>
      </div>
    );
  }

  // Task kanban view
  if (selectedBoard) {
    const grouped = columns.map((col) => ({
      ...col,
      tasks: tasks.filter((t) => t.status === col.key),
    }));

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedBoard(null);
              setTasks([]);
              setError(null);
            }}
            className="rounded-lg border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-semibold">{selectedBoard.name}</h2>
            <p className="text-sm text-muted">{selectedBoard.description}</p>
          </div>
        </div>

        {tasksLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
            <p className="text-sm text-muted">{error}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <ClipboardList className="h-8 w-8 text-muted" />
            <p className="text-sm text-muted">No tasks on this board yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {grouped.map((column) => (
              <div key={column.key}>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={cn("text-sm font-semibold", column.color)}
                  >
                    {column.label}
                  </span>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-muted">
                    {column.tasks.length}
                  </span>
                </div>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                  >
                    {column.tasks.map((task) => {
                      const priority = priorityConfig[task.priority];
                      return (
                        <motion.div
                          key={task.id}
                          variants={itemVariants}
                          layout
                          className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
                        >
                          <p className="text-sm font-medium">{task.title}</p>
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="font-mono text-xs text-muted">
                              {task.agent_name}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                priority.className
                              )}
                            >
                              {priority.label}
                            </span>
                          </div>
                          {task.assignee && (
                            <p className="mt-1.5 text-xs text-muted">
                              Assigned to {task.assignee}
                            </p>
                          )}
                        </motion.div>
                      );
                    })}
                    {column.tasks.length === 0 && (
                      <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-xs text-muted">
                        No tasks
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

  // Boards list
  return (
    <div>
      <h2 className="mb-5 text-lg font-semibold">Boards</h2>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {boards.map((board) => (
          <motion.button
            key={board.id}
            variants={itemVariants}
            onClick={() => fetchTasks(board)}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-colors hover:border-white/15 hover:bg-white/[0.05]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10">
                <LayoutGrid className="h-4 w-4 text-brand" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{board.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">
                  {board.description}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted">
              <ClipboardList className="h-3.5 w-3.5" />
              <span>
                {board.task_count} {board.task_count === 1 ? "task" : "tasks"}
              </span>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
