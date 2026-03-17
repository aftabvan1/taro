"use client";

import { motion } from "framer-motion";
import { landingItem } from "@/lib/animation-variants";
import {
  LayoutDashboard,
  Bot,
  Kanban,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Shield,
  Users,
  ScrollText,
  Workflow,
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

const MOCK_AGENTS = [
  { name: "email-assistant", status: "active", tasks: 24, cpu: "12%" },
  { name: "code-reviewer", status: "active", tasks: 18, cpu: "8%" },
  { name: "data-pipeline", status: "pending", tasks: 7, cpu: "0%" },
];

const STATS = [
  { label: "Agents Running", value: "3", trend: "+1" },
  { label: "Tasks Completed", value: "142", trend: "+23" },
  { label: "Uptime", value: "99.8%", trend: "" },
];

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: Bot, label: "Agents", active: false },
  { icon: Kanban, label: "Boards", active: false },
  { icon: Activity, label: "Monitoring", active: false },
  { icon: Settings, label: "Settings", active: false },
];

const MC_FEATURES = [
  {
    icon: Bot,
    title: "Multi-Agent Overview",
    description: "See every agent's status, resource usage, and task count in one view. No more SSHing into boxes to check if things are running.",
  },
  {
    icon: Kanban,
    title: "Task Boards",
    description: "Kanban-style boards for every agent. Track what your agents are working on, what's queued, and what's done — like Jira, but for AI.",
  },
  {
    icon: Shield,
    title: "Approval Workflows",
    description: "Human-in-the-loop control. When an agent wants to install a package, hit an API, or take a destructive action — you approve or deny it first.",
  },
  {
    icon: ScrollText,
    title: "Audit Logs & Timeline",
    description: "Full activity timeline of every action every agent has taken. Searchable, exportable, and essential for debugging and compliance.",
  },
  {
    icon: Workflow,
    title: "Gateway Orchestration",
    description: "Route requests between agents, set up pipelines, and orchestrate multi-agent workflows — all from the dashboard.",
  },
  {
    icon: Users,
    title: "Team Workspaces",
    description: "Invite your team, set role-based permissions, and manage who can approve what. Built for teams shipping agents in production.",
  },
];

const itemVariants = landingItem;

export const MissionControl = () => {
  return (
    <Section id="mission-control" className="overflow-hidden">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-16 text-center"
      >
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 font-mono text-xs text-brand">
          <span className="h-1 w-1 rounded-full bg-brand" />
          Only on Taro
        </span>
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Not just hosting.{" "}
          <span className="text-gradient">Mission Control.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          Every other hosting platform gives you a container and a terminal.
          Taro gives you the container, the terminal, <strong className="text-foreground">and the cockpit</strong>.
          A full governance and orchestration layer built into every instance — so you
          can manage your agents like a team, not a black box.
        </p>
      </motion.div>

      {/* Dashboard mockup + description */}
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative order-2 lg:order-1"
        >
          <div className="absolute -inset-8 -z-10 rounded-3xl bg-brand/[0.06] blur-[60px]" />
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0e] shadow-2xl shadow-brand/5">
            <div className="flex">
              {/* Mini sidebar */}
              <div className="hidden w-44 shrink-0 border-r border-white/[0.04] bg-white/[0.015] p-3 sm:block">
                <div className="mb-4 flex items-center gap-2 px-2 py-1.5">
                  <div className="h-5 w-5 rounded-md bg-gradient-to-br from-violet-500 to-purple-600" />
                  <span className="text-xs font-semibold">taro</span>
                </div>
                {NAV_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                      item.active
                        ? "bg-white/[0.06] text-foreground"
                        : "text-muted/60"
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
                      className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3"
                    >
                      <div className="flex items-baseline gap-1.5">
                        <p className="font-mono text-xl font-bold text-foreground">
                          {stat.value}
                        </p>
                        {stat.trend && (
                          <span className="font-mono text-[10px] text-brand">
                            {stat.trend}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted/60">
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
                      className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            agent.status === "active"
                              ? "bg-violet-400"
                              : "bg-amber-400"
                          )}
                        />
                        <span className="font-mono text-xs text-foreground">
                          {agent.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-muted/50">
                          {agent.cpu}
                        </span>
                        <span className="font-mono text-[10px] text-muted/50">
                          {agent.tasks} tasks
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Approval card */}
                <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Clock size={12} className="text-amber-400" />
                    <span className="text-[10px] font-medium text-amber-400">
                      Pending Approval
                    </span>
                  </div>
                  <p className="mb-3 text-xs text-muted">
                    <span className="font-mono text-foreground">data-pipeline</span>{" "}
                    wants to execute:{" "}
                    <code className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                      npm install express
                    </code>
                  </p>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1 rounded-md bg-brand/15 px-2.5 py-1 text-[10px] font-medium text-brand transition-colors hover:bg-brand/25">
                      <CheckCircle2 size={10} />
                      Approve
                    </button>
                    <button className="flex items-center gap-1 rounded-md bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-muted transition-colors hover:bg-white/[0.08]">
                      <XCircle size={10} />
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right side — key selling points */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
          className="order-1 lg:order-2"
        >
          <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Your agents are autonomous.<br />
            <span className="text-muted">Your oversight shouldn&apos;t be optional.</span>
          </h3>
          <p className="mt-4 max-w-md leading-relaxed text-muted">
            Mission Control is a governance layer that sits on top of every OpenClaw
            instance. It&apos;s how you go from &ldquo;I hope my agent is fine&rdquo; to
            &ldquo;I know exactly what it&apos;s doing, and it can&apos;t act without my say-so.&rdquo;
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "See all agents, tasks, and resource usage in one pane",
              "Approve or deny agent actions before they execute",
              "Full audit log of every decision and action",
              "Kanban boards to track agent workloads",
              "Team roles — control who can approve what",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-muted"
              >
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Button href="/auth/register">
              Try Mission Control
              <ArrowRight size={16} />
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Feature cards grid */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        transition={{ staggerChildren: 0.08 }}
        className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {MC_FEATURES.map((feature) => (
          <motion.div
            key={feature.title}
            variants={itemVariants}
            className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.04]"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 ring-1 ring-brand/20">
              <feature.icon size={20} className="text-brand" />
            </div>
            <h4 className="mb-1.5 font-semibold">{feature.title}</h4>
            <p className="text-sm leading-relaxed text-muted">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
};
