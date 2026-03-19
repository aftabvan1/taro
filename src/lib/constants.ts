export const PLANS = [
  {
    name: "Pro",
    price: 14,
    description: "Everything you need to ship agents to production",
    cupSize: "Large",
    features: [
      "2 vCPU, 4GB RAM",
      "Full web terminal",
      "Hourly automated backups",
      "Full Mission Control dashboard",
      "Real-time resource monitoring",
      "850+ Composio integrations",
      "Custom fields & tags",
      "Priority support",
    ],
    cta: "Deploy Now",
    priceLabel: "/mo",
    highlighted: true,
    comingSoon: false,
  },
  {
    name: "Teams",
    price: 49,
    description: "For teams running agents at scale",
    cupSize: "Taro Party",
    priceLabel: "/seat/mo",
    features: [
      "4 vCPU, 8GB RAM",
      "Full web terminal",
      "Continuous backups",
      "Full Mission Control dashboard",
      "Real-time resource monitoring",
      "850+ Composio integrations",
      "Custom fields & tags",
      "Dedicated support + SLA",
    ],
    cta: "Contact Us",
    highlighted: false,
    comingSoon: false,
  },
] as const;

export const FEATURES = [
  {
    title: "One-Click Deploy",
    description:
      "Your AI agent goes from nothing to live in 30 seconds. We handle servers, networking, and SSL — you just click deploy.",
    icon: "Zap",
  },
  {
    title: "Mission Control",
    description:
      "See what every agent is doing right now. Task boards, activity feeds, resource stats — one dashboard to manage it all.",
    icon: "LayoutDashboard",
  },
  {
    title: "Web Terminal",
    description:
      "Full control when you need it. Install packages, debug, configure — all from your browser. No SSH keys, no setup.",
    icon: "Terminal",
  },
  {
    title: "Live Monitoring",
    description:
      "Know if your agent is healthy or struggling. Real-time CPU, memory, and network stats — so you catch issues before your users notice.",
    icon: "Activity",
  },
  {
    title: "Automated Backups",
    description:
      "Never lose your agent's memory or config. Automatic backups with one-click restore — sleep well.",
    icon: "ShieldCheck",
  },
  {
    title: "850+ Integrations",
    description:
      "Your agent talks to the tools you already use. GitHub, Gmail, Slack, Notion, Stripe — one click to connect, zero config.",
    icon: "Plug",
  },
] as const;

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Mission Control", href: "#mission-control" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#" },
] as const;

export const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Full-Stack Developer",
    quote:
      "I went from spending weekends maintaining my VPS to deploying in 30 seconds. The Mission Control dashboard is something I didn't know I needed — now I can't go back to managing agents blind.",
    avatar: "SC",
  },
  {
    name: "Marcus Rivera",
    role: "AI Automation Consultant",
    quote:
      "I run 12 client agents on Taro. Being able to see every agent's status, CPU usage, and task history in one dashboard changed everything. This is what agent hosting should look like.",
    avatar: "MR",
  },
  {
    name: "Aisha Patel",
    role: "Indie Hacker",
    quote:
      "Deployed my first agent in under a minute. The web terminal, monitoring, and backup system just work. No YAML, no Docker headaches — just results.",
    avatar: "AP",
  },
] as const;

export const LOGOS = [
  "Vercel",
  "Supabase",
  "Linear",
  "Raycast",
  "Resend",
  "Clerk",
  "Planetscale",
  "Railway",
  "Neon",
  "Turso",
] as const;
