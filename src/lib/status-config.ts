/**
 * Centralized status styling configs for instances and agents.
 */

export const instanceStatusConfig = {
  running: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-400",
    label: "ONLINE",
    glow: "shadow-[0_0_8px_rgba(16,185,129,0.3)]",
  },
  provisioning: {
    dot: "bg-amber-500",
    bg: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-400",
    label: "BOOTING",
    glow: "shadow-[0_0_8px_rgba(245,158,11,0.3)]",
  },
  stopped: {
    dot: "bg-zinc-600",
    bg: "bg-zinc-500/10 border-zinc-500/20",
    text: "text-zinc-500",
    label: "OFFLINE",
    glow: "",
  },
  error: {
    dot: "bg-red-500",
    bg: "bg-red-500/10 border-red-500/20",
    text: "text-red-400",
    label: "FAULT",
    glow: "shadow-[0_0_8px_rgba(239,68,68,0.3)]",
  },
} as const;

export type InstanceStatus = keyof typeof instanceStatusConfig;

export const agentStatusConfig = {
  active: {
    label: "ACTIVE",
    dot: "bg-emerald-500",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  pending: {
    label: "PENDING",
    dot: "bg-amber-500",
    text: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  stopped: {
    label: "STOPPED",
    dot: "bg-zinc-600",
    text: "text-zinc-500",
    bg: "bg-zinc-500/10 border-zinc-500/20",
  },
} as const;

export type AgentStatus = keyof typeof agentStatusConfig;

export const taskStatusColors: Record<string, string> = {
  inbox: "text-amber-400",
  todo: "text-zinc-400",
  in_progress: "text-blue-400",
  review: "text-purple-400",
  done: "text-emerald-400",
};
