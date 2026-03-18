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
    highlighted: true,
    comingSoon: false,
  },
  {
    name: "Teams",
    price: 49,
    description: "For teams running agents at scale",
    cupSize: "Taro Party",
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
      "From zero to a running OpenClaw instance in 30 seconds. We handle the server, Docker, networking, and SSL. You just click deploy.",
    icon: "Zap",
  },
  {
    title: "Mission Control",
    description:
      "A full dashboard to manage your agents, track tasks on Kanban boards, and monitor everything from one place. Not just a container — a cockpit.",
    icon: "LayoutDashboard",
  },
  {
    title: "Web Terminal",
    description:
      "A real terminal in your browser. Full shell access to your instance — install packages, debug, configure. No SSH setup needed.",
    icon: "Terminal",
  },
  {
    title: "Live Monitoring",
    description:
      "Real-time CPU, memory, and network stats pulled straight from your container. Know exactly what your agent is doing.",
    icon: "Activity",
  },
  {
    title: "Automated Backups",
    description:
      "Your agent's data, backed up on schedule. One-click restore to any point in time. Sleep well.",
    icon: "ShieldCheck",
  },
  {
    title: "850+ Integrations",
    description:
      "Connect your agents to 850+ tools — GitHub, Gmail, Slack, Notion, Linear, Stripe, and more. One click to authenticate.",
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
