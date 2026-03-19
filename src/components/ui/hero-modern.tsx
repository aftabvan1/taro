"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity } from "lucide-react";
import { TaroMascot } from "@/components/shared/taro-mascot";

const STYLE_ID = "hero3-animations";

function HeroOrbitDeck() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.innerHTML = `
      @keyframes hero3-intro {
        0% { opacity: 0; transform: translate3d(0, 40px, 0); filter: blur(6px); }
        60% { filter: blur(0); }
        100% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); }
      }
      @keyframes hero3-card {
        0% { opacity: 0; transform: translate3d(0, 30px, 0); }
        100% { opacity: 1; transform: translate3d(0, 0, 0); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (!sectionRef.current || typeof window === "undefined") {
      // Defer the state update to avoid synchronous setState in effect
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    const node = sectionRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const agents = [
    { name: "email-assistant", status: "active", cpu: "12%" },
    { name: "code-reviewer", status: "active", cpu: "8%" },
    { name: "data-pipeline", status: "idle", cpu: "0%" },
  ];

  return (
    <section
      ref={sectionRef}
      className={`relative w-full px-6 pt-36 pb-20 md:px-10 lg:px-16 xl:px-24 ${
        visible ? "" : "opacity-0"
      }`}
    >
      {/* Background glow — taro purple */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 50% at 30% 0%, rgba(155,126,200,0.12), transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Two-column grid */}
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        {/* Left column — text */}
        <div
          className={`${
            visible
              ? "motion-safe:animate-[hero3-intro_0.8s_cubic-bezier(.22,.68,0,1)_forwards]"
              : "opacity-0"
          }`}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-1.5 font-mono text-xs text-brand-light">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.6" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            OpenClaw + Hermes — the only platform that runs both
          </span>

          <h1 className="mt-8 font-[family-name:var(--font-fredoka)] text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
            Your AI agent.{" "}
            <span className="text-gradient">Always on. Always managed.</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-foreground/50 md:text-lg">
            Deploy OpenClaw or Hermes in 30 seconds. Connect 850+ tools,
            monitor everything from one dashboard, and never touch a server.
            From $14/mo.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button size="lg" href="/auth/register">
              Deploy Your Agent
              <ArrowRight size={18} />
            </Button>
            <Button variant="secondary" size="lg" href="#mission-control">
              See the dashboard
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-4 font-mono text-xs text-foreground/30">
            <span>$14/mo</span>
            <span className="h-1.5 w-1.5 rounded-full bg-accent/40" />
            <span>Cancel anytime</span>
            <span className="h-1.5 w-1.5 rounded-full bg-accent/40" />
            <span>30-second deploy</span>
          </div>
        </div>

        {/* Right column — stacked cards + mascot */}
        <div className="relative flex flex-col gap-5">
          {/* Mascot floating beside cards */}
          <div className="absolute -right-4 -top-16 z-20 hidden lg:block">
            <TaroMascot mood="idle" size="sm" />
          </div>

          {/* Terminal card */}
          <div
            className={`overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-brand/5 ${
              visible
                ? "motion-safe:animate-[hero3-card_0.7s_cubic-bezier(.22,.68,0,1)_0.15s_both]"
                : "opacity-0"
            }`}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <span className="ml-2 font-mono text-[11px] text-foreground/20">
                terminal
              </span>
            </div>
            <div className="p-5 font-mono text-[13px] leading-7">
              <div className="flex">
                <span className="mr-2 text-brand">$</span>
                <span>taro deploy</span>
              </div>
              <div className="mt-1 text-foreground/50">
                &nbsp; ? Choose framework: <span className="text-brand">OpenClaw</span> / Hermes
              </div>
              <div className="text-foreground/35">
                &nbsp; → Deploying OpenClaw v2026.3...
              </div>
              <div className="mt-1 text-brand">
                &nbsp; ✓ Agent live at agent.taroagent.com
              </div>
              <div className="text-brand">
                &nbsp; ✓ Mission Control ready
              </div>
              <div className="text-brand">
                &nbsp; ✓ 850+ integrations connected
              </div>
              <div className="mt-2 flex">
                <span className="mr-2 text-brand">$</span>
                <span className="inline-block h-4 w-1.5 translate-y-1 bg-foreground/70 cursor-blink" />
              </div>
            </div>
          </div>

          {/* Mission Control card */}
          <div
            className={`overflow-hidden rounded-2xl border border-border bg-card p-5 ${
              visible
                ? "motion-safe:animate-[hero3-card_0.7s_cubic-bezier(.22,.68,0,1)_0.3s_both]"
                : "opacity-0"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md bg-gradient-to-br from-brand-light to-brand-dark" />
                <span className="text-sm font-semibold">Mission Control</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-foreground/40">
                <span>3 agents</span>
                <span>99.8% uptime</span>
              </div>
            </div>

            {/* Agent list */}
            <div className="space-y-2">
              {agents.map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center justify-between rounded-lg border border-border bg-white/[0.02] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        agent.status === "active"
                          ? "bg-brand"
                          : "bg-foreground/20"
                      }`}
                    />
                    <span className="font-mono text-[11px] text-foreground/70">
                      {agent.name}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-foreground/30">
                    {agent.cpu}
                  </span>
                </div>
              ))}
            </div>

            {/* Monitoring stats bar */}
            <div className="mt-3 flex items-center justify-between rounded-lg border border-brand/15 bg-brand/[0.04] px-3 py-2">
              <div className="flex items-center gap-2">
                <Activity size={12} className="text-brand" />
                <span className="text-[11px] text-brand">
                  CPU 18% &middot; RAM 1.2GB / 4GB
                </span>
              </div>
              <span className="font-mono text-[10px] text-foreground/30">live</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroOrbitDeck;
export { HeroOrbitDeck };
