export const PLANS = [
  {
    name: "Hobby",
    price: 5,
    description: "For developers exploring AI agents",
    features: [
      "1 vCPU, 2GB RAM",
      "Full terminal access",
      "Daily automated backups",
      "3 installed skills",
      "Agent overview & task boards",
      "Community support",
    ],
    cta: "Start Building",
    highlighted: false,
  },
  {
    name: "Pro",
    price: 15,
    description: "For power users shipping real agents",
    features: [
      "2 vCPU, 4GB RAM",
      "Full terminal access",
      "Hourly automated backups",
      "Unlimited skills",
      "Mission Control: approvals & timeline",
      "Resource monitoring dashboard",
      "Custom domain",
      "Priority support",
    ],
    cta: "Go Pro",
    highlighted: true,
  },
  {
    name: "Teams",
    price: 49,
    description: "For teams running agents in production",
    features: [
      "4 vCPU, 8GB RAM",
      "Full terminal access",
      "Continuous backups",
      "Unlimited skills",
      "Full Mission Control suite",
      "Gateway orchestration",
      "Audit logs & SSO",
      "Dedicated support + SLA",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
] as const;

export const FEATURES = [
  {
    title: "One-Click Deploy",
    description:
      "From zero to a running AI agent in 30 seconds. No servers, no Docker, no YAML. Just click deploy.",
    icon: "Zap",
  },
  {
    title: "Mission Control",
    description:
      "The only hosting platform with a built-in governance layer. Manage agents, approvals, and audit trails from one dashboard.",
    icon: "LayoutDashboard",
  },
  {
    title: "Web Terminal",
    description:
      "A real terminal in your browser. Full shell access to your instance — install packages, debug, configure. No SSH needed.",
    icon: "Terminal",
  },
  {
    title: "Live Monitoring",
    description:
      "Real-time CPU, memory, and network metrics. Know what your agent is doing before your users do.",
    icon: "Activity",
  },
  {
    title: "Automated Backups",
    description:
      "Your agent's memory and data, backed up on schedule. One-click restore to any point in time.",
    icon: "ShieldCheck",
  },
  {
    title: "Skill Marketplace",
    description:
      "Browse, install, and publish OpenClaw skills. Extend your agent or monetize your own creations.",
    icon: "Store",
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
      "I went from spending weekends maintaining my VPS to deploying in 30 seconds. Taro's Mission Control is something I didn't know I needed — now I can't imagine running agents without it.",
    avatar: "SC",
  },
  {
    name: "Marcus Rivera",
    role: "AI Automation Consultant",
    quote:
      "I manage 12 client agents on Taro. The approval workflows alone saved me from a production incident last month. This is what agent hosting should look like.",
    avatar: "MR",
  },
  {
    name: "Aisha Patel",
    role: "Indie Hacker",
    quote:
      "Published a Gmail automation skill on the marketplace and it's already generating passive income. The whole platform just feels right — fast, clean, no bloat.",
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
