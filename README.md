# Taro

**Managed OpenClaw Hosting with Mission Control**

Deploy your own AI agent instance in 30 seconds. Get the container AND the cockpit — not just a terminal.

---

## Table of Contents

- [What is Taro?](#what-is-taro)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
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

Taro is the only managed OpenClaw hosting platform with a built-in Mission Control dashboard. While competitors give you a container and a terminal, Taro gives you:

- **OpenClaw Instance** — AI agent runtime in an isolated Docker container
- **Mission Control** — agent management, kanban task boards, approval workflows, activity timelines
- **Web Terminal** — browser-based terminal access via xterm.js + ttyd
- **Automated Backups** — scheduled backup and one-click restore
- **Resource Monitoring** — real-time CPU, memory, and network stats
- **Integrations** — 850+ tool integrations via Composio

### Pricing Tiers

| Plan | Price | Resources | Key Features |
|------|-------|-----------|--------------|
| Hobby | $5/mo | 1 vCPU, 2GB RAM | Terminal, daily backups, agent overview, task boards |
| Pro | $14/mo | 2 vCPU, 4GB RAM | + Monitoring, hourly backups, activity timeline, approvals |
| Teams | $49/mo | 4 vCPU, 8GB RAM | + Continuous backups, SSO, audit logs, org management |

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
          │  - users        │     └──────────────────┘  │  178.x.x.x  │
          │  - instances    │                           │              │
          │  - backups      │          SSH tunnel       │  Per-user:   │
          │  - mc_agents    │  ◄────────────────────►   │  ┌────────┐ │
          │  - mc_boards    │                           │  │OpenClaw│ │
          │  - mc_tasks     │                           │  │ttyd    │ │
          │  - mc_activity  │                           │  │Postgres│ │
          │  - mc_approvals │                           │  │Sync    │ │
          └─────────────────┘                           │  └────────┘ │
                                                        │  Caddy proxy│
                                                        └──────────────┘
```

### How it all connects

1. **Vercel** hosts the Next.js app (frontend + API routes)
2. **Neon PostgreSQL** stores all platform data (users, instances, Mission Control state)
3. **Hetzner Server** runs user containers (OpenClaw + ttyd + Postgres per instance)
4. **Caddy** reverse proxies `*.instances.taro.sh` to the right container with automatic HTTPS
5. **Sync Daemon** (Node.js on Hetzner) bridges OpenClaw ↔ Neon DB for Mission Control features
6. API routes SSH into Hetzner to provision/manage containers and communicate with sync daemons

---

## Getting Started

### Prerequisites

- **Node.js 20+** and **npm**
- A [Neon](https://neon.tech) PostgreSQL database (free tier works for dev)
- A [Stripe](https://stripe.com) account with a subscription product created
- A [Hetzner Cloud](https://console.hetzner.cloud) server (CPX11 ~$5.59/mo minimum)
- A [Resend](https://resend.com) account for transactional email
- (Optional) A [Composio](https://composio.dev) API key for integrations

### Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/aftabvan1/taro.git
cd taro

# 2. Install dependencies
npm install

# 3. Copy env file and fill in your credentials (see Environment Variables below)
cp .env.example .env

# 4. Generate and run database migrations
npm run db:generate
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

This installs:
- Docker Engine + Compose v2
- Caddy (reverse proxy with automatic HTTPS)
- UFW firewall (ports 22, 80, 443 only)
- Directory structure at `/opt/taro/instances/` and `/opt/taro/backups/`

After running, set the `CLOUDFLARE_API_TOKEN` on the server for wildcard TLS:
```bash
# On the Hetzner server:
echo "CLOUDFLARE_API_TOKEN=your_token_here" > /etc/caddy/environment
systemctl restart caddy
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in these values:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `SYNC_DATABASE_URL` | No | Restricted-role DB URL for sync daemons (falls back to DATABASE_URL) |
| `JWT_SECRET` | Yes | Random 64-char hex string for JWT signing. Generate with: `openssl rand -hex 32` |
| `HETZNER_API_TOKEN` | Yes | Hetzner Cloud API token (from console) |
| `HETZNER_SERVER_IP` | Yes | IP address of your Hetzner server |
| `HETZNER_SSH_PRIVATE_KEY` | Yes | SSH private key for server access (paste the full key) |
| `INSTANCE_DOMAIN` | Yes | Domain for instance subdomains (e.g., `instances.taro.sh`) |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (`sk_test_...` for dev) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_ID` | Yes | Stripe Price ID for the subscription product |
| `STRIPE_PORTAL_CONFIG_ID` | No | Stripe billing portal configuration ID |
| `RESEND_API_KEY` | Yes | Resend API key for email |
| `FROM_EMAIL` | Yes | Sender email address (e.g., `Taro <noreply@taro.sh>`) |
| `COMPOSIO_API_KEY` | No | Composio API key for third-party integrations |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL (`http://localhost:3000` for dev) |
| `NEXT_PUBLIC_INSTANCE_DOMAIN` | Yes | Instance domain (public, same as INSTANCE_DOMAIN) |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on :3000 |
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
├── .env.example                    # Environment variable template
├── package.json                    # Dependencies and scripts
├── next.config.ts                  # Next.js config (security headers, CSP)
├── tsconfig.json                   # TypeScript config (strict, @/ alias)
├── drizzle.config.ts               # Drizzle ORM config
├── middleware.ts                   # Global auth middleware (JWT on /api/*)
├── postcss.config.mjs              # PostCSS config
├── eslint.config.mjs               # ESLint config
│
├── public/                         # Static assets
│   ├── logo.svg
│   └── og-image.png
│
├── scripts/
│   └── setup-server.sh             # Hetzner server bootstrap script
│
├── docker/
│   └── scripts/
│       └── openclaw-sync.mjs       # Sync daemon (bridges OpenClaw ↔ Neon DB)
│
├── drizzle/
│   └── migrations/                 # Auto-generated SQL migrations
│
└── src/
    ├── app/
    │   ├── layout.tsx              # Root layout (fonts, providers, metadata)
    │   ├── page.tsx                # Landing page
    │   ├── login/page.tsx          # Login page
    │   ├── signup/page.tsx         # Signup page
    │   ├── forgot-password/page.tsx
    │   ├── reset-password/page.tsx
    │   │
    │   ├── dashboard/              # Dashboard (auth-gated)
    │   │   ├── layout.tsx          # Sidebar + top bar + auth guard + context
    │   │   ├── page.tsx            # Overview (stats, activity, quick actions)
    │   │   ├── terminal/page.tsx   # Web terminal (xterm.js iframe)
    │   │   ├── agents/page.tsx     # Agent list & management
    │   │   ├── agents/[id]/page.tsx # Agent detail view
    │   │   ├── boards/page.tsx     # Kanban task boards (drag & drop)
    │   │   ├── board-groups/page.tsx
    │   │   ├── tags/page.tsx       # Tag management
    │   │   ├── custom-fields/page.tsx
    │   │   ├── activity/page.tsx   # Activity timeline
    │   │   ├── live-feed/page.tsx  # Live activity feed
    │   │   ├── backups/page.tsx    # Backup management
    │   │   ├── monitoring/page.tsx # Resource charts
    │   │   ├── integrations/page.tsx # Composio integrations
    │   │   ├── settings/page.tsx   # Instance settings
    │   │   └── billing/page.tsx    # Subscription & billing
    │   │
    │   └── api/
    │       ├── auth/               # Authentication
    │       │   ├── register/route.ts
    │       │   ├── login/route.ts
    │       │   ├── refresh/route.ts
    │       │   ├── forgot-password/route.ts
    │       │   └── reset-password/route.ts
    │       │
    │       ├── instances/          # Instance CRUD & lifecycle
    │       │   ├── route.ts        # GET list, POST create
    │       │   └── [id]/
    │       │       ├── route.ts    # GET, PATCH, DELETE
    │       │       ├── start/route.ts
    │       │       ├── stop/route.ts
    │       │       ├── restart/route.ts
    │       │       ├── reprovision/route.ts
    │       │       ├── stats/route.ts
    │       │       ├── diagnose/route.ts
    │       │       ├── seed/route.ts
    │       │       ├── deploy-sync/route.ts
    │       │       └── update-sync/route.ts
    │       │
    │       ├── mission-control/    # Mission Control API
    │       │   ├── agents/route.ts
    │       │   ├── agents/[id]/route.ts
    │       │   ├── boards/route.ts
    │       │   ├── boards/[id]/route.ts
    │       │   ├── boards/[id]/tasks/route.ts
    │       │   ├── board-groups/route.ts
    │       │   ├── board-groups/[id]/route.ts
    │       │   ├── tasks/[id]/route.ts
    │       │   ├── tasks/[id]/dispatch/route.ts
    │       │   ├── tasks/[id]/tags/route.ts
    │       │   ├── tags/route.ts
    │       │   ├── tags/[id]/route.ts
    │       │   ├── custom-fields/route.ts
    │       │   ├── custom-fields/[id]/route.ts
    │       │   ├── activity/route.ts
    │       │   ├── dashboard/route.ts
    │       │   ├── openclaw/status/route.ts
    │       │   ├── openclaw/sessions/route.ts
    │       │   ├── openclaw/sessions/[sessionId]/route.ts
    │       │   ├── openclaw/chat/route.ts
    │       │   └── openclaw/mc-context/route.ts
    │       │
    │       ├── backups/route.ts
    │       ├── backups/[id]/restore/route.ts
    │       ├── billing/route.ts
    │       ├── activity/route.ts
    │       ├── integrations/route.ts
    │       ├── integrations/connected/route.ts
    │       ├── account/change-password/route.ts
    │       ├── account/delete/route.ts
    │       └── webhooks/stripe/route.ts
    │
    ├── components/
    │   ├── landing/                # Landing page sections
    │   │   ├── hero.tsx
    │   │   ├── navbar.tsx
    │   │   ├── pricing.tsx
    │   │   ├── features-grid.tsx
    │   │   ├── mission-control.tsx
    │   │   ├── integrations.tsx
    │   │   ├── problem-solution.tsx
    │   │   ├── terminal-demo.tsx
    │   │   ├── testimonials.tsx
    │   │   ├── cta-section.tsx
    │   │   ├── footer.tsx
    │   │   └── logos.tsx
    │   │
    │   ├── dashboard/
    │   │   ├── sidebar.tsx         # Navigation sidebar
    │   │   └── connection-status.tsx
    │   │
    │   ├── boards/                 # Kanban board components
    │   │   ├── droppable-column.tsx
    │   │   ├── draggable-task-card.tsx
    │   │   └── task-detail-modal.tsx
    │   │
    │   ├── ui/                     # UI primitives
    │   │   ├── button.tsx
    │   │   ├── section.tsx
    │   │   ├── hero-modern.tsx
    │   │   ├── boba-background.tsx
    │   │   ├── card-with-lines-pattern.tsx
    │   │   └── icon-map.tsx
    │   │
    │   ├── shared/
    │   │   ├── logo.tsx
    │   │   └── taro-mascot.tsx
    │   │
    │   └── providers.tsx           # Theme provider (next-themes)
    │
    └── lib/
        ├── db/
        │   ├── schema.ts           # Drizzle schema (all tables)
        │   ├── index.ts            # Database connection
        │   └── migrations/
        │
        ├── middleware/
        │   └── auth.ts             # authenticate() helper for API routes
        │
        ├── mission-control/
        │   └── validation.ts       # Zod schemas for MC entities
        │
        ├── auth.ts                 # JWT sign/verify, password hash/verify
        ├── provisioner.ts          # Docker provisioning engine (~610 lines)
        ├── ssh-exec.ts             # SSH tunnel to sync daemon
        ├── hetzner.ts              # Hetzner Cloud API client
        ├── stripe.ts               # Stripe helpers (checkout, portal)
        ├── backup.ts               # Backup engine (tar + Docker)
        ├── activity.ts             # Activity logging to DB
        ├── email.ts                # Transactional email (Resend)
        ├── logger.ts               # Sanitized logging (redacts secrets)
        ├── rate-limit.ts           # In-memory sliding window rate limiter
        ├── shell-sanitize.ts       # Shell injection prevention
        ├── constants.ts            # Plans, features, nav links, testimonials
        ├── status-config.ts        # Instance/agent status styling
        ├── format.ts               # Date, byte, time formatters
        ├── animation-variants.ts   # Framer Motion variants
        └── utils.ts                # cn() class merge utility
```

---

## Database Schema

All tables live in Neon PostgreSQL, managed via Drizzle ORM.

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
| failedLoginAttempts | int | For account lockout (max 5) |
| lockedUntil | timestamp | Lockout expiry |

**`instances`** — User OpenClaw instances
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| userId | UUID | FK to users |
| name | text | Instance name (DNS-safe) |
| status | enum | `provisioning` / `running` / `stopped` / `error` |
| region | text | Deployment region |
| serverIp | text | Hetzner server IP |
| openclawPort, ttydPort, mcPort | int | Allocated ports |
| containerName | text | Docker container name |
| mcAuthToken | text | Auth token for sync daemon |
| terminalToken | text | Token for ttyd access |
| llmProvider, llmModel | text | User's chosen AI provider/model |

### Mission Control Tables

| Table | Purpose |
|-------|---------|
| `mc_agents` | Agent status, role, task count, CPU/memory stats |
| `mc_boards` | Kanban boards per instance |
| `mc_board_groups` | Board grouping/organization |
| `mc_tasks` | Tasks with status workflow: `inbox` > `todo` > `in_progress` > `review` > `done` |
| `mc_activity` | Activity feed entries |
| `mc_approvals` | Approval queue: `pending` > `approved` / `denied` |
| `mc_tags` | Tags for organizing tasks |
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

All API routes require `Authorization: Bearer <token>` except auth and webhook endpoints.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account (rate-limited) |
| POST | `/api/auth/login` | Login, get JWT (rate-limited, lockout after 5 failures) |
| POST | `/api/auth/refresh` | Refresh JWT token |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |

### Instances

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/instances` | List user's instances |
| POST | `/api/instances` | Create instance (requires active subscription) |
| GET | `/api/instances/:id` | Get instance details |
| PATCH | `/api/instances/:id` | Update instance (name, LLM config) |
| DELETE | `/api/instances/:id` | Delete instance + cleanup containers |
| POST | `/api/instances/:id/start` | Start stopped instance |
| POST | `/api/instances/:id/stop` | Stop running instance |
| POST | `/api/instances/:id/restart` | Restart instance |
| POST | `/api/instances/:id/reprovision` | Full reprovisioning |
| GET | `/api/instances/:id/stats` | Live CPU/memory/network stats |
| POST | `/api/instances/:id/diagnose` | Run diagnostic checks |
| POST | `/api/instances/:id/seed` | Seed Mission Control demo data |
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
| GET/PUT/DELETE | `/api/mission-control/tasks/:id` | Task CRUD |
| POST | `/api/mission-control/tasks/:id/dispatch` | Dispatch task to agent |
| GET/POST | `/api/mission-control/tags` | Tag management |
| GET/POST | `/api/mission-control/custom-fields` | Custom field management |
| GET | `/api/mission-control/activity` | Activity feed |
| GET | `/api/mission-control/dashboard` | Dashboard metrics |
| GET | `/api/mission-control/openclaw/status` | OpenClaw health check |
| POST | `/api/mission-control/openclaw/chat` | Send message to agent |
| GET | `/api/mission-control/openclaw/sessions` | List agent sessions |

### Billing & Backups

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing` | Get subscription status |
| POST | `/api/billing` | Create checkout session or portal session |
| GET | `/api/backups` | List backups for instance |
| POST | `/api/backups` | Create backup |
| POST | `/api/backups/:id/restore` | Restore from backup |

---

## Key Systems

### 1. Instance Provisioning (`src/lib/provisioner.ts`)

The provisioning engine handles the full lifecycle of user containers on the Hetzner server via SSH:

1. **Port allocation** — Each instance gets 10 consecutive ports (base 10000, stride 10). Collision-safe across concurrent provisions.
2. **Container setup** — Writes `docker-compose.yml` with OpenClaw, ttyd, and Postgres containers. Applies resource limits (CPU, memory, PID caps).
3. **ttyd service** — Creates a systemd service for ttyd (terminal access via `docker exec`).
4. **Sync daemon** — Deploys the `openclaw-sync.mjs` Node.js script as a systemd service. This daemon bridges OpenClaw CLI commands with the Neon database.
5. **Caddy config** — Adds reverse proxy entries for `{name}.instances.taro.sh` (terminal) and `mc-{name}.instances.taro.sh` (sync API).

### 2. Sync Daemon (`docker/scripts/openclaw-sync.mjs`)

Runs on the Hetzner server alongside each user container. Provides an HTTP API that Taro's API routes call via SSH tunnel:

- Proxies chat messages to OpenClaw agent
- Dispatches tasks and monitors completion
- Syncs LLM provider config from Taro DB to OpenClaw config
- Creates agents with roles via OpenClaw CLI
- Resolves approval workflows
- Builds Mission Control state summaries for context injection

### 3. Authentication (`src/lib/auth.ts`)

Custom JWT-based auth:

- **Registration**: bcrypt hash (12 rounds), JWT issued (24h expiry)
- **Login**: Rate-limited, account lockout after 5 failed attempts (15-min cooldown)
- **Tokens**: JWT with 24h expiry, refresh tokens with 7d expiry
- **Token refresh**: Dashboard auto-refreshes 5 minutes before expiry
- **Middleware**: Global middleware in `middleware.ts` enforces auth on all `/api/*` routes except public paths

### 4. Mission Control

Mission Control data lives in Neon (not inside user containers). Dashboard pages query Neon directly via API routes. For operations that need to talk to OpenClaw (dispatching tasks, sending chat messages), API routes SSH into Hetzner and call the sync daemon's HTTP API.

**Task dispatch flow:**
1. User dispatches task from kanban board -> API calls sync daemon
2. Sync daemon builds structured prompt with MC context
3. Sync daemon runs `openclaw agent --message "..." --json`
4. On completion, sync daemon updates task status in Neon
5. Dashboard polls and shows updated status

### 5. Security

- **Container isolation**: Docker with NO_NEW_PRIVILEGES, CAP_DROP ALL
- **Shell sanitization**: `validateShellName()` enforces DNS-safe names, `validatePort()` validates port ranges
- **No direct container access**: All traffic goes through Caddy reverse proxy
- **Secrets**: Sync daemon uses optional restricted DB role (`SYNC_DATABASE_URL`)
- **Logging**: `logger.ts` automatically redacts DB URLs, API keys, SSH keys from logs
- **CSP**: Strict Content-Security-Policy in `next.config.ts`
- **Rate limiting**: In-memory sliding window on auth endpoints

---

## Dashboard Pages

| Page | Path | Description |
|------|------|-------------|
| Overview | `/dashboard` | Instance status, stats cards, recent activity, quick actions |
| Terminal | `/dashboard/terminal` | Web terminal (xterm.js iframe pointing to ttyd) |
| Agents | `/dashboard/agents` | List AI agents, create new agents with roles |
| Agent Detail | `/dashboard/agents/:id` | Agent stats, session history |
| Boards | `/dashboard/boards` | Kanban task boards with drag-and-drop |
| Board Groups | `/dashboard/board-groups` | Organize boards into groups |
| Tags | `/dashboard/tags` | Create and manage tags |
| Custom Fields | `/dashboard/custom-fields` | Define custom metadata fields for tasks |
| Activity | `/dashboard/activity` | Activity timeline |
| Live Feed | `/dashboard/live-feed` | Real-time activity updates |
| Backups | `/dashboard/backups` | Backup list, create backup, restore |
| Monitoring | `/dashboard/monitoring` | CPU, memory, network charts |
| Integrations | `/dashboard/integrations` | Browse and connect Composio integrations |
| Settings | `/dashboard/settings` | Instance config, LLM provider, danger zone |
| Billing | `/dashboard/billing` | Subscription status, upgrade, invoices |

---

## Coding Conventions

### General Rules

- **TypeScript strict mode** — no `any` unless absolutely necessary
- **`const` by default**, `let` only when reassignment is needed
- **Named exports** (except page components which use default export)
- **Absolute imports** via `@/` alias (e.g., `@/lib/utils`, `@/components/ui/button`)
- **Arrow function components** — all components are functional

### Components

- One component per file
- Props interface defined above the component, named `{ComponentName}Props`
- Use `cn()` from `@/lib/utils` for conditional class merging
- Server Components by default; add `"use client"` only when needed
- Framer Motion for animations (variants in `@/lib/animation-variants.ts`)

### API Routes

- Validate input with Zod schemas
- Return consistent JSON: `{ data?, error?, message? }`
- Call `authenticate(request)` at the top of every protected route
- Use proper HTTP status codes (200, 400, 401, 403, 404, 500)
- Log errors via `logger.error()` (auto-redacts secrets)

### Database

- Drizzle ORM only — no raw SQL
- Migrations auto-generated via `npm run db:generate`
- All tables have `createdAt` and `updatedAt` timestamps
- Schema lives in `src/lib/db/schema.ts`

### Styling

- **Dark-first** design — near-black background (`#0a0a0b`)
- **Fonts**: Nunito (body), Fredoka (headings), Geist Mono (code/terminal)
- **Brand color**: Purple (`#9B7EC8`)
- **Accent**: Amber/bronze (`#D4A574`)
- Glassmorphism accents on cards (`backdrop-blur-xl bg-white/5`)

---

## Git Workflow

```bash
# Branch naming
feat/add-skill-marketplace
fix/terminal-reconnect
chore/update-deps
refactor/extract-auth-middleware

# Create a feature branch
git checkout -b feat/your-feature

# Make changes, commit
git add .
git commit -m "feat: add skill marketplace page"

# Push and create PR
git push -u origin feat/your-feature
# Create PR against main
```

- **Branch prefixes**: `feat/`, `fix/`, `chore/`, `refactor/`
- **Commit messages**: Imperative mood, lowercase (e.g., `feat: add pricing section`)
- **PR-based workflow** — no direct pushes to `main`
- **Squash merge** PRs

---

## Deployment

### Vercel (Frontend + API)

The app is deployed on Vercel. Push to `main` triggers automatic deployment.

Set all environment variables in Vercel's project settings (Settings > Environment Variables).

### Hetzner Server (Containers)

The server runs:
- **Caddy** — reverse proxy for `*.instances.taro.sh` (automatic HTTPS)
- **Docker** — per-user container stacks
- **Sync daemons** — one per instance (systemd services)
- **ttyd services** — one per instance (systemd services)

Key directories on the server:
```
/opt/taro/instances/{name}/     # Per-instance Docker Compose + config
/opt/taro/backups/              # Backup storage
/opt/taro/sync/{name}/          # Sync daemon scripts
/etc/caddy/Caddyfile            # Caddy reverse proxy config
```

### DNS (Namecheap)

| Type | Host | Value |
|------|------|-------|
| A | `*.instances` | Hetzner server IP |
| A | `@` | Vercel IP |
| CNAME | `www` | `cname.vercel-dns.com` |

---

## Troubleshooting

### Common Issues

**"Instance stuck in provisioning"**
- Use the diagnose endpoint: `POST /api/instances/:id/diagnose`
- Check if the Hetzner server is reachable: `ssh root@SERVER_IP`
- Check Docker on the server: `docker ps`
- Check sync daemon: `systemctl status taro-sync-{name}`

**"Terminal not connecting"**
- Verify ttyd service: `systemctl status taro-ttyd-{name}` on the server
- Check Caddy config: `cat /etc/caddy/Caddyfile` — should have an entry for `{name}.instances.taro.sh`

**"Mission Control data not updating"**
- Check sync daemon logs: `journalctl -u taro-sync-{name} -f`
- Verify OpenClaw is running: `docker ps | grep {name}`
- Re-deploy sync daemon via dashboard or API

**"Database migration failed"**
- Ensure `DATABASE_URL` is correct in `.env`
- Run `npm run db:generate` to regenerate migration files
- Check Drizzle Studio: `npm run db:studio`

**"Stripe webhook not working"**
- Verify `STRIPE_WEBHOOK_SECRET` matches the webhook in Stripe Dashboard
- For local dev, use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Useful Server Commands

```bash
# SSH into the server
ssh root@SERVER_IP

# List all running containers
docker ps

# View container logs
docker logs taro-{name}-openclaw -f

# Check sync daemon status/logs
systemctl status taro-sync-{name}
journalctl -u taro-sync-{name} -f

# Check Caddy status
systemctl status caddy

# Reload Caddy config
caddy reload --config /etc/caddy/Caddyfile

# Check allocated ports
docker ps --format "{{.Names}}: {{.Ports}}"
```

---

## License

Private. All rights reserved.
