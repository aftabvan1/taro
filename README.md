# Taro

**Managed AI agent hosting with a built-in Mission Control dashboard.**

Deploy OpenClaw or Hermes AI agents in under 30 seconds. Get the container AND the cockpit — agent management, task boards, activity feeds, web terminal, backups, and monitoring all in one platform.

> **Live at:** [taroagent.com](https://taroagent.com)

---

## Table of Contents

- [What is Taro?](#what-is-taro)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Commands](#commands)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Key Systems](#key-systems)
- [Dashboard Pages](#dashboard-pages)
- [Coding Conventions](#coding-conventions)
- [Git Workflow](#git-workflow)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## What is Taro?

Taro is the only managed AI agent hosting platform with a built-in Mission Control dashboard. While competitors give you a container and a terminal, Taro gives you:

- **Dual framework support** — deploy [OpenClaw](https://github.com/open-claw/openclaw) or [Hermes](https://github.com/outsourc-e/hermes-agent) agents
- **Mission Control** — agent management, kanban task boards, approval workflows, activity timelines
- **Web Terminal** — browser-based terminal access via xterm.js + ttyd, no SSH keys needed
- **Automated Backups** — scheduled backup and one-click restore
- **Resource Monitoring** — real-time CPU, memory, and network stats
- **850+ Integrations** — GitHub, Slack, Gmail, Notion via Composio

### Pricing

| Plan | Price | Resources | Key Features |
|------|-------|-----------|--------------|
| **Pro** | $14/mo | 2 vCPU, 4GB RAM | Terminal, backups, full Mission Control, monitoring, 850+ integrations |
| **Teams** | $49/seat/mo | 4 vCPU, 8GB RAM | Everything in Pro + SSO, audit logs, org management, SLA |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| React | React 19 |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Database | Neon PostgreSQL + Drizzle ORM |
| Auth | Custom JWT (bcrypt + jsonwebtoken) |
| Payments | Stripe (subscriptions) |
| Email | Resend |
| Terminal | xterm.js (client) + ttyd (server) |
| Drag & Drop | @dnd-kit |
| Integrations | Composio |
| Infrastructure | Hetzner Cloud + Docker Compose + Caddy |
| SSH | node-ssh |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               Taro Web App (Next.js on Vercel)              │
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐│
│  │  Landing    │  │  Dashboard │  │  API Routes            ││
│  │  Page       │  │  (React)   │  │  /api/auth             ││
│  │            │  │            │  │  /api/instances         ││
│  │            │  │            │  │  /api/mission-control   ││
│  │            │  │            │  │  /api/billing           ││
│  │            │  │            │  │  /api/backups           ││
│  └────────────┘  └────────────┘  └───────────┬────────────┘│
└──────────────────────────────────────────────┬──────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────┐
                    │                          │                  │
                    v                          v                  v
          ┌─────────────────┐     ┌──────────────────┐  ┌──────────────┐
          │  Neon PostgreSQL │     │  Stripe          │  │  Hetzner     │
          │                 │     │  (Billing)       │  │  Server      │
          │  - users        │     └──────────────────┘  │              │
          │  - instances    │                           │  Per-user:   │
          │  - backups      │          SSH tunnel       │  ┌────────┐ │
          │  - mc_agents    │  ◄────────────────────►   │  │OpenClaw│ │
          │  - mc_boards    │                           │  │or      │ │
          │  - mc_tasks     │                           │  │Hermes  │ │
          │  - mc_activity  │                           │  │+ ttyd  │ │
          │  - mc_approvals │                           │  │+ sync  │ │
          └─────────────────┘                           │  └────────┘ │
                                                        │  Caddy proxy│
                                                        └──────────────┘
```

### How it all connects

1. **Vercel** hosts the Next.js app (frontend + API routes)
2. **Neon PostgreSQL** stores all platform data (users, instances, Mission Control state)
3. **Hetzner Server** runs user containers (OpenClaw or Hermes + ttyd per instance)
4. **Caddy** reverse proxies `*.instances.taroagent.com` to the right container with automatic HTTPS via Cloudflare DNS
5. **Sync Daemon** (Node.js on Hetzner) bridges agent ↔ Neon DB for Mission Control features
6. API routes SSH into Hetzner to provision/manage containers and communicate with sync daemons

---

## Getting Started

### Prerequisites

- **Node.js 20+** and **npm**
- A [Neon](https://neon.tech) PostgreSQL database (free tier works for dev)
- A [Stripe](https://stripe.com) account with a subscription product created
- A [Hetzner Cloud](https://console.hetzner.cloud) server (CPX11 minimum for dev)
- A [Resend](https://resend.com) account for transactional email
- (Optional) A [Composio](https://composio.dev) API key for integrations

### Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/aftabvan1/taro.git
cd taro

# 2. Install dependencies
npm install

# 3. Copy env file and fill in your credentials
cp .env.example .env.local
# Edit .env.local — see Environment Variables below

# 4. Run database migrations
npm run db:migrate

# 5. Start the dev server
npm run dev
```

The app will be running at `http://localhost:3000`.

### Server Setup (One-time)

Bootstrap the Hetzner server with Docker, Caddy, and firewall rules:

```bash
ssh root@YOUR_SERVER_IP 'bash -s' < scripts/setup-server.sh
```

This installs Docker Engine, Caddy (reverse proxy), UFW firewall (ports 22, 80, 443 only), and creates `/opt/taro/instances/` and `/opt/taro/backups/`.

After running, set the `CLOUDFLARE_API_TOKEN` on the server for wildcard TLS:
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
| `SYNC_DATABASE_URL` | No | Restricted-role DB URL for sync daemons (falls back to DATABASE_URL) |
| `JWT_SECRET` | Yes | Random string for JWT signing. Generate: `openssl rand -hex 32` |
| `HETZNER_SERVER_IP` | For provisioning | IP address of your Hetzner server |
| `HETZNER_SSH_PRIVATE_KEY` | For provisioning | SSH private key for server access |
| `INSTANCE_DOMAIN` | Yes | Domain for instance subdomains (e.g., `instances.taroagent.com`) |
| `NEXT_PUBLIC_INSTANCE_DOMAIN` | Yes | Same as above (client-side) |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key (`sk_test_...` for dev) |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_ID` | For billing | Stripe Price ID for the Pro subscription |
| `STRIPE_PORTAL_CONFIG_ID` | No | Stripe billing portal configuration ID |
| `RESEND_API_KEY` | For emails | Resend API key |
| `FROM_EMAIL` | For emails | Sender email (e.g., `Taro <noreply@taroagent.com>`) |
| `COMPOSIO_API_KEY` | No | Composio API key for integrations |
| `COMPOSIO_CONSUMER_KEY` | No | Composio consumer key for agent plugins |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL (`http://localhost:3000` for dev) |

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on :3000 |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations from schema changes |
| `npm run db:migrate` | Apply pending migrations to database |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) |

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
│   │   │   ├── page.tsx                # Dashboard overview
│   │   │   ├── agents/                 # Agent management (MC)
│   │   │   ├── boards/                 # Kanban task boards (MC)
│   │   │   ├── live-feed/              # Real-time activity feed (MC)
│   │   │   ├── terminal/               # Web terminal (xterm.js + ttyd)
│   │   │   ├── integrations/           # Composio integrations
│   │   │   ├── guides/                 # Getting started guides
│   │   │   ├── backups/                # Backup management
│   │   │   ├── monitoring/             # Resource stats (CPU/RAM/network)
│   │   │   ├── settings/               # Instance config, LLM provider, danger zone
│   │   │   └── billing/                # Stripe subscription management
│   │   └── api/
│   │       ├── auth/                   # Login, register, JWT refresh, password reset
│   │       ├── instances/              # CRUD + start/stop/restart/reprovision
│   │       ├── mission-control/        # Agents, boards, tasks, activity, agent chat
│   │       ├── backups/                # Backup create/restore
│   │       ├── billing/                # Stripe checkout/portal
│   │       └── webhooks/stripe/        # Stripe webhook handler
│   ├── components/
│   │   ├── landing/                    # Hero, pricing, features, comparison, etc.
│   │   ├── dashboard/                  # Sidebar, connection status
│   │   ├── boards/                     # Kanban board (drag-and-drop)
│   │   ├── ui/                         # UI primitives (button, section, backgrounds)
│   │   └── shared/                     # Logo, mascot
│   └── lib/
│       ├── db/schema.ts                # Drizzle schema (all tables)
│       ├── provisioner.ts              # Docker container lifecycle via SSH
│       ├── env.ts                      # Centralized env var validation
│       ├── stripe.ts                   # Stripe helpers (checkout, portal)
│       ├── rate-limit.ts               # Async rate limiting middleware
│       ├── backup.ts                   # Backup logic (tar + Hetzner S3)
│       ├── shell-sanitize.ts           # Shell injection prevention
│       ├── middleware/auth.ts          # JWT auth middleware
│       ├── auth.ts                     # JWT sign/verify, password hash
│       ├── ssh-exec.ts                 # SSH tunnel to sync daemon
│       ├── logger.ts                   # Sanitized logging (redacts secrets)
│       └── constants.ts               # Plans, features, nav links
├── docker/scripts/
│   ├── openclaw-sync.mjs              # OpenClaw sync daemon
│   ├── hermes-sync.mjs                # Hermes sync daemon
│   └── openclaw-seccomp.json          # Container seccomp profile
└── drizzle/migrations/                 # Auto-generated SQL migrations
```

---

## Database Schema

All tables live in Neon PostgreSQL, managed via Drizzle ORM (`src/lib/db/schema.ts`).

### Core Tables

**`users`** — Platform accounts

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| email | text | Unique |
| passwordHash | text | bcrypt (12 rounds) |
| name | text | Display name |
| plan | enum | `hobby` / `pro` / `teams` |
| stripeCustomerId | text | Stripe customer ID |
| stripeSubscriptionId | text | Stripe subscription ID |
| failedLoginAttempts | int | Account lockout (max 5) |
| lockedUntil | timestamp | Lockout expiry |

**`instances`** — Deployed agent containers

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| userId | UUID | FK to users |
| name | text | Instance name (DNS-safe, globally unique) |
| status | enum | `provisioning` / `running` / `stopped` / `error` |
| agentFramework | enum | `openclaw` / `hermes` |
| agentPort, ttydPort, mcPort | int | Allocated ports (unique indexes) |
| containerName | text | Docker container name |
| mcAuthToken | text | Auth token for sync daemon |
| terminalToken | text | Token for ttyd access |
| llmProvider, llmModel | text | User's chosen AI model |

### Mission Control Tables

| Table | Purpose |
|-------|---------|
| `mc_agents` | Agent status, role, task count, CPU/memory stats |
| `mc_boards` | Kanban boards per instance |
| `mc_board_groups` | Board grouping/organization |
| `mc_tasks` | Tasks with workflow: `inbox` → `todo` → `in_progress` → `review` → `done` |
| `mc_activity` | Activity feed entries |
| `mc_approvals` | Approval queue: `pending` → `approved` / `denied` |
| `mc_tags` | Tags for organizing tasks (unique per instance) |
| `mc_custom_fields` | Custom metadata fields per instance |

### Other Tables

| Table | Purpose |
|-------|---------|
| `backups` | Backup records with status and storage path |
| `activity_logs` | Instance lifecycle events (deploy, restart, etc.) |
| `password_reset_tokens` | Time-limited password reset tokens |

### Making Schema Changes

```bash
# 1. Edit src/lib/db/schema.ts
# 2. Generate migration
npm run db:generate
# 3. Apply migration
npm run db:migrate
```

---

## API Reference

All API routes require `Authorization: Bearer <token>` except auth and webhook endpoints. All mutating routes have rate limiting.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, get JWT (lockout after 5 failures) |
| POST | `/api/auth/refresh` | Refresh JWT token |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |

### Instances

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/instances` | List user's instances |
| POST | `/api/instances` | Create instance (requires active subscription, picks openclaw or hermes) |
| GET | `/api/instances/:id` | Get instance details |
| PATCH | `/api/instances/:id` | Update instance (name, LLM config) |
| DELETE | `/api/instances/:id` | Delete instance + cleanup (rejects if still provisioning) |
| POST | `/api/instances/:id/start` | Start stopped instance |
| POST | `/api/instances/:id/stop` | Stop running instance |
| POST | `/api/instances/:id/restart` | Restart instance |
| POST | `/api/instances/:id/reprovision` | Full reprovisioning with updated config |
| GET | `/api/instances/:id/stats` | Live CPU/memory/network stats |
| POST | `/api/instances/:id/diagnose` | Run diagnostic checks |
| POST | `/api/instances/:id/deploy-sync` | Deploy sync daemon |
| POST | `/api/instances/:id/update-sync` | Update sync daemon script |

### Mission Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/mission-control/agents` | List / create agents |
| GET/PUT/DELETE | `/api/mission-control/agents/:id` | Agent CRUD |
| GET/POST | `/api/mission-control/boards` | List / create boards |
| GET/PUT/DELETE | `/api/mission-control/boards/:id` | Board CRUD |
| GET | `/api/mission-control/boards/:id/tasks` | List tasks in board |
| GET/PATCH/DELETE | `/api/mission-control/tasks/:id` | Task CRUD (PATCH auto-dispatches on status change) |
| POST | `/api/mission-control/tasks/:id/dispatch` | Dispatch task to agent |
| GET/POST | `/api/mission-control/tags` | Tag management |
| GET/POST | `/api/mission-control/custom-fields` | Custom field management |
| GET/POST | `/api/mission-control/activity` | Activity feed |
| GET | `/api/mission-control/dashboard` | Dashboard metrics |
| GET | `/api/mission-control/agent/status` | Agent framework health check |
| POST | `/api/mission-control/agent/chat` | Send message to agent |
| GET | `/api/mission-control/agent/sessions` | List agent sessions |

### Billing & Backups

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing` | Get subscription status |
| POST | `/api/billing` | Create checkout or portal session (`action: "checkout" | "portal"`) |
| GET | `/api/backups` | List backups |
| POST | `/api/backups` | Create backup |
| POST | `/api/backups/:id/restore` | Restore from backup |

---

## Key Systems

### 1. Instance Provisioning (`src/lib/provisioner.ts`)

The provisioning engine handles the full lifecycle of user containers on the Hetzner server via SSH:

1. **Port allocation** — atomic `UPDATE` with `MAX(port) + 10` stride. Unique constraints prevent collisions. Retries on conflict.
2. **Container setup** — writes `docker-compose.yml` with the chosen agent framework. Resource limits: 2 CPU, 4GB RAM, 2GB swap, 256 PIDs, seccomp profile, read-only root filesystem.
3. **ttyd service** — systemd service for terminal access via `docker exec`.
4. **Sync daemon** — deploys `openclaw-sync.mjs` or `hermes-sync.mjs` as a systemd service. Bridges agent CLI ↔ Neon DB.
5. **Caddy config** — reverse proxy entries for `{name}.instances.taroagent.com` (agent) and `ttyd-{name}.instances.taroagent.com` (terminal).
6. **Cleanup** — `deleteInstance()` nulls ports, tears down containers, systemd services, and Caddy config.

### 2. Agent Frameworks

| | OpenClaw | Hermes |
|---|---------|--------|
| Image | `alpine/openclaw:2026.3.13-1` | `ghcr.io/outsourc-e/hermes-agent:webapi` |
| Internal port | 18789 | 8642 |
| Config | `openclaw.json` (gateway auth, CORS, plugins) | `config.json` (model, provider) |
| Sync daemon | `openclaw-sync.mjs` | `hermes-sync.mjs` |
| Device pairing | Auto-approve timer | Not needed |
| Composio plugin | Supported | Not supported |

Both frameworks share the same provisioning pipeline, port allocation, and Mission Control integration. The `agentFramework` field on each instance determines which image, config, and sync daemon to use.

### 3. Sync Daemon (`docker/scripts/`)

Runs on the Hetzner server alongside each user container. Provides an HTTP API that Taro calls via SSH tunnel:

- Proxies chat messages to the agent
- Dispatches tasks and monitors completion
- Syncs LLM config from Taro DB to agent config
- Creates agents with roles via agent CLI
- Resolves approval workflows
- Builds Mission Control context summaries

### 4. Container Resources

| Resource | Limit |
|----------|-------|
| CPU | 2 cores |
| RAM | 4 GB |
| Swap | 2 GB (6 GB total) |
| Swappiness | 60 (pages early to avoid OOM cliff) |
| PIDs | 256 |
| V8 Heap | 768 MB (OpenClaw) |
| Filesystem | Read-only root + tmpfs (`/tmp`, `/run`) |
| Security | seccomp profile, no-new-privileges, all caps dropped except NET_BIND_SERVICE |

### 5. Authentication (`src/lib/auth.ts`)

Custom JWT-based auth:

- **Registration**: bcrypt hash (12 rounds), JWT issued (24h expiry)
- **Login**: Rate-limited, account lockout after 5 failed attempts (15-min cooldown)
- **Tokens**: JWT with 24h expiry, refresh tokens with 7d expiry
- **Token refresh**: Dashboard auto-refreshes 5 minutes before expiry

### 6. Security

- **Container isolation**: Docker with `NO_NEW_PRIVILEGES`, `CAP_DROP ALL`, custom seccomp profile
- **Shell sanitization**: `validateShellName()` + `validatePort()` prevent injection in SSH commands
- **No direct container access**: All traffic through Caddy reverse proxy
- **Secrets**: Sync daemon uses optional restricted DB role (`SYNC_DATABASE_URL`)
- **Logging**: `logger.ts` auto-redacts DB URLs, API keys, SSH keys
- **Rate limiting**: Async in-memory sliding window on all mutating endpoints
- **Token auth**: Terminal access requires per-instance `terminalToken`, agent access requires `mcAuthToken`
- **Host hardening**: iptables blocks metadata service (169.254.169.254)

---

## Dashboard Pages

| Page | Path | Description |
|------|------|-------------|
| Overview | `/dashboard` | Instance status, stats cards, recent activity, quick actions |
| Terminal | `/dashboard/terminal` | Web terminal (xterm.js → ttyd) |
| Agents | `/dashboard/agents` | List AI agents, create agents with roles |
| Agent Detail | `/dashboard/agents/:id` | Agent stats, session history |
| Boards | `/dashboard/boards` | Kanban task boards with drag-and-drop |
| Board Groups | `/dashboard/board-groups` | Organize boards into groups |
| Tags | `/dashboard/tags` | Create and manage task tags |
| Custom Fields | `/dashboard/custom-fields` | Define custom metadata fields |
| Live Feed | `/dashboard/live-feed` | Real-time activity stream |
| Guides | `/dashboard/guides` | Getting started walkthroughs |
| Backups | `/dashboard/backups` | Backup list, create, restore |
| Monitoring | `/dashboard/monitoring` | CPU, memory, network charts |
| Integrations | `/dashboard/integrations` | Browse and connect Composio integrations |
| Settings | `/dashboard/settings` | Instance config, LLM provider, danger zone |
| Billing | `/dashboard/billing` | Subscription status, upgrade, invoices |

---

## Coding Conventions

### General

- **TypeScript strict mode** — no `any` unless absolutely necessary
- **`const` by default**, `let` only when reassignment is needed
- **Named exports** (except page components)
- **Absolute imports** via `@/` alias (e.g., `@/lib/utils`)
- **Arrow function components**

### Components

- One component per file
- Props interface named `{ComponentName}Props`
- `cn()` from `@/lib/utils` for conditional class merging
- Server Components by default; `"use client"` only when needed

### API Routes

Every protected route follows this pattern:

```typescript
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, { windowMs: 60_000, max: 10 });
  if (limited) return limited;

  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: ... }, { status: 400 });

  // Business logic...
  return NextResponse.json({ data, message });
}
```

### Database

- Drizzle ORM only — no raw SQL
- Migrations via `npm run db:generate` → `npm run db:migrate`
- All tables have `createdAt` and `updatedAt` timestamps

### Styling

- **Dark-first** — near-black background (`#0a0a0b`)
- **Brand**: Purple/violet (`#8b5cf6`)
- Glassmorphism accents on cards (`backdrop-blur-xl bg-white/5`)
- Framer Motion for all transitions

---

## Git Workflow

```bash
# Branch naming
feat/add-skill-marketplace
fix/terminal-reconnect
chore/update-deps

# Workflow
git checkout -b feat/your-feature
# make changes
git add <files>
git commit -m "add skill marketplace page"
git push -u origin feat/your-feature
# open PR against main
```

- **Branch prefixes**: `feat/`, `fix/`, `chore/`, `refactor/`
- **Commit messages**: imperative mood, concise
- **PR-based workflow** — no direct pushes to `main`
- **Squash merge** PRs

---

## Deployment

### Vercel (Frontend + API)

Push to `main` triggers automatic deployment. Set all env vars in Vercel project settings.

### Hetzner Server (Containers)

The server runs:
- **Caddy** — reverse proxy for `*.instances.taroagent.com` (auto HTTPS via Cloudflare DNS)
- **Docker** — per-user container stacks
- **Sync daemons** — one per instance (systemd services)
- **ttyd services** — one per instance (systemd services)

Key directories:
```
/opt/taro/instances/{name}/     # Docker Compose + config per instance
/opt/taro/backups/{name}/       # Backup storage
/opt/taro/seccomp/              # Container seccomp profiles
/etc/caddy/sites/               # Per-instance Caddy configs
```

---

## Troubleshooting

### Common Issues

**Instance stuck in "provisioning"**
- Diagnose: `POST /api/instances/:id/diagnose`
- SSH check: `ssh root@SERVER_IP docker ps | grep {name}`
- Sync daemon: `systemctl status taro-sync-{name}`

**Terminal not connecting**
- ttyd service: `systemctl status taro-ttyd-{name}`
- Caddy config: `cat /etc/caddy/sites/{name}.caddy`

**Mission Control data not updating**
- Sync daemon logs: `journalctl -u taro-sync-{name} -f`
- Container running: `docker ps | grep {name}`
- Redeploy sync: use dashboard or `POST /api/instances/:id/deploy-sync`

**Stripe webhook not working**
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Local dev: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Useful Server Commands

```bash
ssh root@SERVER_IP

# List running containers
docker ps

# Container logs
docker logs taro-{name}-openclaw -f    # or taro-{name}-hermes

# Sync daemon
systemctl status taro-sync-{name}
journalctl -u taro-sync-{name} -f

# ttyd terminal service
systemctl status taro-ttyd-{name}

# Caddy
systemctl status caddy
systemctl reload caddy

# Port usage
docker ps --format "{{.Names}}: {{.Ports}}"
```

---

## License

Private. All rights reserved.
