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
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
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
  hetznerServerId: string | null;
  containerName: string | null;
  mcAuthToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardContextType {
  instance: Instance | null;
  instances: Instance[];
  loading: boolean;
  token: string | null;
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
  refreshInstances: async () => {},
});

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
  "/dashboard/agents": "Agents",
  "/dashboard/boards": "Boards",
  "/dashboard/monitoring": "Monitoring",
  "/dashboard/backups": "Backups",
  "/dashboard/settings": "Settings",
  "/dashboard/billing": "Billing",
};

function getPageLabel(pathname: string): string {
  if (routeLabels[pathname]) return routeLabels[pathname];
  const match = Object.keys(routeLabels).find(
    (key) => key !== "/dashboard" && pathname.startsWith(key)
  );
  return match ? routeLabels[match] : "Dashboard";
}

const statusConfig = {
  running: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    label: "Running",
  },
  provisioning: {
    dot: "bg-amber-500",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    label: "Provisioning",
  },
  stopped: {
    dot: "bg-zinc-500",
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    label: "Stopped",
  },
  error: {
    dot: "bg-red-500",
    bg: "bg-red-500/10",
    text: "text-red-400",
    label: "Error",
  },
};

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="flex h-screen w-full">
      {/* Sidebar skeleton */}
      <div className="hidden w-64 shrink-0 border-r border-white/[0.06] lg:block">
        <div className="flex h-16 items-center border-b border-white/[0.06] px-4">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-white/[0.06]" />
        </div>
        <div className="mt-4 space-y-2 px-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-xl bg-white/[0.04]"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      </div>
      {/* Content skeleton */}
      <div className="flex-1">
        <div className="flex h-14 items-center border-b border-white/[0.06] px-6">
          <div className="h-4 w-32 animate-pulse rounded bg-white/[0.06]" />
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
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
      const list: Instance[] = Array.isArray(data)
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
  }, [fetchInstances, router]);

  const instance = instances[0] ?? null;

  if (!authChecked) {
    return <DashboardSkeleton />;
  }

  if (!token) {
    return null; // redirecting
  }

  const pageLabel = getPageLabel(pathname);
  const status = instance?.status ?? "stopped";
  const sc = statusConfig[status];

  return (
    <DashboardContext.Provider
      value={{ instance, instances, loading, token, refreshInstances }}
    >
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          instanceStatus={instance?.status}
          instanceName={instance?.name}
        />

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-4 lg:px-6">
            {/* Left: breadcrumb (offset on mobile to avoid hamburger) */}
            <div className="flex items-center gap-1.5 pl-12 text-sm lg:pl-0">
              <span className="text-muted">Dashboard</span>
              {pageLabel !== "Overview" && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted/50" />
                  <span className="font-medium text-foreground">
                    {pageLabel}
                  </span>
                </>
              )}
              {pageLabel === "Overview" && (
                <span className="font-medium text-foreground">
                  <ChevronRight className="mr-1.5 inline h-3.5 w-3.5 text-muted/50" />
                  Overview
                </span>
              )}
            </div>

            {/* Right: status + avatar */}
            <div className="flex items-center gap-3">
              {/* Instance status badge */}
              {instance && (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-full px-2.5 py-1",
                    sc.bg
                  )}
                >
                  <span
                    className={cn("inline-block h-1.5 w-1.5 rounded-full", sc.dot)}
                  />
                  <span className={cn("text-xs font-medium", sc.text)}>
                    {sc.label}
                  </span>
                </div>
              )}

              {/* User avatar placeholder */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xs font-medium text-muted">
                U
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
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
