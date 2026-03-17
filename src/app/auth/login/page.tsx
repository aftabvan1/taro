"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

/* ── Floating terminal animation ── */
const terminalLines = [
  "$ taro deploy --prod",
  "▸ Building agent image…",
  "▸ Pushing to registry…",
  "▸ Provisioning cluster node…",
  "✓ Agent live at agent.taroagent.com",
  "$ taro status",
  "▸ Uptime 99.97% · 1.2k req/s",
  "✓ All systems nominal",
];

function FloatingTerminal() {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        const next = [...prev, terminalLines[i % terminalLines.length]];
        // Keep the last 6 lines
        return next.slice(-6);
      });
      i++;
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
      <div className="w-full max-w-lg font-mono text-sm leading-relaxed text-brand">
        {visibleLines.map((line, idx) => (
          <motion.div
            key={`${line}-${idx}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {line}
            {idx === visibleLines.length - 1 && (
              <span className="cursor-blink ml-1 inline-block h-4 w-2 bg-brand align-middle" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Page ── */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message ?? "Invalid credentials. Please try again.");
        return;
      }

      localStorage.setItem("token", json.data.token);
      if (json.data.refreshToken) {
        localStorage.setItem("refreshToken", json.data.refreshToken);
      }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-col items-center">
      <FloatingTerminal />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full"
      >
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        {/* Card */}
        <div className="border border-white/10 bg-white/[0.03] rounded-2xl p-8 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
            <p className="mt-1 text-sm text-muted">
              Welcome back. Enter your credentials to continue.
            </p>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-5 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider text-muted">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={cn(
                    "w-full rounded-lg border border-white/10 bg-white/[0.05] py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/50",
                    "outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand/30"
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-muted">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn(
                    "w-full rounded-lg border border-white/10 bg-white/[0.05] py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/50",
                    "outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand/30"
                  )}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "group flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground",
                "transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed",
                "glow-brand-sm"
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <a
              href="/auth/register"
              className="font-medium text-brand transition-colors hover:text-brand/80"
            >
              Create one
            </a>
          </p>
        </div>

        {/* Bottom flourish */}
        <p className="mt-6 text-center text-xs text-muted/50 font-mono">
          taro<span className="text-brand">.</span>sh — deploy agents, not infra
        </p>
      </motion.div>
    </div>
  );
}
