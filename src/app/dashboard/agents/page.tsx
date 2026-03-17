"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Zap,
  Activity,
  RefreshCw,
  Send,
  Terminal,
  Wifi,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import { dashboardContainer, dashboardItem } from "@/lib/animation-variants";
import { agentStatusConfig } from "@/lib/status-config";
import { useDashboard } from "../layout";
import { ConnectionStatus } from "@/components/dashboard/connection-status";
import type { MCAgent, OpenClawSession } from "@/lib/mission-control/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const containerVariants = dashboardContainer;
const itemVariants = dashboardItem;
const statusConfig = agentStatusConfig;

// ---------------------------------------------------------------------------
// Command prompt component
// ---------------------------------------------------------------------------

interface PromptMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

function CommandPrompt({ token }: { token: string }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<PromptMessage[]>([]);
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || sending) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: msg, timestamp: new Date().toISOString() },
    ]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/mission-control/openclaw/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: msg }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error
              ? `Error: ${data.error}`
              : "Prompt sent to OpenClaw. Check Live Feed for agent responses.",
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: data.error || "Failed to send message",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: "Network error — could not reach the server",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-violet-500/20 bg-[#0c0c0d] overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-violet-400" />
          <span className="font-mono text-xs font-bold tracking-wider text-violet-400">
            COMMAND PROMPT
          </span>
          <span className="rounded border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.5 font-mono text-[9px] text-violet-400">
            LIVE
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-600" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            {/* Message history */}
            <div
              ref={scrollRef}
              className="max-h-64 overflow-y-auto border-t border-white/[0.06] px-4 py-3 space-y-2"
            >
              {messages.length === 0 && (
                <p className="font-mono text-[11px] text-zinc-600 italic">
                  Send a prompt to your live OpenClaw instance. Messages go directly to the agent.
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i} className="flex gap-2">
                  <span
                    className={cn(
                      "font-mono text-[10px] font-bold shrink-0 mt-0.5",
                      msg.role === "user"
                        ? "text-violet-400"
                        : msg.role === "assistant"
                          ? "text-emerald-400"
                          : "text-red-400"
                    )}
                  >
                    {msg.role === "user" ? "YOU" : msg.role === "assistant" ? "SYS" : "ERR"}
                  </span>
                  <p className="font-mono text-[11px] text-zinc-300 break-all">
                    {msg.content}
                  </p>
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
                  <span className="font-mono text-[10px] text-violet-400/70">
                    Sending to OpenClaw...
                  </span>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-3">
              <span className="font-mono text-[11px] text-violet-500">$</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder="Send a prompt to OpenClaw..."
                className="flex-1 bg-transparent font-mono text-xs text-zinc-200 placeholder-zinc-700 outline-none"
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-violet-500/20 bg-violet-500/10 text-violet-400 transition-all hover:bg-violet-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ConnectionStatus is imported from @/components/dashboard/connection-status

// ---------------------------------------------------------------------------
// Live sessions panel
// ---------------------------------------------------------------------------

function LiveSessions({ token }: { token: string }) {
  const [sessions, setSessions] = useState<OpenClawSession[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const fetchSessions = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const res = await fetch("/api/mission-control/openclaw/sessions", {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(8000),
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          const sessionList = Array.isArray(data)
            ? data
            : Array.isArray(data.sessions)
              ? data.sessions
              : [];
          setSessions(sessionList);
        }
      } catch {
        // silent
      } finally {
        fetchingRef.current = false;
        if (!cancelled) setLoading(false);
      }
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  if (loading) return null;
  if (sessions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/20 to-transparent" />
        <MessageSquare className="h-4 w-4 text-cyan-400" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-500/70">
          Live Sessions
        </span>
        <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-400">
          {sessions.length}
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-cyan-500/20 to-transparent" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <div
            key={session.sessionId}
            className="rounded-lg border border-white/[0.06] bg-[#0c0c0d] p-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-zinc-300 truncate">
                {session.agentName || session.sessionId.slice(0, 12)}
              </span>
              <span className="rounded border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-400">
                {session.status || "active"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-zinc-600">
              <span>ID: {session.sessionId.slice(0, 8)}...</span>
              {session.model && <span>Model: {session.model}</span>}
              {session.messages !== undefined && <span>{session.messages} msgs</span>}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Create Agent Modal
// ---------------------------------------------------------------------------

function CreateAgentModal({
  token,
  onClose,
  onCreated,
}: {
  token: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/mission-control/agents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          description: description.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create agent");
      }
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
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
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#0c0c0d] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-violet-400" />
            <span className="font-mono text-sm font-bold text-zinc-200">
              Create Agent
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-600 hover:text-zinc-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Code Reviewer"
              autoFocus
              className="w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-500/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Frontend Developer, QA Engineer"
              className="w-full rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-500/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              Description / Personality
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agent instructions, personality, constraints... (SOUL.md equivalent)"
              rows={4}
              className="w-full resize-none rounded-md border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-500/30"
            />
          </div>

          {error && (
            <p className="font-mono text-[11px] text-red-400">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 font-mono text-xs text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/10 px-4 py-2 font-mono text-xs font-bold text-violet-400 transition-all hover:bg-violet-500/20 disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            CREATE AGENT
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AgentsPage() {
  const router = useRouter();
  const { instance, token } = useDashboard();
  const [agents, setAgents] = useState<MCAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visibilityRef = useRef(true);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!instance || !token || !visibilityRef.current) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const agentsRes = await fetch("/api/mission-control/agents", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!agentsRes.ok) throw new Error("Failed to fetch");
        const agentsData = await agentsRes.json();
        setAgents(agentsData);
      } catch {
        if (!silent) setError("Could not connect to Mission Control");
      } finally {
        setLoading(false);
      }
    },
    [instance, token]
  );

  // Pause polling when tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      visibilityRef.current = document.visibilityState === "visible";
      if (visibilityRef.current) fetchData(true);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(() => fetchData(true), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData]);

  // Stats
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const totalTasks = agents.reduce((sum, a) => sum + a.tasks_completed, 0);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          <p className="font-mono text-xs text-zinc-600">
            CONNECTING TO MISSION CONTROL...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <p className="font-mono text-sm text-zinc-300">{error}</p>
        <p className="max-w-sm text-center font-mono text-xs text-zinc-600">
          Ensure your instance is running and Mission Control is reachable.
        </p>
        <button
          onClick={() => fetchData()}
          className="mt-2 flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-4 py-2 font-mono text-xs text-violet-400 transition-colors hover:bg-violet-500/20"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Connection Status ---- */}
      {token && <ConnectionStatus token={token} />}

      {/* ---- Stats Bar ---- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "TOTAL AGENTS",
            value: totalAgents,
            icon: Bot,
            accent: "text-violet-400",
          },
          {
            label: "ACTIVE",
            value: activeAgents,
            icon: Zap,
            accent: "text-emerald-400",
          },
          {
            label: "TASKS DONE",
            value: totalTasks,
            icon: Activity,
            accent: "text-cyan-400",
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-white/[0.06] bg-[#0c0c0d] p-3"
          >
            <div className="flex items-center gap-2">
              <stat.icon className={cn("h-3.5 w-3.5", stat.accent)} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                {stat.label}
              </span>
            </div>
            <p
              className={cn(
                "mt-1.5 font-mono text-2xl font-bold tabular-nums",
                stat.accent
              )}
            >
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* ---- Command Prompt ---- */}
      {token && <CommandPrompt token={token} />}

      {/* ---- Live Sessions from OpenClaw ---- */}
      {token && <LiveSessions token={token} />}

      {/* ---- Live indicator + Create Agent button ---- */}
      <div className="flex items-center gap-2">
        <div className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-violet-500/70">
          Live — Polling every {agents.some((a) => a.status === "active") ? "2s" : "5s"}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 font-mono text-[10px] font-bold text-violet-400 transition-all hover:bg-violet-500/20"
        >
          <Plus className="h-3 w-3" />
          CREATE AGENT
        </button>
      </div>

      {/* ---- Agent Grid ---- */}
      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-white/[0.06] bg-[#0c0c0d] py-16">
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4">
            <Bot className="h-8 w-8 text-violet-400" />
          </div>
          <div className="text-center">
            <p className="font-mono text-sm font-bold text-zinc-300">No agents yet</p>
            <p className="mt-1.5 max-w-md text-center font-mono text-xs text-zinc-600">
              Agents are AI workers that execute tasks from your boards. Create one to get started.
            </p>
          </div>

          {/* Mini workflow hint */}
          <div className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10">
                <span className="font-mono text-[9px] font-bold text-violet-400">1</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-400">Create Agent</span>
            </div>
            <ChevronDown className="h-3 w-3 -rotate-90 text-zinc-700" />
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 bg-white/[0.02]">
                <span className="font-mono text-[9px] font-bold text-zinc-600">2</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-600">Assign to Task</span>
            </div>
            <ChevronDown className="h-3 w-3 -rotate-90 text-zinc-700" />
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 bg-white/[0.02]">
                <span className="font-mono text-[9px] font-bold text-zinc-600">3</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-600">Dispatch</span>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/10 px-4 py-2 font-mono text-xs font-bold text-violet-400 transition-all hover:bg-violet-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            CREATE YOUR FIRST AGENT
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-violet-500/20 to-transparent" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-violet-500/50">
              Agent Registry
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-violet-500/20 to-transparent" />
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {agents.map((agent) => {
              const status = statusConfig[agent.status];
              return (
                <motion.div
                  key={agent.id}
                  variants={itemVariants}
                  onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                  className="group cursor-pointer rounded-lg border border-white/[0.06] bg-[#0c0c0d] transition-all hover:border-violet-500/15 hover:shadow-[0_0_20px_rgba(139,92,246,0.04)]"
                >
                  {/* Top glow line */}
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
                          <Bot className="h-4 w-4 text-violet-400" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-bold tracking-tight text-zinc-200">
                            {agent.name}
                          </p>
                          {agent.role ? (
                            <p className="mt-0.5 font-mono text-[10px] text-violet-400/70">
                              {agent.role}
                            </p>
                          ) : (
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-zinc-700" />
                              <span className="font-mono text-[10px] text-zinc-600">
                                {relativeTime(agent.last_active)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-2 py-0.5",
                          status.bg
                        )}
                      >
                        <span className="relative flex h-1.5 w-1.5">
                          {agent.status === "active" && (
                            <span
                              className={cn(
                                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-50",
                                status.dot
                              )}
                            />
                          )}
                          <span
                            className={cn(
                              "relative inline-flex h-1.5 w-1.5 rounded-full",
                              status.dot
                            )}
                          />
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[10px] font-bold tracking-wider",
                            status.text
                          )}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="mt-3 flex items-center gap-4 rounded-md border border-white/[0.04] bg-white/[0.01] px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-3 w-3 text-zinc-600" />
                        <span className="font-mono text-[10px] tabular-nums text-zinc-500">
                          {agent.tasks_completed} tasks
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-zinc-600" />
                        <span className="font-mono text-[10px] text-zinc-500">
                          {relativeTime(agent.last_active)}
                        </span>
                      </div>
                      <ExternalLink className="ml-auto h-3 w-3 text-zinc-700 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>

                    {/* Session ID if available */}
                    {agent.openclaw_session_id ? (
                      <div className="mt-2 flex items-center gap-1.5">
                        <Wifi className="h-3 w-3 text-violet-500/50" />
                        <span className="font-mono text-[9px] text-zinc-700 truncate">
                          Session: {agent.openclaw_session_id.slice(0, 16)}...
                        </span>
                      </div>
                    ) : agent.status === "pending" ? (
                      <p className="mt-2 font-mono text-[10px] leading-relaxed text-amber-500/60">
                        Assign this agent to a task on a board, then dispatch to connect.
                      </p>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}

      {/* ---- Create Agent Modal ---- */}
      <AnimatePresence>
        {showCreateModal && token && (
          <CreateAgentModal
            token={token}
            onClose={() => setShowCreateModal(false)}
            onCreated={() => fetchData(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
