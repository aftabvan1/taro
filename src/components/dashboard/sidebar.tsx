"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Terminal,
  Bot,
  LayoutGrid,
  Radio,
  HardDrive,
  Settings,
  CreditCard,
  Plug,
  MessageCircle,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import type { Instance } from "@/app/dashboard/layout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidebarProps {
  instanceStatus?: "running" | "provisioning" | "stopped" | "error";
  instanceName?: string;
  instance?: Instance | null;
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const statusConfig = {
  running: {
    color: "bg-violet-500",
    ring: "ring-violet-500/30",
    text: "text-violet-400",
    label: "ONLINE",
  },
  provisioning: {
    color: "bg-amber-500",
    ring: "ring-amber-500/30",
    text: "text-amber-400",
    label: "BOOTING",
  },
  stopped: {
    color: "bg-zinc-600",
    ring: "ring-zinc-500/30",
    text: "text-zinc-500",
    label: "OFFLINE",
  },
  error: {
    color: "bg-red-500",
    ring: "ring-red-500/30",
    text: "text-red-400",
    label: "FAULT",
  },
};

// ---------------------------------------------------------------------------
// Status indicator with scanline pulse
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status];
  return (
    <span className="relative flex h-2 w-2">
      {(status === "running" || status === "provisioning") && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-50",
            config.color
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex h-2 w-2 rounded-full ring-2",
          config.color,
          config.ring
        )}
      />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Navigation items builder
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  externalHref?: string;
  isExternal?: boolean;
  section: string;
  disabled?: boolean;
}

function buildNavItems(instance?: Instance | null): NavItem[] {
  const instanceDomain = process.env.NEXT_PUBLIC_INSTANCE_DOMAIN || "instances.taro.sh";
  const webChatUrl = instance?.name
    ? `https://${instance.name}.${instanceDomain}`
    : undefined;

  return [
    // MISSION CONTROL
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", section: "Mission Control" },
    { label: "Agents", icon: Bot, href: "/dashboard/agents", section: "Mission Control" },
    { label: "Boards", icon: LayoutGrid, href: "/dashboard/boards", section: "Mission Control" },
    { label: "Live Feed", icon: Radio, href: "/dashboard/live-feed", section: "Mission Control" },

    // TOOLS
    { label: "Web Chat", icon: MessageCircle, externalHref: webChatUrl, isExternal: true, section: "Tools" },
    { label: "Terminal", icon: Terminal, href: "/dashboard/terminal", section: "Tools" },
    { label: "Integrations", icon: Plug, href: "/dashboard/integrations", section: "Tools" },

    // SYSTEM
    { label: "Backups", icon: HardDrive, href: "/dashboard/backups", section: "System" },
    { label: "Settings", icon: Settings, href: "/dashboard/settings", section: "System" },
    { label: "Billing", icon: CreditCard, href: "/dashboard/billing", section: "System" },
  ];
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function Sidebar({
  instanceStatus = "stopped",
  instanceName,
  instance,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = buildNavItems(instance);

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const sc = statusConfig[instanceStatus];

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* ---- Logo ---- */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-violet-500/10 px-4",
          collapsed && "justify-center px-0"
        )}
      >
        {collapsed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
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

      {/* ---- Navigation ---- */}
      <nav className="mt-3 flex-1 space-y-0.5 px-2 overflow-y-auto">
        {navItems.map((item, idx) => {
          const showSection = idx === 0 || navItems[idx - 1]?.section !== item.section;
          const active = isActive(item.href);
          const disabled = item.disabled || (item.isExternal && !item.externalHref);

          const content = (
            <motion.div
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "text-violet-400"
                  : disabled
                    ? "cursor-not-allowed text-white/20"
                    : "text-zinc-500 hover:text-zinc-300"
              )}
              whileHover={!collapsed && !disabled ? { x: 2 } : undefined}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {/* Active glow bar */}
              {active && (
                <motion.div
                  layoutId="sidebar-active-bar"
                  className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              {active && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 rounded-lg border border-violet-500/10 bg-violet-500/[0.06]"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}

              <item.icon
                className={cn(
                  "relative z-10 h-4 w-4 shrink-0",
                  active
                    ? "text-violet-400"
                    : disabled
                      ? "text-white/20"
                      : "text-zinc-600 group-hover:text-zinc-400"
                )}
              />
              {!collapsed && (
                <span className="relative z-10 flex-1 truncate font-mono text-xs">
                  {item.label}
                </span>
              )}
              {!collapsed && item.isExternal && !disabled && (
                <ExternalLink className="relative z-10 h-3 w-3 text-zinc-600" />
              )}
            </motion.div>
          );

          const sectionHeader = showSection && !collapsed ? (
            <p className={cn(
              "mb-2 px-3 font-mono text-[10px] uppercase tracking-widest text-violet-500/50",
              idx !== 0 && "mt-4"
            )}>
              {item.section}
            </p>
          ) : null;

          if ((disabled && !item.isExternal) || (!item.href && !item.isExternal)) {
            return (
              <React.Fragment key={item.label}>
                {sectionHeader}
                <div
                  className="group relative block"
                  aria-disabled
                >
                  {content}
                </div>
              </React.Fragment>
            );
          }

          if (item.isExternal) {
            return (
              <React.Fragment key={item.label}>
                {sectionHeader}
                <a
                  href={item.externalHref ?? "#"}
                  target={item.externalHref ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (disabled) e.preventDefault();
                    setMobileOpen(false);
                  }}
                  className="group relative block"
                  aria-disabled={disabled}
                >
                  {content}
                </a>
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={item.label}>
              {sectionHeader}
              <Link
                href={item.href!}
                onClick={() => setMobileOpen(false)}
                className="group relative block"
              >
                {content}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      {/* ---- Instance status panel ---- */}
      {instanceName && (
        <div
          className={cn(
            "mx-2 mb-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3",
            collapsed && "mx-1 p-2"
          )}
        >
          <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
            <StatusDot status={instanceStatus} />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] font-medium text-zinc-300">
                  {instanceName}
                </p>
                <p className={cn("font-mono text-[10px] tracking-wide", sc.text)}>
                  {sc.label}
                </p>
              </div>
            )}
          </div>
          {!collapsed && instance?.serverIp && (
            <div className="mt-2 border-t border-white/[0.04] pt-2">
              <p className="font-mono text-[10px] text-zinc-600">
                IP {instance.serverIp}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ---- Collapse toggle ---- */}
      <div className="shrink-0 border-t border-violet-500/10 p-2">
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 font-mono text-[11px] text-zinc-600 transition-colors hover:bg-white/[0.04] hover:text-zinc-400",
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
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-violet-500/20 bg-[#0a0a0b]/90 backdrop-blur-sm lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5 text-violet-400" />
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
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-60 border-r border-violet-500/10 bg-[#0a0a0b] lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300"
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
        animate={{ width: collapsed ? 56 : 240 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="sticky top-0 hidden h-screen shrink-0 overflow-hidden border-r border-violet-500/10 bg-[#0a0a0b] lg:block"
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}
