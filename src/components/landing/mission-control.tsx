"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Bot,
  Kanban,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/utils";

const MOCK_AGENTS = [
  { name: "email-assistant", status: "active", tasks: 24 },
  { name: "code-reviewer", status: "active", tasks: 18 },
  { name: "data-pipeline", status: "pending", tasks: 7 },
];

const STATS = [
  { label: "Agents Running", value: "3" },
  { label: "Tasks Completed", value: "142" },
  { label: "Uptime", value: "99.8%" },
];

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: Bot, label: "Agents", active: false },
  { icon: Kanban, label: "Boards", active: false },
  { icon: Settings, label: "Settings", active: false },
];

export const MissionControl = () => {
  return (
    <Section className="overflow-hidden">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Text */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="mb-4 inline-block font-mono text-xs uppercase tracking-widest text-brand">
            Only on Taro
          </span>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built-in{" "}
            <span className="text-gradient">Mission Control</span>
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-muted">
            Don&apos;t just host your agents — manage them. Task boards, approval
            workflows, audit trails, and real-time status. All from one
            dashboard.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "Multi-agent oversight in a single pane",
              "Human-in-the-loop approval workflows",
              "Full activity timeline for debugging",
              "Team workspaces with role-based access",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-sm text-muted"
              >
                <CheckCircle2 size={16} className="shrink-0 text-brand" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
          className="relative"
        >
          <div className="absolute -inset-6 -z-10 rounded-3xl bg-brand/8 blur-3xl" />
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e] shadow-2xl glow-brand">
            <div className="flex">
              {/* Mini sidebar */}
              <div className="hidden w-44 shrink-0 border-r border-white/5 bg-white/[0.02] p-3 sm:block">
                <div className="mb-4 flex items-center gap-2 px-2 py-1">
                  <div className="h-5 w-5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500" />
                  <span className="text-xs font-semibold">taro</span>
                </div>
                {NAV_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs",
                      item.active
                        ? "bg-white/5 text-foreground"
                        : "text-muted"
                    )}
                  >
                    <item.icon size={14} />
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-4">
                {/* Stats row */}
                <div className="mb-4 grid grid-cols-3 gap-3">
                  {STATS.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
                    >
                      <p className="font-mono text-xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Agent list */}
                <div className="mb-3 space-y-1.5">
                  {MOCK_AGENTS.map((agent) => (
                    <div
                      key={agent.name}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            agent.status === "active"
                              ? "bg-emerald-400"
                              : "bg-amber-400"
                          )}
                        />
                        <span className="font-mono text-xs text-foreground">
                          {agent.name}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-muted">
                        {agent.tasks} tasks
                      </span>
                    </div>
                  ))}
                </div>

                {/* Approval card */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Clock size={12} className="text-amber-400" />
                    <span className="text-[10px] font-medium text-amber-400">
                      Pending Approval
                    </span>
                  </div>
                  <p className="mb-3 text-xs text-muted">
                    <span className="font-mono text-foreground">data-pipeline</span>{" "}
                    wants to run:{" "}
                    <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[10px] text-foreground">
                      npm install express
                    </code>
                  </p>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1 rounded-md bg-brand/20 px-2.5 py-1 text-[10px] font-medium text-brand transition-colors hover:bg-brand/30">
                      <CheckCircle2 size={10} />
                      Approve
                    </button>
                    <button className="flex items-center gap-1 rounded-md bg-white/5 px-2.5 py-1 text-[10px] font-medium text-muted transition-colors hover:bg-white/10">
                      <XCircle size={10} />
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
};
