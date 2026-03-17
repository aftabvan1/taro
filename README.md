# Taro

Managed OpenClaw hosting platform. Deploy your own AI agent instance in 30 seconds.

## What is Taro?

Taro provides managed infrastructure for running [OpenClaw](https://github.com/openClaw/openClaw) instances. Each user gets an isolated Docker environment with:

- **OpenClaw** — AI agent runtime
- **Web Terminal** — browser-based terminal access via ttyd
- **Mission Control** — agent management dashboard (coming soon)
- **Automated Backups** — scheduled backup and one-click restore
- **Resource Monitoring** — real-time CPU, memory, and network stats

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS v4, Framer Motion
- **Backend**: Next.js API Routes, Drizzle ORM, Neon PostgreSQL
- **Auth**: JWT (bcrypt + jsonwebtoken)
- **Infrastructure**: Hetzner Cloud, Docker Compose, Caddy reverse proxy
- **Provisioning**: SSH-based (node-ssh) automated container deployment

## Architecture

```
Taro App (Vercel)
  |
  |-- API Routes (/api/instances, /api/backups, /api/auth, /api/activity)
  |-- Dashboard (React SPA)
  |
  v
Neon PostgreSQL (users, instances, backups, activity_logs)
  |
  v
Hetzner Server (Docker + Caddy)
  |-- Per-user Docker Compose stack:
  |     - alpine/openclaw (AI agent)
  |     - tsl0922/ttyd (web terminal)
  |     - postgres:16-alpine (MC database)
  |-- Caddy reverse proxy (*.instances.taroagent.com)
```

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) database (free tier works)
- A [Hetzner Cloud](https://console.hetzner.cloud) server (CPX11 ~$5.59/mo)

### Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in credentials
cp .env.example .env

# Generate and run database migrations
npm run db:generate
npm run db:migrate

# Bootstrap the Hetzner server (run once)
ssh root@YOUR_SERVER_IP 'bash -s' < scripts/setup-server.sh

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Random 64-char hex string for JWT signing |
| `HETZNER_API_TOKEN` | Hetzner Cloud API token |
| `HETZNER_SERVER_IP` | IP address of your Hetzner server |
| `HETZNER_SSH_PRIVATE_KEY` | SSH private key for server access |
| `NEXT_PUBLIC_APP_URL` | App URL (http://localhost:3000 for dev) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Drizzle migrations from schema |
| `npm run db:migrate` | Apply migrations to database |
| `npm run db:studio` | Open Drizzle Studio (DB browser) |

## Project Structure

```
src/
  app/
    api/                    # API routes
      auth/                 # Register, login
      instances/            # CRUD + start/stop/restart/stats
      backups/              # Create, list, restore
      activity/             # Activity logs
      mission-control/      # MC API proxy
    dashboard/              # Dashboard pages
      agents/               # AI agent management
      backups/              # Backup management
      billing/              # Plan & billing
      boards/               # Task boards
      monitoring/           # Resource monitoring
      settings/             # Instance settings
      terminal/             # Web terminal
  components/
    dashboard/              # Dashboard components (sidebar)
    landing/                # Landing page components
    shared/                 # Shared components (logo)
    ui/                     # UI primitives (button, section)
  lib/
    db/                     # Database schema & connection
    mission-control/        # MC client & types
    middleware/              # Auth middleware
    auth.ts                 # JWT helpers
    provisioner.ts          # Docker provisioning engine
    hetzner.ts              # Hetzner Cloud API client
    caddy.ts                # Caddy config management
    backup.ts               # Backup engine
    activity.ts             # Activity logging
    constants.ts            # Plans, features, nav links
    utils.ts                # cn() utility
scripts/
  setup-server.sh           # Hetzner server bootstrap
drizzle/
  migrations/               # SQL migration files
```

## Pricing Tiers

| Plan | Price | Resources |
|------|-------|-----------|
| Hobby | $5/mo | 1 vCPU, 2GB RAM, daily backups |
| Pro | $15/mo | 2 vCPU, 4GB RAM, hourly backups, monitoring |
| Teams | $49/mo | 4 vCPU, 8GB RAM, continuous backups, SSO |

## License

Private. All rights reserved.
