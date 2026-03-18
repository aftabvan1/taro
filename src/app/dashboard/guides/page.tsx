"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Terminal,
  MessageCircle,
  Hash,
  Globe,
  Mail,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Zap,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Guide {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconBorder: string;
  steps: Step[];
  tips?: string[];
}

interface Step {
  title: string;
  description: string;
  command?: string;
  note?: string;
  substeps?: string[];
}

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

/* ------------------------------------------------------------------ */
/*  Guide data                                                         */
/* ------------------------------------------------------------------ */

const guides: Guide[] = [
  {
    id: "telegram",
    title: "Telegram Bot",
    description: "Connect your OpenClaw agent to Telegram so users can chat with it directly in any Telegram conversation.",
    icon: <MessageCircle className="h-4 w-4" />,
    iconBg: "bg-sky-500/10",
    iconBorder: "border-sky-500/20",
    steps: [
      {
        title: "Create a Telegram Bot",
        description: "Open Telegram, search for @BotFather, and create a new bot.",
        substeps: [
          "Open Telegram and search for @BotFather",
          "Send /newbot and follow the prompts",
          "Choose a name and username for your bot",
          "Copy the API token BotFather gives you — you'll need it next",
        ],
      },
      {
        title: "Open the Terminal",
        description: "Go to the Terminal page in your Taro dashboard, or use the Web Chat terminal.",
      },
      {
        title: "Run the configure command",
        description: "In your OpenClaw terminal, run:",
        command: "openclaw configure",
      },
      {
        title: "Select Telegram",
        description: "The configure wizard will list available channels. Select Telegram from the list.",
      },
      {
        title: "Paste your Bot Token",
        description: "When prompted, paste the API token you got from BotFather. OpenClaw will validate the connection.",
      },
      {
        title: "Test it",
        description: "Open Telegram, find your bot by its username, and send a message. Your OpenClaw agent should respond.",
      },
    ],
    tips: [
      "You can add the bot to group chats — it will respond when mentioned by @username",
      "To change or remove the Telegram integration, run openclaw configure again",
      "Bot responses respect your agent's configured personality and skills",
    ],
  },
  {
    id: "discord",
    title: "Discord Bot",
    description: "Add your OpenClaw agent to a Discord server so it can respond in channels and DMs.",
    icon: <Hash className="h-4 w-4" />,
    iconBg: "bg-indigo-500/10",
    iconBorder: "border-indigo-500/20",
    steps: [
      {
        title: "Create a Discord Application",
        description: "Go to the Discord Developer Portal and create a new application.",
        substeps: [
          "Go to discord.com/developers/applications",
          "Click \"New Application\" and give it a name",
          "Go to the \"Bot\" tab and click \"Add Bot\"",
          "Under the bot's token section, click \"Reset Token\" and copy it",
          "Enable \"Message Content Intent\" under Privileged Gateway Intents",
        ],
      },
      {
        title: "Invite the Bot to your Server",
        description: "Generate an invite link with the right permissions.",
        substeps: [
          "Go to the \"OAuth2 → URL Generator\" tab",
          "Select scopes: bot, applications.commands",
          "Select permissions: Send Messages, Read Message History, Read Messages/View Channels",
          "Copy the generated URL, open it, and select your server",
        ],
      },
      {
        title: "Open the Terminal",
        description: "Go to the Terminal page in your Taro dashboard.",
      },
      {
        title: "Run the configure command",
        description: "In your OpenClaw terminal, run:",
        command: "openclaw configure",
      },
      {
        title: "Select Discord",
        description: "Select Discord from the channel list and paste your bot token when prompted.",
      },
      {
        title: "Test it",
        description: "Go to your Discord server and send a message in a channel the bot has access to. Mention it with @BotName to trigger a response.",
      },
    ],
    tips: [
      "The bot needs \"Message Content Intent\" enabled to read messages",
      "You can restrict which channels the bot responds in via Discord's channel permissions",
      "Use slash commands if you set up applications.commands scope",
    ],
  },
  {
    id: "web",
    title: "Web Chat Widget",
    description: "Embed your OpenClaw agent on any website with a chat widget your visitors can interact with.",
    icon: <Globe className="h-4 w-4" />,
    iconBg: "bg-emerald-500/10",
    iconBorder: "border-emerald-500/20",
    steps: [
      {
        title: "Open the Terminal",
        description: "Go to the Terminal page in your Taro dashboard.",
      },
      {
        title: "Run the configure command",
        description: "In your OpenClaw terminal, run:",
        command: "openclaw configure",
      },
      {
        title: "Select Web",
        description: "Select the Web channel from the list. OpenClaw will enable the web chat endpoint.",
      },
      {
        title: "Get your embed snippet",
        description: "After configuration, OpenClaw will output an embed script tag. Copy it.",
        note: "You can also find the Web Chat URL in your Taro dashboard sidebar under \"Web Chat\".",
      },
      {
        title: "Add to your site",
        description: "Paste the script tag into your website's HTML, just before the closing </body> tag.",
      },
    ],
    tips: [
      "The Taro dashboard already has a direct \"Web Chat\" link in the sidebar — no embed needed for personal use",
      "The widget is customizable via OpenClaw's configuration options",
    ],
  },
  {
    id: "slack",
    title: "Slack",
    description: "Connect your OpenClaw agent to a Slack workspace so it can respond in channels and DMs.",
    icon: <MessageCircle className="h-4 w-4" />,
    iconBg: "bg-purple-500/10",
    iconBorder: "border-purple-500/20",
    steps: [
      {
        title: "Create a Slack App",
        description: "Go to api.slack.com/apps and create a new app.",
        substeps: [
          "Click \"Create New App\" → \"From scratch\"",
          "Name your app and select your workspace",
          "Go to \"OAuth & Permissions\" and add scopes: chat:write, app_mentions:read, channels:history, im:history",
          "Install the app to your workspace and copy the Bot User OAuth Token",
        ],
      },
      {
        title: "Enable Event Subscriptions",
        description: "In your Slack app settings, go to \"Event Subscriptions\" and enable them. You'll configure the URL after running openclaw configure.",
      },
      {
        title: "Run the configure command",
        description: "In your OpenClaw terminal, run:",
        command: "openclaw configure",
      },
      {
        title: "Select Slack",
        description: "Select Slack from the channel list and paste your Bot User OAuth Token when prompted.",
      },
      {
        title: "Set the Event URL",
        description: "OpenClaw will output a webhook URL. Go back to your Slack app's Event Subscriptions and paste it as the Request URL.",
        substeps: [
          "Subscribe to bot events: app_mention, message.im",
          "Save changes",
        ],
      },
      {
        title: "Test it",
        description: "Invite the bot to a channel with /invite @YourBot and mention it.",
      },
    ],
    tips: [
      "Use Socket Mode if you don't want to expose a public URL",
      "The bot will only respond in channels it's been invited to",
    ],
  },
  {
    id: "email",
    title: "Email",
    description: "Let your OpenClaw agent send and receive emails, responding to incoming messages automatically.",
    icon: <Mail className="h-4 w-4" />,
    iconBg: "bg-amber-500/10",
    iconBorder: "border-amber-500/20",
    steps: [
      {
        title: "Open the Terminal",
        description: "Go to the Terminal page in your Taro dashboard.",
      },
      {
        title: "Run the configure command",
        description: "In your OpenClaw terminal, run:",
        command: "openclaw configure",
      },
      {
        title: "Select Email",
        description: "Select the Email channel from the list.",
      },
      {
        title: "Enter your SMTP/IMAP credentials",
        description: "Provide the email credentials when prompted.",
        substeps: [
          "SMTP host and port (for sending)",
          "IMAP host and port (for receiving)",
          "Email address and app-specific password",
        ],
        note: "For Gmail, you'll need to generate an App Password in your Google Account settings.",
      },
      {
        title: "Test it",
        description: "Send an email to the configured address. Your agent should pick it up and respond.",
      },
    ],
    tips: [
      "Use an app-specific password, not your main email password",
      "You can configure auto-reply rules in OpenClaw's agent settings",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  CopyButton                                                         */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-white/[0.06] hover:text-zinc-400"
      aria-label="Copy command"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  GuideCard (collapsible)                                            */
/* ------------------------------------------------------------------ */

function GuideCard({ guide }: { guide: Guide }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl border border-white/[0.06] bg-[#0a0a0b] overflow-hidden"
    >
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-white/[0.015]"
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            guide.iconBg,
            guide.iconBorder
          )}
        >
          {guide.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{guide.title}</h3>
          <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">
            {guide.description}
          </p>
        </div>
        <div className="shrink-0 text-zinc-600">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="border-t border-white/[0.04] px-5 pb-5"
        >
          {/* Description */}
          <p className="mt-4 text-sm text-zinc-400">{guide.description}</p>

          {/* Steps */}
          <div className="mt-5 space-y-4">
            {guide.steps.map((step, idx) => (
              <div key={idx} className="flex gap-3">
                {/* Step number */}
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10 font-mono text-[10px] font-bold text-violet-400">
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {step.description}
                  </p>

                  {/* Command block */}
                  {step.command && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <Terminal className="h-3.5 w-3.5 shrink-0 text-emerald-500/60" />
                      <code className="flex-1 font-mono text-xs text-emerald-400">
                        {step.command}
                      </code>
                      <CopyButton text={step.command} />
                    </div>
                  )}

                  {/* Sub-steps */}
                  {step.substeps && (
                    <ul className="mt-2 space-y-1.5">
                      {step.substeps.map((sub, subIdx) => (
                        <li
                          key={subIdx}
                          className="flex items-start gap-2 text-xs text-zinc-500"
                        >
                          <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-zinc-700" />
                          <span>{sub}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Note */}
                  {step.note && (
                    <div className="mt-2 rounded-lg border border-amber-500/10 bg-amber-500/[0.04] px-3 py-2">
                      <p className="text-xs text-amber-400/80">
                        {step.note}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          {guide.tips && guide.tips.length > 0 && (
            <div className="mt-5 rounded-xl border border-white/[0.04] bg-white/[0.015] p-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-violet-500/60">
                Tips
              </p>
              <ul className="space-y-1.5">
                {guide.tips.map((tip, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-zinc-500"
                  >
                    <Zap className="mt-0.5 h-3 w-3 shrink-0 text-violet-500/40" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function GuidesPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.06 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-emerald-500" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Setup Guides
          </h1>
          <span className="hidden font-mono text-xs text-zinc-600 sm:inline">
            // CHANNEL INTEGRATIONS
          </span>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Connect your OpenClaw agent to messaging platforms using{" "}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-emerald-400">
            openclaw configure
          </code>
          . Each guide walks you through setup step by step.
        </p>
      </motion.div>

      {/* Quick start callout */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-3 rounded-xl border border-violet-500/10 bg-violet-500/[0.03] px-4 py-3"
      >
        <Terminal className="h-4 w-4 shrink-0 text-violet-400" />
        <p className="text-xs text-zinc-400">
          <span className="font-medium text-zinc-300">Quick start:</span>{" "}
          All integrations start the same way — open your Terminal and run{" "}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-emerald-400">
            openclaw configure
          </code>
          , then follow the prompts.
        </p>
      </motion.div>

      {/* Guide cards */}
      {guides.map((guide) => (
        <GuideCard key={guide.id} guide={guide} />
      ))}
    </motion.div>
  );
}
