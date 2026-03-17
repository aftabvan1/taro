"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

export function DroppableColumn({
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
