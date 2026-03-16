"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const COMMAND = "taro deploy --prod";
const CHAR_DELAY = 0.055;
const COMMAND_DURATION = COMMAND.length * CHAR_DELAY;

const OUTPUT_LINES = [
  { text: "→ Provisioning instance...", color: "text-muted", delay: 0.5 },
  { text: "→ Installing OpenClaw v2.4.1...", color: "text-muted", delay: 1.0 },
  { text: "→ Configuring network & security...", color: "text-muted", delay: 1.6 },
  { text: "→ Starting agent runtime...", color: "text-muted", delay: 2.1 },
  { text: "✔ Build complete (2.1 MB)", color: "text-brand", delay: 2.7 },
  { text: "✔ Instance live at taro.sh/your-agent", color: "text-brand", delay: 3.2 },
];

interface TerminalDemoProps {
  className?: string;
}

export const TerminalDemo = ({ className }: TerminalDemoProps) => {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e] shadow-2xl",
        className
      )}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-2 font-mono text-xs text-muted/60">terminal</span>
      </div>

      {/* Terminal content */}
      <div className="p-5 font-mono text-sm leading-7">
        {/* Command line with typing effect */}
        <div className="flex">
          <span className="mr-2 text-brand">$</span>
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
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: COMMAND_DURATION + line.delay,
              duration: 0.3,
              ease: "easeOut",
            }}
            className={cn("mt-1", line.color)}
          >
            {line.text}
          </motion.div>
        ))}

        {/* Final blinking cursor */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: COMMAND_DURATION + 3.6,
            duration: 0,
          }}
          className="mt-2 flex"
        >
          <span className="mr-2 text-brand">$</span>
          <span className="cursor-blink inline-block h-4 w-1.5 translate-y-1 bg-foreground" />
        </motion.div>
      </div>
    </div>
  );
};
