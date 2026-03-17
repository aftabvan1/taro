"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronRight,
  ExternalLink,
  LogOut,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { instanceStatusConfig } from "@/lib/status-config";
import { Sidebar } from "@/components/dashboard/sidebar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Instance {
  id: string;
  userId: string;
  name: string;
  status: "provisioning" | "running" | "stopped" | "error";
  region: string;
  serverIp: string | null;
  openclawPort: number | null;
  ttydPort: number | null;
  mcPort: number | null;
  hetznerServerId?: string | null;
  containerName: string | null;
  mcAuthToken: string | null;
  terminalToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardContextType {
  instance: Instance | null;
  instances: Instance[];
  loading: boolean;
  token: string | null;
  hasSubscription: boolean;
  refreshInstances: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const DashboardContext = createContext<DashboardContextType>({
  instance: null,
  instances: [],
  loading: true,
  token: null,
  hasSubscription: false,
  refreshInstances: async () => {},
});

export { DashboardContext };

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within the dashboard layout");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const routeLabels: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/terminal": "Terminal",
  "/dashboard/monitoring": "Monitoring",
  "/dashboard/backups": "Backups",
  "/dashboard/integrations": "Integrations",
  "/dashboard/settings": "Settings",
  "/dashboard/billing": "Billing",
  "/dashboard/web-chat": "Web Chat",
  "/dashboard/agents": "Agents",
  "/dashboard/boards": "Boards",
  "/dashboard/activity": "Activity Feed",
};

function getPageLabel(pathname: string): string {
  if (routeLabels[pathname]) return routeLabels[pathname];
  const match = Object.keys(routeLabels).find(
    (key) => key !== "/dashboard" && pathname.startsWith(key)
  );
  return match ? routeLabels[match] : "Dashboard";
}

const statusConfig = instanceStatusConfig;

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="flex h-screen w-full bg-[#0a0a0b]">
      <div className="hidden w-60 shrink-0 border-r border-emerald-500/10 lg:block">
        <div className="flex h-14 items-center border-b border-emerald-500/10 px-4">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-white/[0.06]" />
        </div>
        <div className="mt-4 space-y-2 px-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-8 animate-pulse rounded-lg bg-white/[0.03]"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex h-12 items-center border-b border-emerald-500/10 px-6">
          <div className="h-4 w-32 animate-pulse rounded bg-white/[0.06]" />
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.02]"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);

  const fetchInstances = useCallback(async (jwt: string) => {
    try {
      const res = await fetch("/api/instances", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          setToken(null);
          return;
        }
        return;
      }
      const data = await res.json();
      // API returns {data: Instance[]}
      const list: Instance[] = Array.isArray(data.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : Array.isArray(data.instances)
            ? data.instances
            : [];
      setInstances(list);
    } catch {
      // network error — keep previous state
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshInstances = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    await fetchInstances(token);
  }, [token, fetchInstances]);

  // Auth check on mount
  useEffect(() => {
    const jwt = localStorage.getItem("token");
    if (!jwt) {
      router.replace("/");
      return;
    }
    setToken(jwt);
    setAuthChecked(true);
    fetchInstances(jwt);

    // Fetch subscription status
    fetch("/api/billing", { headers: { Authorization: `Bearer ${jwt}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.hasSubscription) setHasSubscription(true);
      })
      .catch(() => {});

    // Try to get user email from token payload
    try {
      const payload = JSON.parse(atob(jwt.split(".")[1]));
      if (payload.email) setUserEmail(payload.email);
    } catch {
      // ignore
    }
  }, [fetchInstances, router]);

  // Token refresh: refresh JWT 5 minutes before expiry
  useEffect(() => {
    if (!token) return;

    const scheduleRefresh = () => {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const expiresAt = (payload.exp ?? 0) * 1000;
        const refreshIn = expiresAt - Date.now() - 5 * 60 * 1000; // 5 min before expiry

        if (refreshIn <= 0) {
          // Token already near expiry, refresh now
          doRefresh();
          return;
        }

        const timer = setTimeout(doRefresh, refreshIn);
        return () => clearTimeout(timer);
      } catch {
        // invalid token, ignore
      }
    };

    const doRefresh = async () => {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) return;

      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.token) {
            localStorage.setItem("token", data.data.token);
            setToken(data.data.token);
          }
          if (data.data?.refreshToken) {
            localStorage.setItem("refreshToken", data.data.refreshToken);
          }
        } else {
          // Refresh failed — force re-login
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          router.replace("/");
        }
      } catch {
        // Network error, will retry on next schedule
      }
    };

    const cleanup = scheduleRefresh();
    return cleanup;
  }, [token, router]);

  // Re-fetch subscription status on visibility change (returning from Stripe)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && token) {
        fetch("/api/billing", { headers: { Authorization: `Bearer ${token}` } })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.data?.hasSubscription) setHasSubscription(true);
          })
          .catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [token]);

  const instance = instances[0] ?? null;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    router.replace("/");
  };

  if (!authChecked) {
    return <DashboardSkeleton />;
  }

  if (!token) {
    return null; // redirecting
  }

  const pageLabel = getPageLabel(pathname);
  const status = instance?.status ?? "stopped";
  const sc = statusConfig[status];
  const avatarLetter = userEmail ? userEmail[0].toUpperCase() : "U";

  return (
    <DashboardContext.Provider
      value={{ instance, instances, loading, token, hasSubscription, refreshInstances }}
    >
      <div className="flex h-screen overflow-hidden bg-[#0a0a0b]">
        <Sidebar
          instanceStatus={instance?.status}
          instanceName={instance?.name}
          instance={instance}
        />

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-emerald-500/10 px-4 lg:px-6">
            {/* Left: breadcrumb */}
            <div className="flex items-center gap-1.5 pl-12 lg:pl-0">
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-600">
                sys
              </span>
              <ChevronRight className="h-3 w-3 text-zinc-700" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                {pageLabel}
              </span>
            </div>

            {/* Right: instance info + actions */}
            <div className="flex items-center gap-3">
              {/* Instance status badge */}
              {instance && (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2.5 py-1",
                    sc.bg,
                    sc.glow
                  )}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    {(status === "running" || status === "provisioning") && (
                      <span
                        className={cn(
                          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-50",
                          sc.dot
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "relative inline-flex h-1.5 w-1.5 rounded-full",
                        sc.dot
                      )}
                    />
                  </span>
                  <span
                    className={cn("font-mono text-[10px] font-bold tracking-wider", sc.text)}
                  >
                    {instance.name}
                  </span>
                  <span className={cn("font-mono text-[10px]", sc.text)}>
                    [{sc.label}]
                  </span>
                </div>
              )}

              {/* Open OpenClaw web chat quick button */}
              {instance?.name && instance?.serverIp && (
                <a
                  href={`https://${instance.name}.${process.env.NEXT_PUBLIC_INSTANCE_DOMAIN || "instances.taroagent.com"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-emerald-400 transition-colors hover:bg-emerald-500/20"
                >
                  <Zap className="h-3 w-3" />
                  WEB CHAT
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}

              {/* User avatar */}
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 font-mono text-[11px] font-bold text-emerald-400">
                {avatarLetter}
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-600 transition-colors hover:text-red-400"
                title="Logout"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          {/* Scanline decoration */}
          <div className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="p-4 lg:p-6"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
