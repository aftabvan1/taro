import {
  Inbox,
  ClipboardList,
  Loader2,
  Eye,
  CheckCircle2,
} from "lucide-react";

export const priorityConfig = {
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

export const VALID_STATUSES = new Set([
  "inbox",
  "todo",
  "in_progress",
  "review",
  "done",
]);

export const columnConfig = [
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
