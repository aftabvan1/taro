<p align="center">
  <img src="public/logo.svg" alt="Taro" width="80" />
</p>

<h1 align="center">Taro</h1>

<p align="center">
  <strong>Managed AI agent hosting with a built-in Mission Control dashboard.</strong>
</p>

<p align="center">
  Deploy OpenClaw or Hermes AI agents in under 30 seconds.<br/>
  Get the container <em>and</em> the cockpit — agent management, task boards,<br/>
  activity feeds, web terminal, backups, and monitoring all in one platform.
</p>

<p align="center">
  <a href="https://taroagent.com">Website</a> &nbsp;·&nbsp;
  <a href="#architecture-deep-dive">Architecture</a> &nbsp;·&nbsp;
  <a href="#getting-started">Getting Started</a> &nbsp;·&nbsp;
  <a href="#api-reference">API Reference</a>
</p>

---

## Why Taro?

Every managed agent host gives you a container and a terminal. Taro gives you the container **and** the cockpit:

- **Dual framework support** — deploy [OpenClaw](https://github.com/open-claw/openclaw) or [Hermes](https://github.com/outsourc-e/hermes-agent) agents
- **Mission Control** — agent management, kanban task boards, approval workflows, activity timelines
- **Web Terminal** — browser-based terminal via xterm.js + ttyd, no SSH keys needed
- **Automated Backups** — scheduled backups and one-click restore
- **Resource Monitoring** — real-time CPU, memory, and network stats
- **850+ Integrations** — GitHub, Slack, Gmail, Notion via Composio

### Pricing

| Plan | Price | Resources | Highlights |
|------|-------|-----------|------------|
| **Pro** | $14/mo | 2 vCPU · 4 GB RAM | Terminal, backups, full Mission Control, monitoring, 850+ integrations |
| **Teams** | $49/seat/mo | 4 vCPU · 8 GB RAM | Everything in Pro + SSO, audit logs, org management, SLA |

---

## Architecture Deep Dive

Taro is split into three layers: a **Next.js web app** on Vercel, a **Hetzner bare-metal server** running user containers, and a **Neon PostgreSQL** database that acts as the single source of truth.

### High-Level Overview

```
                        ┌──────────────────────────────────┐
                        │         Browser (Client)         │
                        │  Dashboard · Terminal · Boards    │
                        └──────────┬──────────┬────────────┘
                                   │          │
                          HTTPS    │          │  WSS (xterm.js)
                                   │          │
                ┌──────────────────▼──────────▼────────────────┐
                │            Vercel  (Next.js 16)              │
                │                                              │
                │  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
                │  │ App      │  │ API      │  │ Webhooks  │  │
                │  │ Router   │  │ Routes   │  │ (Stripe)  │  │
                │  │ (React   │  │ /api/*   │  │           │  │
                │  │  19 SSR) │  │          │  │           │  │
                │  └──────────┘  └────┬─────┘  └─────┬─────┘  │
                └─────────────────────┼──────────────┼─────────┘
                                      │              │
                    ┌─────────────────┼──────────────┼─────────────┐
                    │                 │              │             │
                    ▼                 ▼              ▼             ▼
          ┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌─────────┐
          │ Neon         │  │ Hetzner      │  │ Stripe   │  │ Resend  │
          │ PostgreSQL   │  │ Server       │  │ Billing  │  │ Email   │
          │              │  │ (bare metal) │  │          │  │         │
          │ users        │  │              │  └──────────┘  └─────────┘
          │ instances    │  │ Docker       │
          │ mc_*         │  │ containers   │
          │ backups      │  │ (per user)   │
          └──────────────┘  └──────────────┘
```

### Per-User Container Stack

Every deployed instance is a Docker Compose stack on the Hetzner server. Here's what runs inside each user's allocation:

```
┌─────────────────────────────────────────────────────────────────┐
│  Per-User Docker Compose Stack                                  │
│                                                                 │
│  ┌───────────────────────────────────┐  ┌────────────────────┐  │
│  │  Agent Container                  │  │  Sync Daemon       │  │
│  │                                   │  │  (systemd)         │  │
│  │  ┌─────────────┐                 │  │                    │  │
│  │  │  OpenClaw   │  Port: 18789    │  │  Bridges agent     │  │
│  │  │     or      │                 │  │  CLI ↔ Neon DB     │  │
│  │  │  Hermes     │  Port: 8642    │  │  for Mission       │  │
│  │  └─────────────┘                 │  │  Control data      │  │
│  │                                   │  │                    │  │
│  │  Resource Limits:                │  │  HTTP API on       │  │
│  │  • 2 CPU cores                   │  │  localhost          │  │
│  │  • 4 GB RAM + 2 GB swap          │  │                    │  │
│  │  • 256 PIDs max                  │  └────────────────────┘  │
│  │  • Read-only root FS             │                           │
│  │  • Custom seccomp profile        │  ┌────────────────────┐  │
│  │  • All caps dropped              │  │  ttyd Service      │  │
│  │                                   │  │  (systemd)         │  │
│  └───────────────────────────────────┘  │                    │  │
│                                         │  Terminal access   │  │
│                                         │  via docker exec   │  │
│                                         │  Token-authed      │  │
│                                         └────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Caddy Reverse Proxy                                            │
│                                                                 │
│  {name}.instances.taroagent.com      → agent container          │
│  ttyd-{name}.instances.taroagent.com → ttyd service             │
│                                                                 │
│  Auto HTTPS via Cloudflare DNS-01 challenge                     │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow: Dashboard → Agent

This is the path a request takes when a user interacts with Mission Control (e.g., dispatching a task to an agent):

```
  Browser                    Vercel                   Hetzner Server
  ───────                    ──────                   ──────────────
     │                          │                          │
     │  POST /api/mc/tasks/     │                          │
     │  {id}/dispatch           │                          │
     │ ─────────────────────►   │                          │
     │                          │                          │
     │                   ┌──────┴──────┐                   │
     │                   │ Auth check  │                   │
     │                   │ Rate limit  │                   │
     │                   │ Zod parse   │                   │
     │                   └──────┬──────┘                   │
     │                          │                          │
     │                          │  SSH tunnel to           │
     │                          │  sync daemon HTTP API    │
     │                          │ ─────────────────────►   │
     │                          │                          │
     │                          │              ┌───────────┴───────────┐
     │                          │              │ Sync daemon calls     │
     │                          │              │ agent CLI to dispatch │
     │                          │              │ task, monitors result │
     │                          │              │ writes to Neon DB     │
     │                          │              └───────────┬───────────┘
     │                          │                          │
     │                          │  ◄───────────────────────│
     │                          │  Response with status    │
     │                          │                          │
     │  ◄──────────────────────│                          │
     │  { data, message }       │                          │
```

### Instance Lifecycle

```
  User signs up          Selects plan            Clicks "Deploy"
       │                      │                       │
       ▼                      ▼                       ▼
  ┌─────────┐          ┌────────────┐          ┌──────────────┐
  │ Neon DB │          │ Stripe     │          │ Provisioner  │
  │ record  │          │ checkout   │          │ (via SSH)    │
  │ created │          │ confirmed  │          │              │
  └─────────┘          └────────────┘          └──────┬───────┘
                                                      │
                              ┌────────────────────────┤
                              ▼                        ▼
                       ┌─────────────┐          ┌─────────────┐
                       │ Allocate    │          │ Write       │
                       │ ports       │          │ docker-     │
                       │ (atomic DB  │          │ compose.yml │
                       │  update)    │          │ + configs   │
                       └─────────────┘          └──────┬──────┘
                                                       │
                              ┌─────────────────────────┤
                              ▼                        ▼
                       ┌─────────────┐          ┌─────────────┐
                       │ docker      │          │ Setup       │
                       │ compose up  │          │ Caddy +     │
                       │             │          │ ttyd +      │
                       │             │          │ sync daemon │
                       └─────────────┘          └─────────────┘
                                                       │
                                                       ▼
                                                ┌─────────────┐
                                                │  Instance    │
                                                │  RUNNING     │
                                                │  ✓ Agent     │
                                                │  ✓ Terminal  │
                                                │  ✓ MC sync   │
                                                └─────────────┘
```

### Data Model

All platform data lives in Neon PostgreSQL. The sync daemons on the Hetzner server bridge agent state into these tables in real-time.

```
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│   users     │──1:N──│  instances   │──1:N──│  backups     │
│             │       │              │       └──────────────┘
│ id          │       │ id           │
│ email       │       │ userId    ──►│       ┌──────────────┐
│ passwordHash│       │ name         │──1:N──│ activity_logs│
│ plan        │       │ status       │       └──────────────┘
│ stripeId    │       │ agentFramework│
└─────────────┘       │ agentPort    │
                      │ ttydPort     │
                      │ mcPort       │
                      └──────┬───────┘
                             │
              ┌──────────────┼──────────────────────────┐
              │              │                          │
              ▼              ▼                          ▼
       ┌────────────┐ ┌────────────┐            ┌────────────┐
       │ mc_agents  │ │ mc_boards  │            │mc_activity │
       │            │ │            │            └────────────┘
       │ name       │ │ name       │
       │ role       │ │ instanceId │            ┌────────────┐
       │ status     │ │            │            │mc_approvals│
       │ taskCount  │ └─────┬──────┘            └────────────┘
       │ cpuUsage   │       │
       └────────────┘       │                   ┌────────────┐
                            ├──1:N──────────────│ mc_tags    │
                            │                   └────────────┘
                            ▼
                     ┌────────────┐             ┌────────────────┐
                     │ mc_tasks   │             │mc_custom_fields│
                     │            │             └────────────────┘
                     │ title      │
                     │ status     │  inbox → todo → in_progress
                     │ assignee   │  → review → done
                     │ boardId    │
                     └────────────┘
```

### Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Security Layers                                            │
│                                                             │
│  ┌─── Network ────────────────────────────────────────────┐ │
│  │ • All traffic over HTTPS (Caddy auto-TLS)              │ │
│  │ • UFW firewall: only ports 22, 80, 443                 │ │
│  │ • iptables blocks metadata service (169.254.169.254)   │ │
│  │ • No direct container access — all through reverse     │ │
│  │   proxy with token auth                                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─── Container ──────────────────────────────────────────┐ │
│  │ • Docker with NO_NEW_PRIVILEGES                        │ │
│  │ • CAP_DROP ALL (except NET_BIND_SERVICE)               │ │
│  │ • Custom seccomp profile (blocks mount, ptrace, etc.)  │ │
│  │ • Read-only root filesystem + tmpfs for writable dirs  │ │
│  │ • Resource caps: 2 CPU / 4 GB RAM / 256 PIDs           │ │
│  │ • OOM score prioritization (agent protected)           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─── Application ────────────────────────────────────────┐ │
│  │ • JWT auth with 24h expiry + 7d refresh tokens         │ │
│  │ • Account lockout after 5 failed logins (15m cooldown) │ │
│  │ • Rate limiting on all mutating endpoints              │ │
│  │ • Shell input sanitization (validateShellName)         │ │
│  │ • Zod validation on every API input                    │ │
│  │ • Logger auto-redacts secrets (DB URLs, API keys)      │ │
│  │ • Per-instance terminal + MC auth tokens               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) · React 19 |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS v4 · Framer Motion |
| **Database** | Neon PostgreSQL · Drizzle ORM |
| **Auth** | Custom JWT (bcrypt + jsonwebtoken) |
| **Payments** | Stripe (subscriptions) |
| **Email** | Resend |
| **Terminal** | xterm.js (client) · ttyd (server) |
| **Drag & Drop** | @dnd-kit |
| **Integrations** | Composio (850+ tools) |
| **Infrastructure** | Hetzner Cloud · Docker Compose · Caddy |
| **SSH** | node-ssh |

---

## Getting Started

### Prerequisites

- **Node.js 20+** and **npm**
- [Neon](https://neon.tech) PostgreSQL database (free tier works for dev)
- [Stripe](https://stripe.com) account with a subscription product
- [Hetzner Cloud](https://console.hetzner.cloud) server (CPX11 minimum)
- [Resend](https://resend.com) account for email
- (Optional) [Composio](https://composio.dev) API key for integrations

### Setup

```bash
# Clone and install
git clone https://github.com/aftabvan1/taro.git
cd taro
npm install

# Configure
cp .env.example .env.local
# Fill in your credentials — see .env.example for descriptions

# Database
npm run db:migrate

# Run
npm run dev
```

### Server Setup (One-time)

Bootstrap the Hetzner server with Docker, Caddy, and firewall:

```bash
ssh root@YOUR_SERVER_IP 'bash -s' < scripts/setup-server.sh
```

Then configure Cloudflare API token for wildcard TLS:

```bash
echo "CLOUDFLARE_API_TOKEN=your_token_here" > /etc/caddy/environment
systemctl restart caddy
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `SYNC_DATABASE_URL` | No | Restricted-role DB URL for sync daemons |
| `JWT_SECRET` | Yes | Random 32-byte hex: `openssl rand -hex 32` |
| `HETZNER_SERVER_IP` | For provisioning | IP of your Hetzner server |
| `HETZNER_SSH_PRIVATE_KEY` | For provisioning | SSH private key for server access |
| `INSTANCE_DOMAIN` | Yes | Domain for subdomains (e.g., `instances.taroagent.com`) |
| `NEXT_PUBLIC_INSTANCE_DOMAIN` | Yes | Same (client-side) |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | For billing | Price ID for Pro subscription |
| `RESEND_API_KEY` | For emails | Resend API key |
| `COMPOSIO_API_KEY` | No | Composio API key for integrations |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL (`http://localhost:3000` for dev) |

---

## Commands

```bash
npm run dev          # Start dev server on :3000
npm run build        # Production build
npm run start        # Run production server
npm run lint         # ESLint
npm run db:generate  # Generate Drizzle migrations from schema changes
npm run db:migrate   # Apply pending migrations
npm run db:studio    # Open Drizzle Studio (visual DB browser)
```

---

## Project Structure

```
taro/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── login/ signup/              # Auth pages
│   │   ├── dashboard/
│   │   │   ├── layout.tsx              # Auth guard + sidebar + instance context
│   │   │   ├── page.tsx                # Overview
│   │   │   ├── agents/                 # Agent management (Mission Control)
│   │   │   ├── boards/                 # Kanban task boards (MC)
│   │   │   ├── live-feed/              # Real-time activity feed (MC)
│   │   │   ├── terminal/               # Web terminal (xterm.js → ttyd)
│   │   │   ├── integrations/           # Composio integrations
│   │   │   ├── backups/                # Backup management
│   │   │   ├── monitoring/             # Resource stats
│   │   │   ├── settings/               # Instance config, LLM provider
│   │   │   └── billing/                # Stripe subscription management
│   │   └── api/
│   │       ├── auth/                   # Register, login, JWT refresh, password reset
│   │       ├── instances/              # CRUD + start/stop/restart/reprovision
│   │       ├── mission-control/        # Agents, boards, tasks, activity, chat
│   │       ├── backups/                # Create/restore
│   │       ├── billing/                # Stripe checkout/portal
│   │       └── webhooks/stripe/        # Stripe webhook handler
│   ├── components/
│   │   ├── landing/                    # Hero, pricing, features, comparison
│   │   ├── dashboard/                  # Sidebar, status indicators
│   │   ├── boards/                     # Kanban board (drag-and-drop)
│   │   ├── ui/                         # Primitives (button, card, section)
│   │   └── shared/                     # Logo, mascot
│   └── lib/
│       ├── db/schema.ts                # Drizzle schema (all tables)
│       ├── provisioner.ts              # Docker container lifecycle via SSH
│       ├── env.ts                      # Centralized env var validation
│       ├── stripe.ts                   # Stripe helpers
│       ├── rate-limit.ts              # Sliding window rate limiter
│       ├── backup.ts                   # Backup logic (tar + Hetzner S3)
│       ├── shell-sanitize.ts           # Shell injection prevention
│       ├── middleware/auth.ts          # JWT auth middleware
│       ├── auth.ts                     # JWT sign/verify, password hashing
│       ├── ssh-exec.ts                 # SSH tunnel to sync daemon
│       └── logger.ts                   # Sanitized logging (redacts secrets)
├── docker/scripts/
│   ├── openclaw-sync.mjs              # OpenClaw sync daemon
│   ├── hermes-sync.mjs                # Hermes sync daemon
│   └── openclaw-seccomp.json          # Container seccomp profile
└── drizzle/migrations/                 # Auto-generated SQL migrations
```

---

## API Reference

All API routes require `Authorization: Bearer <token>` except auth and webhook endpoints. All mutating routes are rate-limited.

<details>
<summary><strong>Authentication</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (lockout after 5 failures) |
| POST | `/api/auth/refresh` | Refresh JWT token |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |

</details>

<details>
<summary><strong>Instances</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/instances` | List user's instances |
| POST | `/api/instances` | Create instance (requires active subscription) |
| GET | `/api/instances/:id` | Get instance details |
| PATCH | `/api/instances/:id` | Update instance (name, LLM config) |
| DELETE | `/api/instances/:id` | Delete instance + cleanup |
| POST | `/api/instances/:id/start` | Start stopped instance |
| POST | `/api/instances/:id/stop` | Stop running instance |
| POST | `/api/instances/:id/restart` | Restart instance |
| POST | `/api/instances/:id/reprovision` | Full reprovisioning |
| GET | `/api/instances/:id/stats` | Live CPU/memory/network stats |
| POST | `/api/instances/:id/diagnose` | Run diagnostic checks |
| POST | `/api/instances/:id/deploy-sync` | Deploy sync daemon |

</details>

<details>
<summary><strong>Mission Control</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/mission-control/agents` | List / create agents |
| GET/PUT/DELETE | `/api/mission-control/agents/:id` | Agent CRUD |
| GET/POST | `/api/mission-control/boards` | List / create boards |
| GET/PUT/DELETE | `/api/mission-control/boards/:id` | Board CRUD |
| GET | `/api/mission-control/boards/:id/tasks` | List tasks in board |
| GET/PATCH/DELETE | `/api/mission-control/tasks/:id` | Task CRUD |
| POST | `/api/mission-control/tasks/:id/dispatch` | Dispatch task to agent |
| GET/POST | `/api/mission-control/tags` | Tag management |
| GET/POST | `/api/mission-control/custom-fields` | Custom field management |
| GET/POST | `/api/mission-control/activity` | Activity feed |
| GET | `/api/mission-control/dashboard` | Dashboard metrics |
| POST | `/api/mission-control/agent/chat` | Send message to agent |

</details>

<details>
<summary><strong>Billing & Backups</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing` | Get subscription status |
| POST | `/api/billing` | Create checkout or portal session |
| GET | `/api/backups` | List backups |
| POST | `/api/backups` | Create backup |
| POST | `/api/backups/:id/restore` | Restore from backup |

</details>

---

## Key Systems

### Provisioner

The provisioning engine (`src/lib/provisioner.ts`) manages the full lifecycle of user containers on Hetzner via SSH:

1. **Port allocation** — atomic `UPDATE` with `MAX(port) + 10` stride, retries on conflict
2. **Container setup** — writes `docker-compose.yml` with chosen framework, resource limits, seccomp profile
3. **ttyd service** — systemd service for terminal access via `docker exec`
4. **Sync daemon** — bridges agent CLI with Neon DB for Mission Control features
5. **Caddy config** — reverse proxy entries for agent + terminal subdomains
6. **Cleanup** — tears down containers, systemd services, Caddy config, nulls ports

### Agent Frameworks

| | OpenClaw | Hermes |
|---|---------|--------|
| Image | `alpine/openclaw:2026.3.13-1` | `ghcr.io/outsourc-e/hermes-agent:webapi` |
| Internal port | 18789 | 8642 |
| Sync daemon | `openclaw-sync.mjs` | `hermes-sync.mjs` |
| Composio support | Yes | No |

Both share the same provisioning pipeline, port allocation, and Mission Control integration.

### Sync Daemon

Runs on Hetzner alongside each container. Provides an HTTP API called via SSH tunnel:

- Proxies chat messages to the agent
- Dispatches tasks and monitors completion
- Syncs LLM config from Taro DB to agent config
- Creates agents with roles via agent CLI
- Resolves approval workflows

---

## Contributing

Contributions are welcome! Please:

1. Fork the repo
2. Create a feature branch (`feat/your-feature`)
3. Follow the coding conventions below
4. Open a PR against `main`

### Coding Conventions

- TypeScript strict mode — no `any` unless absolutely necessary
- `const` by default, `let` only when reassignment is needed
- Named exports (except page components)
- Absolute imports via `@/`
- Server Components by default; `"use client"` only when needed
- Every protected API route: rate limit → auth check → Zod validation → business logic
- Drizzle ORM only — no raw SQL
- Dark-first UI with Tailwind CSS v4

### Git Workflow

- **Branch prefixes:** `feat/`, `fix/`, `chore/`, `refactor/`
- **Commit messages:** imperative mood, concise
- **Squash merge** PRs

---

## Deployment

### Vercel (Frontend + API)

Push to `main` triggers automatic deployment. Set all env vars in Vercel project settings.

### Hetzner (Containers)

The server runs:
- **Caddy** — reverse proxy for `*.instances.taroagent.com` (auto HTTPS)
- **Docker** — per-user container stacks
- **Sync daemons** — one per instance (systemd)
- **ttyd services** — one per instance (systemd)

```
/opt/taro/instances/{name}/     # Docker Compose + config
/opt/taro/backups/{name}/       # Backup storage
/opt/taro/seccomp/              # Seccomp profiles
/etc/caddy/sites/               # Per-instance Caddy configs
```

---

## License

MIT
