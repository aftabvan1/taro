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
  ExternalLink,
  RefreshCw,
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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TerminalPage() {
  const { instance, loading, token, refreshInstances } = useDashboard();

  const [connected, setConnected] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [reprovisioning, setReprovisioning] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  const handleReprovision = useCallback(async () => {
    if (!instance || reprovisioning) return;
    setReprovisioning(true);
    retryCountRef.current = 0;
    setDisconnected(false);
    try {
      const res = await fetch(`/api/instances/${instance.id}/reprovision`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        // Wait for containers + Caddy to restart, then reload everything
        setTimeout(async () => {
          setConnected(false);
          setIframeKey((k) => k + 1);
          // Refresh instance data so sidebar/web-chat links stay valid
          await refreshInstances();
          setReprovisioning(false);
        }, 10000);
      } else {
        setReprovisioning(false);
      }
    } catch {
      setReprovisioning(false);
    }
  }, [instance, token, reprovisioning, refreshInstances]);

  const hasTerminal =
    instance?.serverIp != null && instance?.ttydPort != null;

  const instanceDomain = process.env.NEXT_PUBLIC_INSTANCE_DOMAIN || "instances.taroagent.com";
  const ttydHost = hasTerminal
    ? `ttyd-${instance.name}.${instanceDomain}`
    : null;

  // Terminal token is fetched with the instance data and passed as a query param for auth
  const terminalToken = instance?.terminalToken;
  const terminalUrl = ttydHost
    ? `https://${ttydHost}${terminalToken ? `?token=${terminalToken}` : ""}`
    : null;

  /* ---- Uptime counter ---- */
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => setUptime((u) => u + 1), 1000);
    return () => {
      clearInterval(interval);
      setUptime(0);
    };
  }, [connected]);

  /* ---- Health-check polling with auto-reconnect ---- */
  useEffect(() => {
    if (!connected || !terminalUrl) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        await fetch(terminalUrl, { mode: "no-cors", cache: "no-store" });
        // Reachable — if we were disconnected, recover
        if (disconnected) {
          setDisconnected(false);
          retryCountRef.current = 0;
        }
      } catch {
        // Unreachable — mark disconnected and auto-reload iframe
        if (!cancelled) {
          retryCountRef.current += 1;
          setDisconnected(true);
          if (retryCountRef.current <= maxRetries) {
            setIframeKey((k) => k + 1);
          }
        }
      }
      if (!cancelled) {
        const delay =
          retryCountRef.current > 0
            ? Math.min(8000 * Math.pow(2, retryCountRef.current - 1), 30000)
            : 8000;
        timeoutId = setTimeout(poll, delay);
      }
    };

    // Start polling after initial 8s delay
    timeoutId = setTimeout(poll, 8000);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [connected, terminalUrl, disconnected]);

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
      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0a0a0b] px-4 py-2.5">
        <div className="flex items-center gap-4">
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
            {disconnected ? (
              <WifiOff className="h-3.5 w-3.5 text-amber-400" />
            ) : connected ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-zinc-500" />
            )}
            <span
              className={cn(
                "font-mono text-xs",
                disconnected
                  ? "text-amber-400"
                  : connected
                    ? "text-emerald-400"
                    : "text-zinc-500",
              )}
            >
              {disconnected
                ? "RECONNECTING..."
                : connected
                  ? "CONNECTED"
                  : "CONNECTING..."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Uptime readout */}
          {connected && (
            <span className="font-mono text-xs text-zinc-500">
              UPTIME {formatUptime(uptime)}
            </span>
          )}

          {/* Target */}
          <span className="hidden font-mono text-xs text-zinc-600 sm:inline">
            {ttydHost}
          </span>

          {/* Reprovision */}
          <button
            onClick={handleReprovision}
            disabled={reprovisioning}
            className="rounded-md border border-white/[0.06] p-1.5 transition-colors hover:border-amber-500/30 hover:bg-amber-500/5 disabled:opacity-50"
            title="Reprovision terminal"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 text-zinc-400",
                reprovisioning && "animate-spin text-amber-400",
              )}
            />
          </button>

          {/* Open in new tab */}
          <a
            href={terminalUrl ?? ""}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-white/[0.06] p-1.5 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5"
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4 text-zinc-400" />
          </a>

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
        <iframe
          key={iframeKey}
          src={terminalUrl ?? ""}
          title="Terminal"
          className="h-full w-full border-0 bg-[#0a0a0b]"
          onLoad={() => {
            setConnected(true);
            setDisconnected(false);
            retryCountRef.current = 0;
          }}
          onError={() => setConnected(false)}
          allow="clipboard-read; clipboard-write"
        />

        {/* Reconnecting overlay */}
        {disconnected && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm">
            {retryCountRef.current > maxRetries ? (
              <>
                <WifiOff className="h-8 w-8 text-red-400" />
                <p className="font-mono text-sm text-red-400">
                  Unable to reconnect
                </p>
                <button
                  onClick={handleReprovision}
                  disabled={reprovisioning}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 font-mono text-xs text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {reprovisioning ? "Reprovisioning..." : "Reprovision Terminal"}
                </button>
              </>
            ) : (
              <>
                <RefreshCw className="h-6 w-6 animate-spin text-amber-400" />
                <p className="font-mono text-sm text-zinc-300">
                  Connection lost. Reconnecting...
                </p>
                <p className="font-mono text-xs text-zinc-500">
                  Attempt {retryCountRef.current} of {maxRetries}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
