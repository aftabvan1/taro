"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Terminal,
  Bot,
  Kanban,
  Activity,
  HardDrive,
  Settings,
  CreditCard,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";

interface SidebarProps {
  instanceStatus?: "running" | "provisioning" | "stopped" | "error";
  instanceName?: string;
}

const navItems = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Terminal", icon: Terminal, href: "/dashboard/terminal" },
  { label: "Agents", icon: Bot, href: "/dashboard/agents" },
  { label: "Boards", icon: Kanban, href: "/dashboard/boards" },
  { label: "Monitoring", icon: Activity, href: "/dashboard/monitoring" },
  { label: "Backups", icon: HardDrive, href: "/dashboard/backups" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
  { label: "Billing", icon: CreditCard, href: "/dashboard/billing" },
] as const;

const statusConfig = {
  running: { color: "bg-emerald-500", ring: "ring-emerald-500/30", label: "Running" },
  provisioning: { color: "bg-amber-500", ring: "ring-amber-500/30", label: "Provisioning" },
  stopped: { color: "bg-zinc-500", ring: "ring-zinc-500/30", label: "Stopped" },
  error: { color: "bg-red-500", ring: "ring-red-500/30", label: "Error" },
};

function StatusDot({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status];
  return (
    <span className="relative flex h-2.5 w-2.5">
      {(status === "running" || status === "provisioning") && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-40",
            config.color
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex h-2.5 w-2.5 rounded-full ring-2",
          config.color,
          config.ring
        )}
      />
    </span>
  );
}

export function Sidebar({ instanceStatus = "stopped", instanceName }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-white/[0.06] px-4",
          collapsed && "justify-center px-0"
        )}
      >
        {collapsed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </div>
        ) : (
          <Logo size="sm" />
        )}
      </div>

      {/* Instance indicator */}
      {instanceName && (
        <div
          className={cn(
            "mx-3 mt-4 flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5",
            collapsed && "mx-2 justify-center px-0 py-2.5"
          )}
        >
          <StatusDot status={instanceStatus} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground/90">
                {instanceName}
              </p>
              <p className="text-[10px] text-muted">
                {statusConfig[instanceStatus].label}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="mt-4 flex-1 space-y-0.5 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="group relative block"
            >
              <motion.div
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "text-foreground"
                    : "text-muted hover:text-foreground/80"
                )}
                whileHover={{ x: collapsed ? 0 : 2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                {/* Active indicator bar */}
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl border border-white/[0.08] bg-white/[0.05]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                {active && (
                  <motion.div
                    layoutId="sidebar-brand-bar"
                    className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-brand"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}

                <item.icon
                  className={cn(
                    "relative z-10 h-[18px] w-[18px] shrink-0",
                    active ? "text-brand" : "text-muted group-hover:text-foreground/70"
                  )}
                />
                {!collapsed && (
                  <span className="relative z-10">{item.label}</span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="shrink-0 border-t border-white/[0.06] p-3">
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted transition-colors hover:bg-white/[0.04] hover:text-foreground/80",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-background/80 backdrop-blur-sm lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-white/[0.06] bg-background lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-foreground"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="sticky top-0 hidden h-screen shrink-0 border-r border-white/[0.06] bg-background lg:block"
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}
