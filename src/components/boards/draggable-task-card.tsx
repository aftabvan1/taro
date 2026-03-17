"use client";

import {
  Bot,
  Calendar,
  CheckCircle2,
  GripVertical,
  Trash2,
  Zap,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { daysUntil } from "@/lib/format";
import { priorityConfig } from "./board-config";
import type { MCTask, MCAgent, MCTag } from "@/lib/mission-control/types";

export interface DraggableTaskCardProps {
  task: MCTask;
  agents: MCAgent[];
  token: string;
  onUpdateTask: (taskId: string, updates: Partial<MCTask>) => void;
  onDispatch: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onOpenDetail: (task: MCTask) => void;
}

export function DraggableTaskCard({
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
