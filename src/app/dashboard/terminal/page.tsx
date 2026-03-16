"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Terminal,
  Maximize2,
  Minimize2,
  Circle,
  MonitorOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "../layout";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TerminalPage() {
  const { instance, loading } = useDashboard();

  const [connected, setConnected] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasTerminal =
    instance?.serverIp != null && instance?.ttydPort != null;

  const terminalUrl = hasTerminal
    ? `http://${instance.serverIp}:${instance.ttydPort}`
    : null;

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

  /* ---- Loading skeleton ---- */
  if (loading) {
    return (
      <div className="flex h-full flex-col gap-4">
        <div className="h-12 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="flex-1 animate-pulse rounded-2xl bg-white/[0.06]" />
      </div>
    );
  }

  /* ---- No terminal available ---- */
  if (!hasTerminal) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex h-full flex-col items-center justify-center gap-6"
      >
        <div className="rounded-full border border-white/10 bg-white/[0.03] p-6">
          <MonitorOff className="h-10 w-10 text-muted" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            Instance not provisioned
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted">
            {!instance
              ? "No instance selected. Create or select an instance to access the terminal."
              : "The terminal is not available yet. Wait for the instance to finish provisioning."}
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
      className="flex h-full flex-col gap-3"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Terminal className="h-4 w-4 text-brand" />
          <span className="text-sm font-medium">Terminal</span>
          <span className="font-mono text-xs text-muted">
            {instance.name}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            <Circle
              className={cn(
                "h-2 w-2 fill-current",
                connected ? "text-emerald-400" : "text-zinc-500",
              )}
            />
            <span className="text-xs text-muted">
              {connected ? "Connected" : "Connecting..."}
            </span>
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="rounded-md p-1.5 transition-colors hover:bg-white/[0.08]"
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {fullscreen ? (
              <Minimize2 className="h-4 w-4 text-muted" />
            ) : (
              <Maximize2 className="h-4 w-4 text-muted" />
            )}
          </button>
        </div>
      </div>

      {/* Iframe */}
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10">
        <iframe
          src={terminalUrl!}
          title="Terminal"
          className="h-full w-full border-0 bg-black"
          onLoad={() => setConnected(true)}
          onError={() => setConnected(false)}
          allow="clipboard-read; clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </motion.div>
  );
}
