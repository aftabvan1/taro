"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  token: string;
  onPushSync?: () => void;
  pushSyncing?: boolean;
  compact?: boolean;
}

export function ConnectionStatus({
  token,
  onPushSync,
  pushSyncing,
  compact,
}: ConnectionStatusProps) {
  const [status, setStatus] = useState<{
    connected: boolean;
    data: Record<string, unknown> | null;
  }>({ connected: false, data: null });
  const [loading, setLoading] = useState(true);

  const fetchingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const res = await fetch("/api/mission-control/agent/status", {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(8000),
        });
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            setStatus({ connected: true, data });
          } else {
            setStatus({ connected: false, data: null });
          }
        }
      } catch {
        if (!cancelled) setStatus({ connected: false, data: null });
      } finally {
        fetchingRef.current = false;
        if (!cancelled) setLoading(false);
      }
    };

    check();
    const interval = setInterval(check, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c0c0d]",
          compact ? "px-2 py-1.5" : "px-3 py-2"
        )}
      >
        <Loader2
          className={cn(
            "animate-spin text-zinc-500",
            compact ? "h-3 w-3" : "h-3.5 w-3.5"
          )}
        />
        <span
          className={cn(
            "font-mono text-zinc-500",
            compact ? "text-[9px]" : "text-[10px]"
          )}
        >
          Checking OpenClaw...
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border",
        compact ? "px-2 py-1.5" : "px-3 py-2",
        status.connected
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-red-500/20 bg-red-500/5"
      )}
    >
      {status.connected ? (
        <Wifi
          className={cn(
            "text-emerald-400",
            compact ? "h-3 w-3" : "h-3.5 w-3.5"
          )}
        />
      ) : (
        <WifiOff
          className={cn(
            "text-red-400",
            compact ? "h-3 w-3" : "h-3.5 w-3.5"
          )}
        />
      )}
      <span
        className={cn(
          "font-mono font-bold tracking-wider",
          compact ? "text-[9px]" : "text-[10px]",
          status.connected ? "text-emerald-400" : "text-red-400"
        )}
      >
        {status.connected ? "OPENCLAW CONNECTED" : "OPENCLAW UNREACHABLE"}
      </span>
      {status.connected && status.data?.version ? (
        <span
          className={cn(
            "font-mono text-emerald-500/50",
            compact ? "text-[9px]" : "text-[10px]"
          )}
        >
          v{String(status.data.version)}
        </span>
      ) : null}

      {/* Push sync button when unreachable */}
      {!status.connected && onPushSync && (
        <button
          onClick={onPushSync}
          disabled={pushSyncing}
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 font-mono font-bold tracking-wider text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-40",
            compact
              ? "px-2 py-1 text-[9px]"
              : "px-2.5 py-1.5 text-[10px]"
          )}
        >
          {pushSyncing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Upload className="h-3 w-3" />
          )}
          PUSH SYNC
        </button>
      )}
    </div>
  );
}
