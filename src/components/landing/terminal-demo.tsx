"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/utils";

const COMMAND = "taro deploy --prod";
const CHAR_DELAY = 0.05;
const COMMAND_DURATION = COMMAND.length * CHAR_DELAY;

const OUTPUT_LINES = [
  { text: "  Provisioning instance on eu-central-1...", color: "text-muted", delay: 0.6 },
  { text: "  Installing OpenClaw v2.4.1...", color: "text-muted", delay: 1.2 },
  { text: "  Configuring network & security policies...", color: "text-muted", delay: 1.8 },
  { text: "  Starting Mission Control backend...", color: "text-muted", delay: 2.3 },
  { text: "  Starting agent runtime...", color: "text-muted", delay: 2.8 },
  { text: "  Build complete (2.1 MB)", color: "text-brand", delay: 3.3 },
  { text: "", color: "text-muted", delay: 3.6 },
  { text: "  Instance live at  https://taro.sh/your-agent", color: "text-brand", delay: 3.8 },
  { text: "  Dashboard ready at https://taro.sh/your-agent/control", color: "text-brand", delay: 4.1 },
];

interface TerminalDemoProps {
  className?: string;
}

const Terminal = ({ className }: TerminalDemoProps) => {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0e] shadow-2xl",
        className
      )}
    >
      {/* macOS title bar */}
      <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-3">
        <div className="flex gap-2">
          <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-3 font-mono text-xs text-white/20">~/projects/my-agent</span>
      </div>

      {/* Terminal content */}
      <div className="p-6 font-mono text-[13px] leading-7 md:p-8 md:text-sm">
        {/* Command line with typing effect */}
        <div className="flex">
          <span className="mr-2 select-none text-brand">$</span>
          <div>
            {COMMAND.split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * CHAR_DELAY, duration: 0 }}
                className="text-foreground"
              >
                {char}
              </motion.span>
            ))}
            <motion.span
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{
                delay: COMMAND_DURATION + 0.3,
                duration: 0,
              }}
              className="cursor-blink ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-foreground"
            />
          </div>
        </div>

        {/* Output lines */}
        {OUTPUT_LINES.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: COMMAND_DURATION + line.delay,
              duration: 0.3,
              ease: "easeOut",
            }}
            className={cn("mt-0.5", line.color)}
          >
            {line.text || "\u00A0"}
          </motion.div>
        ))}

        {/* Final blinking cursor */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: COMMAND_DURATION + 4.5,
            duration: 0,
          }}
          className="mt-2 flex"
        >
          <span className="mr-2 select-none text-brand">$</span>
          <span className="cursor-blink inline-block h-4 w-1.5 translate-y-1 bg-foreground" />
        </motion.div>
      </div>
    </div>
  );
};

export const TerminalDemo = () => {
  return (
    <Section className="pt-0 pb-20 md:pb-28">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
        className="relative mx-auto max-w-3xl"
      >
        {/* Glow behind terminal */}
        <div className="absolute -inset-6 -z-10 rounded-3xl bg-brand/10 blur-3xl" />
        <div className="absolute -inset-12 -z-20 rounded-3xl bg-brand/5 blur-[80px]" />
        <Terminal />
      </motion.div>
    </Section>
  );
};
