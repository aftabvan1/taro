"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Terminal,
  Maximize2,
  Minimize2,
  Circle,
  MonitorOff,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "../layout";

/* ------------------------------------------------------------------ */
/*  ASCII art for placeholder                                          */
/* ------------------------------------------------------------------ */

const TERMINAL_ASCII = `
  ╔══════════════════════════════════════╗
  ║  ┌──────────────────────────────┐   ║
  ║  │  $ _                         │   ║
  ║  │                              │   ║
  ║  │  No active session.          │   ║
  ║  │  Awaiting instance...        │   ║
  ║  │                              │   ║
  ║  └──────────────────────────────┘   ║
  ╚══════════════════════════════════════╝
`;

/* ------------------------------------------------------------------ */
/*  Scanline overlay                                                   */
/* ------------------------------------------------------------------ */

function ScanlineOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 opacity-[0.03]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.15) 2px, rgba(16,185,129,0.15) 4px)",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TerminalPage() {
  const { instance, loading } = useDashboard();

  const [connected, setConnected] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [uptime, setUptime] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasTerminal =
    instance?.serverIp != null && instance?.ttydPort != null;

  const terminalUrl = hasTerminal
    ? `http://${instance.serverIp}:${instance.ttydPort}`
    : null;

  /* ---- Uptime counter ---- */
  useEffect(() => {
    if (!connected) {
      setUptime(0);
      return;
    }
    const interval = setInterval(() => setUptime((u) => u + 1), 1000);
    return () => clearInterval(interval);
  }, [connected]);

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  /* ---- Fullscreen toggle ---- */
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  }, []);

  /* ---- Listen for fullscreen exit ---- */
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ---- Loading skeleton ---- */
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
        <div className="h-12 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]" />
        <div className="flex-1 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
      </div>
    );
  }

  /* ---- No terminal available ---- */
  if (!hasTerminal) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center gap-6"
      >
        <div className="relative rounded-2xl border border-white/[0.06] bg-[#0a0a0b] p-8">
          <ScanlineOverlay />
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
              <MonitorOff className="h-5 w-5 text-emerald-500/60" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Terminal Not Provisioned</h2>
              <p className="text-xs text-zinc-500">SESSION_STATUS: OFFLINE</p>
            </div>
          </div>
          <pre className="font-mono text-xs leading-relaxed text-emerald-500/40">
            {TERMINAL_ASCII}
          </pre>
          <p className="mt-4 max-w-sm text-center text-sm text-zinc-500">
            {!instance
              ? "No instance selected. Create or select an instance to access the terminal."
              : "Waiting for instance provisioning to complete. The terminal will be available once the instance is running."}
          </p>
        </div>
      </motion.div>
    );
  }

  /* ---- Terminal view ---- */
  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col gap-3",
        fullscreen ? "h-screen bg-[#0a0a0b] p-3" : "h-[calc(100vh-8rem)]",
      )}
    >
      {/* Toolbar */}
      <div className="relative flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0a0a0b] px-4 py-2.5">
        <ScanlineOverlay />
        <div className="z-20 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold">Terminal</span>
          </div>

          {/* Instance badge */}
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1">
            <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" />
            <span className="font-mono text-xs text-emerald-400">
              {instance.name}
            </span>
          </div>

          {/* Connection indicator */}
          <div className="flex items-center gap-2">
            {connected ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-zinc-500" />
            )}
            <span
              className={cn(
                "font-mono text-xs",
                connected ? "text-emerald-400" : "text-zinc-500",
              )}
            >
              {connected ? "CONNECTED" : "CONNECTING..."}
            </span>
          </div>
        </div>

        <div className="z-20 flex items-center gap-4">
          {/* Uptime readout */}
          {connected && (
            <span className="font-mono text-xs text-zinc-500">
              UPTIME {formatUptime(uptime)}
            </span>
          )}

          {/* Target IP */}
          <span className="hidden font-mono text-xs text-zinc-600 sm:inline">
            {instance.serverIp}:{instance.ttydPort}
          </span>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="rounded-md border border-white/[0.06] p-1.5 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5"
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {fullscreen ? (
              <Minimize2 className="h-4 w-4 text-zinc-400" />
            ) : (
              <Maximize2 className="h-4 w-4 text-zinc-400" />
            )}
          </button>
        </div>
      </div>

      {/* Iframe container */}
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/[0.06]">
        <ScanlineOverlay />
        <iframe
          src={terminalUrl!}
          title="Terminal"
          className="relative z-0 h-full w-full border-0 bg-[#0a0a0b]"
          onLoad={() => setConnected(true)}
          onError={() => setConnected(false)}
          allow="clipboard-read; clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </motion.div>
  );
}
