"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Wifi,
  Send,
  Activity,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Terminal,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "../../layout";
import type { OpenClawTranscriptMessage } from "@/lib/mission-control/types";

interface AgentDetail {
  id: string;
  name: string;
  role: string;
  description: string;
  status: "active" | "pending" | "stopped";
  tasks_completed: number;
  last_active: string;
  openclaw_session_id: string | null;
  created_at: string;
  assigned_tasks: {
    id: string;
    board_id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    openclaw_session_id: string | null;
    dispatched_at: string | null;
    created_at: string;
  }[];
  recent_activity: {
    id: string;
    type: string;
    message: string;
    created_at: string;
  }[];
}

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

const statusConfig = {
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

const taskStatusColors: Record<string, string> = {
  inbox: "text-amber-400",
  todo: "text-zinc-400",
  in_progress: "text-blue-400",
  review: "text-purple-400",
  done: "text-emerald-400",
};

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useDashboard();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<OpenClawTranscriptMessage[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);

  // Scoped command prompt
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchAgent = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/mission-control/agents/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch agent");
        const data = await res.json();
        setAgent(data);
      } catch {
        if (!silent) setError("Could not load agent");
      } finally {
        setLoading(false);
      }
    },
    [id, token]
  );

  const fetchTranscript = useCallback(async () => {
    if (!token || !agent?.openclaw_session_id) return;
    setTranscriptLoading(true);
    try {
      const res = await fetch(
        `/api/mission-control/openclaw/sessions/${agent.openclaw_session_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setTranscript(data.messages || []);
      }
    } catch {
      // silent
    } finally {
      setTranscriptLoading(false);
    }
  }, [token, agent?.openclaw_session_id]);

  useEffect(() => {
    fetchAgent();
    const interval = setInterval(() => fetchAgent(true), 5000);
    return () => clearInterval(interval);
  }, [fetchAgent]);

  useEffect(() => {
    if (agent?.openclaw_session_id) {
      fetchTranscript();
      const interval = setInterval(fetchTranscript, 8000);
      return () => clearInterval(interval);
    }
  }, [agent?.openclaw_session_id, fetchTranscript]);

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || sending || !token || !agent?.openclaw_session_id) return;
    setInput("");
    setSending(true);
    try {
      await fetch("/api/mission-control/openclaw/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: msg,
          sessionId: agent.openclaw_session_id,
        }),
      });
      // Refresh transcript after sending
      setTimeout(fetchTranscript, 1000);
    } catch {
      // silent
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          <p className="font-mono text-xs text-zinc-600">LOADING AGENT...</p>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <p className="font-mono text-sm text-zinc-300">{error || "Agent not found"}</p>
        <button
          onClick={() => fetchAgent()}
          className="mt-2 flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-4 py-2 font-mono text-xs text-violet-400 transition-colors hover:bg-violet-500/20"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          RETRY
        </button>
      </div>
    );
  }

  const status = statusConfig[agent.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push("/dashboard/agents")}
          className="mt-1 rounded-lg border border-white/[0.06] bg-[#0c0c0d] p-2 transition-colors hover:border-violet-500/20 hover:bg-violet-500/5"
        >
          <ArrowLeft className="h-4 w-4 text-zinc-400" />
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
              <Bot className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="font-mono text-xl font-bold tracking-tight text-zinc-200">
                {agent.name}
              </h1>
              {agent.role && (
                <p className="font-mono text-xs text-violet-400">{agent.role}</p>
              )}
            </div>
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2 py-0.5",
                status.bg
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
              <span className={cn("font-mono text-[10px] font-bold tracking-wider", status.text)}>
                {status.label}
              </span>
            </div>
          </div>
          {agent.description && (
            <p className="mt-2 max-w-2xl font-mono text-xs text-zinc-500">
              {agent.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="font-mono text-[10px] text-zinc-600">TASKS COMPLETED</p>
            <p className="font-mono text-lg font-bold text-violet-400">
              {agent.tasks_completed}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] text-zinc-600">LAST ACTIVE</p>
            <p className="font-mono text-xs text-zinc-400">
              {relativeTime(agent.last_active)}
            </p>
          </div>
        </div>
      </div>

      {/* Session ID */}
      {agent.openclaw_session_id && (
        <div className="flex items-center gap-2 rounded-lg border border-violet-500/10 bg-violet-500/5 px-3 py-2">
          <Wifi className="h-3.5 w-3.5 text-violet-400" />
          <span className="font-mono text-[10px] text-violet-400">SESSION</span>
          <code className="font-mono text-[10px] text-zinc-400">
            {agent.openclaw_session_id}
          </code>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Transcript + Command Prompt */}
        <div className="space-y-4">
          {/* Session Transcript */}
          <div className="rounded-lg border border-white/[0.06] bg-[#0c0c0d] overflow-hidden">
            <button
              onClick={() => setShowTranscript((s) => !s)}
              className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <span className="font-mono text-xs font-bold tracking-wider text-cyan-400">
                  SESSION TRANSCRIPT
                </span>
                {transcript.length > 0 && (
                  <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-400">
                    {transcript.length}
                  </span>
                )}
              </div>
              {showTranscript ? (
                <ChevronUp className="h-4 w-4 text-zinc-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-600" />
              )}
            </button>

            <AnimatePresence>
              {showTranscript && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="max-h-96 overflow-y-auto border-t border-white/[0.06] px-4 py-3 space-y-2">
                    {transcriptLoading && transcript.length === 0 ? (
                      <div className="flex items-center gap-2 py-4">
                        <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                        <span className="font-mono text-[10px] text-cyan-400/70">
                          Loading transcript...
                        </span>
                      </div>
                    ) : transcript.length === 0 ? (
                      <p className="py-4 text-center font-mono text-[11px] text-zinc-600 italic">
                        {agent.openclaw_session_id
                          ? "No messages yet in this session"
                          : "No OpenClaw session linked"}
                      </p>
                    ) : (
                      transcript.map((msg, i) => (
                        <div key={i} className="flex gap-2">
                          <span
                            className={cn(
                              "font-mono text-[10px] font-bold shrink-0 mt-0.5",
                              msg.role === "user"
                                ? "text-violet-400"
                                : msg.role === "assistant"
                                  ? "text-emerald-400"
                                  : "text-cyan-400"
                            )}
                          >
                            {msg.role === "user"
                              ? "USR"
                              : msg.role === "assistant"
                                ? "AGT"
                                : "SYS"}
                          </span>
                          <p className="font-mono text-[11px] text-zinc-300 break-all whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scoped Command Prompt */}
          {agent.openclaw_session_id && (
            <div className="rounded-lg border border-violet-500/20 bg-[#0c0c0d]">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2">
                <Terminal className="h-3.5 w-3.5 text-violet-400" />
                <span className="font-mono text-[10px] font-bold tracking-wider text-violet-400">
                  SEND TO {agent.name.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="font-mono text-[11px] text-violet-500">$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder={`Message ${agent.name}...`}
                  className="flex-1 bg-transparent font-mono text-xs text-zinc-200 placeholder-zinc-700 outline-none"
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-violet-500/20 bg-violet-500/10 text-violet-400 transition-all hover:bg-violet-500/20 disabled:opacity-30"
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Tasks + Activity */}
        <div className="space-y-4">
          {/* Assigned Tasks */}
          <div className="rounded-lg border border-white/[0.06] bg-[#0c0c0d] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <ClipboardList className="h-4 w-4 text-emerald-400" />
              <span className="font-mono text-xs font-bold tracking-wider text-emerald-400">
                ASSIGNED TASKS
              </span>
              <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                {agent.assigned_tasks.length}
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
              {agent.assigned_tasks.length === 0 ? (
                <p className="py-6 text-center font-mono text-[11px] text-zinc-600 italic">
                  No tasks assigned to this agent
                </p>
              ) : (
                agent.assigned_tasks.map((task) => (
                  <div key={task.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs font-medium text-zinc-300 truncate">
                        {task.title}
                      </p>
                      <span
                        className={cn(
                          "font-mono text-[9px] font-bold uppercase",
                          taskStatusColors[task.status] || "text-zinc-500"
                        )}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                    {task.dispatched_at && (
                      <div className="mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-zinc-700" />
                        <span className="font-mono text-[9px] text-zinc-600">
                          Dispatched {relativeTime(task.dispatched_at)}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-lg border border-white/[0.06] bg-[#0c0c0d] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span className="font-mono text-xs font-bold tracking-wider text-cyan-400">
                RECENT ACTIVITY
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
              {agent.recent_activity.length === 0 ? (
                <p className="py-6 text-center font-mono text-[11px] text-zinc-600 italic">
                  No activity recorded yet
                </p>
              ) : (
                agent.recent_activity.map((entry) => (
                  <div key={entry.id} className="px-4 py-2.5">
                    <p className="font-mono text-[11px] text-zinc-400">
                      {entry.message}
                    </p>
                    <span className="font-mono text-[9px] text-zinc-600">
                      {relativeTime(entry.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
