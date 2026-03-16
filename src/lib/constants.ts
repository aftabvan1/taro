export const PLANS = [
  {
    name: "Hobby",
    price: 5,
    description: "Perfect for trying out OpenClaw",
    features: [
      "1 vCPU, 2GB RAM",
      "Full terminal access",
      "Daily automated backups",
      "3 installed skills",
      "Community support",
    ],
    cta: "Start Building",
    highlighted: false,
  },
  {
    name: "Pro",
    price: 15,
    description: "For power users and creators",
    features: [
      "2 vCPU, 4GB RAM",
      "Full terminal access",
      "Hourly automated backups",
      "Unlimited skills",
      "Resource monitoring dashboard",
      "Priority support",
      "Custom domain",
    ],
    cta: "Go Pro",
    highlighted: true,
  },
  {
    name: "Teams",
    price: 49,
    description: "For teams shipping with AI agents",
    features: [
      "4 vCPU, 8GB RAM",
      "Full terminal access",
      "Continuous backups",
      "Unlimited skills",
      "Resource monitoring dashboard",
      "Dedicated support + SLA",
      "Custom domain",
      "Team members & SSO",
      "Audit logs",
    ],
    cta: "Contact Us",
    highlighted: false,
  },
] as const;

export const FEATURES = [
  {
    title: "Deploy in 30 Seconds",
    description:
      "One click. No server setup, no Docker commands, no config files. Your OpenClaw instance is live before your coffee cools down.",
    icon: "Zap",
  },
  {
    title: "Full Terminal Access",
    description:
      "A real terminal in your browser. Install packages, edit configs, run scripts — complete control over your instance.",
    icon: "Terminal",
  },
  {
    title: "Automated Backups",
    description:
      "Your data is backed up automatically. One-click restore to any point in time. Never lose your agent's memory.",
    icon: "ShieldCheck",
  },
  {
    title: "Live Monitoring",
    description:
      "Real-time CPU, memory, and network usage. Know exactly what your agent is doing and how much headroom you have.",
    icon: "Activity",
  },
  {
    title: "Skill Marketplace",
    description:
      "Browse, install, and publish skills. Extend your agent's capabilities or monetize your own creations.",
    icon: "Store",
  },
  {
    title: "Hardened Security",
    description:
      "Isolated containers with CPU limits, memory caps, and PID restrictions. Your instance is yours alone.",
    icon: "Lock",
  },
] as const;

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#" },
] as const;

export const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Full-Stack Developer",
    quote:
      "I was spending hours setting up OpenClaw on my VPS every time something broke. Taro just works. Haven't touched a server config in months.",
    avatar: "SC",
  },
  {
    name: "Marcus Rivera",
    role: "AI Automation Consultant",
    quote:
      "I run OpenClaw instances for 12 clients now. Taro's dashboard lets me manage all of them without breaking a sweat.",
    avatar: "MR",
  },
  {
    name: "Aisha Patel",
    role: "Indie Hacker",
    quote:
      "The skill marketplace is a game-changer. I published a Gmail automation skill and it's already generating passive income.",
    avatar: "AP",
  },
] as const;
