"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";

const STYLE_ID = "hero3-animations";

const DeckGlyph = () => {
  const stroke = "rgba(139,92,246,0.35)";
  const fill = "rgba(139,92,246,0.04)";
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32" aria-hidden>
      <circle
        cx="60"
        cy="60"
        r="46"
        fill="none"
        stroke={stroke}
        strokeWidth="1.2"
        className="motion-safe:animate-[hero3-orbit_8.5s_linear_infinite] motion-reduce:animate-none"
        style={{ strokeDasharray: "18 14", transformOrigin: "60px 60px" }}
      />
      <rect
        x="34"
        y="34"
        width="52"
        height="52"
        rx="14"
        fill={fill}
        stroke={stroke}
        strokeWidth="1"
        className="motion-safe:animate-[hero3-grid_5.4s_ease-in-out_infinite] motion-reduce:animate-none"
        style={{ transformOrigin: "60px 60px" }}
      />
      <circle cx="60" cy="60" r="5" fill={stroke} />
      <path
        d="M60 30v10M60 80v10M30 60h10M80 60h10"
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinecap="round"
        className="motion-safe:animate-[hero3-pulse_6s_ease-in-out_infinite] motion-reduce:animate-none"
      />
    </svg>
  );
};

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
      @keyframes hero3-orbit {
        0% { stroke-dashoffset: 0; transform: rotate(0deg); }
        100% { stroke-dashoffset: -64; transform: rotate(360deg); }
      }
      @keyframes hero3-grid {
        0%, 100% { transform: rotate(-2deg); opacity: 0.7; }
        50% { transform: rotate(2deg); opacity: 1; }
      }
      @keyframes hero3-pulse {
        0%, 100% { stroke-dasharray: 0 200; opacity: 0.2; }
        45%, 60% { stroke-dasharray: 200 0; opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (!sectionRef.current || typeof window === "undefined") {
      setVisible(true);
      return;
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
    { name: "email-assistant", status: "active" },
    { name: "code-reviewer", status: "active" },
    { name: "data-pipeline", status: "pending" },
  ];

  return (
    <section
      ref={sectionRef}
      className={`relative w-full px-6 pt-36 pb-20 md:px-10 lg:px-16 xl:px-24 ${
        visible ? "" : "opacity-0"
      }`}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 50% at 30% 0%, rgba(139,92,246,0.1), transparent 70%)",
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
          <span className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-4 py-1.5 font-mono text-xs text-violet-400">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            Now in public beta
          </span>

          <h1 className="mt-8 font-[family-name:var(--font-jetbrains)] text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
            Deploy. Control.{" "}
            <span className="text-gradient">Everything.</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-white/50 md:text-lg">
            The only managed OpenClaw platform with built-in mission control.
            Deploy in 30 seconds, govern with full oversight.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button size="lg" href="/auth/register">
              Start Free
              <ArrowRight size={18} />
            </Button>
            <Button variant="secondary" size="lg" href="#mission-control">
              See it in action
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-4 font-mono text-xs text-white/30">
            <span>No credit card</span>
            <span className="h-3 w-px bg-white/10" />
            <span>Cancel anytime</span>
            <span className="h-3 w-px bg-white/10" />
            <span>30s deploy</span>
          </div>
        </div>

        {/* Right column — stacked cards */}
        <div className="flex flex-col gap-5">
          {/* Terminal card */}
          <div
            className={`overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0b] shadow-2xl shadow-violet-500/5 ${
              visible
                ? "motion-safe:animate-[hero3-card_0.7s_cubic-bezier(.22,.68,0,1)_0.15s_both]"
                : "opacity-0"
            }`}
          >
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <span className="ml-2 font-mono text-[11px] text-white/20">
                terminal
              </span>
            </div>
            <div className="p-5 font-mono text-[13px] leading-7">
              <div className="flex">
                <span className="mr-2 text-violet-400">$</span>
                <span>taro deploy --prod</span>
              </div>
              <div className="mt-1 text-white/35">
                &nbsp; Provisioning instance...
              </div>
              <div className="text-white/35">
                &nbsp; Installing OpenClaw v2.4.1...
              </div>
              <div className="mt-1 text-violet-400">
                &nbsp; ✓ Instance live — taro.sh/your-agent
              </div>
              <div className="text-violet-400">
                &nbsp; ✓ Mission Control ready
              </div>
              <div className="mt-2 flex">
                <span className="mr-2 text-violet-400">$</span>
                <span className="inline-block h-4 w-1.5 translate-y-1 bg-white/70 cursor-blink" />
              </div>
            </div>
          </div>

          {/* Mission Control card */}
          <div
            className={`overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0b] p-5 ${
              visible
                ? "motion-safe:animate-[hero3-card_0.7s_cubic-bezier(.22,.68,0,1)_0.3s_both]"
                : "opacity-0"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md bg-gradient-to-br from-violet-500 to-purple-600" />
                <span className="text-sm font-semibold">Mission Control</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-white/40">
                <span>3 agents</span>
                <span>99.8% uptime</span>
              </div>
            </div>

            {/* Agent list */}
            <div className="space-y-2">
              {agents.map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        agent.status === "active"
                          ? "bg-violet-400"
                          : "bg-amber-400"
                      }`}
                    />
                    <span className="font-mono text-[11px] text-white/70">
                      {agent.name}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-white/30">
                    {agent.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Approval indicator */}
            <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-500/15 bg-amber-500/[0.04] px-3 py-2">
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-amber-400" />
                <span className="text-[11px] text-amber-400">
                  1 pending approval
                </span>
              </div>
              <button className="flex items-center gap-1 rounded-md bg-violet-500/15 px-2.5 py-1 text-[10px] font-medium text-violet-400 transition-colors hover:bg-violet-500/25">
                <CheckCircle2 size={10} />
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroOrbitDeck;
export { HeroOrbitDeck };
