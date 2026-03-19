"use client";

import { motion } from "framer-motion";
import { bouncyItem } from "@/lib/animation-variants";
import {
  LayoutDashboard,
  Bot,
  Kanban,
  Settings,
  CheckCircle2,
  Activity,
  ScrollText,
  Plug,
  Tags,
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

const MOCK_AGENTS = [
  { name: "email-assistant", status: "active", tasks: 24, cpu: "12%" },
  { name: "code-reviewer", status: "active", tasks: 18, cpu: "8%" },
  { name: "data-pipeline", status: "idle", tasks: 7, cpu: "0%" },
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
    description: "See every agent's status, resource usage, and task count at a glance. Know what's running, what's idle, and what needs attention.",
  },
  {
    icon: Kanban,
    title: "Kanban Task Boards",
    description: "Drag-and-drop boards for every agent. Track what your agents are working on, what's queued, and what's done.",
  },
  {
    icon: Activity,
    title: "Real-Time Monitoring",
    description: "Live CPU, memory, and network stats pulled straight from your container. Animated charts, threshold alerts, 5-second refresh.",
  },
  {
    icon: ScrollText,
    title: "Activity Timeline",
    description: "Full history of every action across all your agents. Filter by type, search by keyword, track everything that happened and when.",
  },
  {
    icon: Plug,
    title: "850+ Integrations",
    description: "Connect to 850+ tools — GitHub, Gmail, Slack, Notion, Linear, Stripe, and more. One click to authenticate, instant access for your agents.",
  },
  {
    icon: Tags,
    title: "Custom Fields & Tags",
    description: "Organize tasks your way with custom fields (text, number, date, select) and color-coded tags. Filter and sort across all your boards.",
  },
];

const itemVariants = bouncyItem;

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
          Every other platform gives you a container and a terminal.
          Taro gives you the container, the terminal, <strong className="text-foreground">and the cockpit</strong>.
          A real dashboard built into every instance — so you always know
          what your agents are doing.
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
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-brand/5">
            <div className="flex">
              {/* Mini sidebar */}
              <div className="hidden w-44 shrink-0 border-r border-border bg-white/[0.015] p-3 sm:block">
                <div className="mb-4 flex items-center gap-2 px-2 py-1.5">
                  <div className="h-5 w-5 rounded-md bg-gradient-to-br from-brand-light to-brand-dark" />
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
                      className="rounded-xl border border-border bg-white/[0.02] p-3"
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
                      className="flex items-center justify-between rounded-lg border border-border bg-white/[0.015] px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            agent.status === "active"
                              ? "bg-brand"
                              : "bg-foreground/20"
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

                {/* Monitoring bar */}
                <div className="rounded-xl border border-brand/15 bg-brand/[0.04] p-3">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Activity size={12} className="text-brand" />
                    <span className="text-[10px] font-medium text-brand">
                      Live Resource Monitor
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="font-mono text-[10px] text-muted/50">CPU</p>
                      <div className="mt-1 h-1.5 rounded-full bg-white/[0.06]">
                        <div className="h-full w-[18%] rounded-full bg-brand" />
                      </div>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-muted/50">RAM</p>
                      <div className="mt-1 h-1.5 rounded-full bg-white/[0.06]">
                        <div className="h-full w-[30%] rounded-full bg-brand" />
                      </div>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-muted/50">NET</p>
                      <div className="mt-1 h-1.5 rounded-full bg-white/[0.06]">
                        <div className="h-full w-[12%] rounded-full bg-accent" />
                      </div>
                    </div>
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
            Hermes remembers everything.<br />
            <span className="text-muted">But do you know what it&apos;s doing right now?</span>
          </h3>
          <p className="mt-4 max-w-md leading-relaxed text-muted">
            Self-improving agents are powerful — and unpredictable. Mission Control
            shows you every task, every decision, every skill your agent creates — so
            you&apos;re always in the loop, not just hoping it&apos;s doing the right thing.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Know which agents are busy, idle, or stuck — at a glance",
              "Track every task your agents handle with drag-and-drop boards",
              "Spot slowdowns before they affect your users",
              "Searchable history of everything your agents have done",
              "Connect to 850+ tools — GitHub, Slack, Gmail, and more",
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
              Deploy and see it live
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
            whileHover={{ scale: 1.02, transition: { type: "spring", stiffness: 300, damping: 20 } }}
            className="group rounded-2xl border border-border bg-card p-6 transition-colors duration-300 hover:border-brand/20"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10 ring-1 ring-brand/20">
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
