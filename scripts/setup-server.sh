#!/usr/bin/env bash
# Taro — Hetzner Server Bootstrap Script
# Run this ON the Hetzner CX21 server as root:
#   ssh root@YOUR_SERVER_IP 'bash -s' < scripts/setup-server.sh

set -euo pipefail

echo "==> Taro Server Setup"
echo "==> Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ─── Docker Engine + Compose v2 ────────────────────────────────────────────────
echo "==> Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "    Docker already installed: $(docker --version)"
fi

# Verify Docker Compose v2
docker compose version || {
  echo "ERROR: Docker Compose v2 not available"
  exit 1
}

# ─── Caddy ──────────────────────────────────────────────────────────────────────
echo "==> Installing Caddy..."
if ! command -v caddy &>/dev/null; then
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
else
  echo "    Caddy already installed: $(caddy version)"
fi

# ─── Directory Structure ────────────────────────────────────────────────────────
echo "==> Creating Taro directories..."
mkdir -p /opt/taro/instances
mkdir -p /opt/taro/backups
chmod 700 /opt/taro
chmod 700 /opt/taro/instances
chmod 700 /opt/taro/backups

# ─── Initial Caddyfile ──────────────────────────────────────────────────────────
echo "==> Writing initial Caddyfile..."
cat > /etc/caddy/Caddyfile << 'CADDYEOF'
# Taro — Reverse proxy for user instances
# Managed automatically by Taro provisioner
# Do not edit manually

# Fallback for unmatched subdomains
*.instances.taroagent.com {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
    respond "Instance not found" 404
}
CADDYEOF

# ─── Firewall ───────────────────────────────────────────────────────────────────
echo "==> Configuring firewall..."
apt-get install -y -qq ufw

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# SSH
ufw allow 22/tcp

# HTTP + HTTPS (Caddy)
ufw allow 80/tcp
ufw allow 443/tcp

# Block direct access to container ports (10000-65535)
# Caddy proxies all traffic — no direct container access needed

ufw --force enable
echo "    Firewall configured: SSH (22), HTTP (80), HTTPS (443) allowed"

# ─── System Tuning ──────────────────────────────────────────────────────────────
echo "==> Applying system tweaks..."

# Increase file descriptor limits for Docker containers
cat > /etc/security/limits.d/taro.conf << 'EOF'
* soft nofile 65536
* hard nofile 65536
EOF

# Enable Docker log rotation
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker

# ─── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "==> Taro server setup complete!"
echo "    Docker:  $(docker --version)"
echo "    Compose: $(docker compose version)"
echo "    Caddy:   $(caddy version)"
echo "    Dirs:    /opt/taro/instances, /opt/taro/backups"
echo "    Firewall: SSH(22), HTTP(80), HTTPS(443)"
echo ""
echo "Next steps:"
echo "  1. Point *.instances.taroagent.com DNS (A record) to this server's IP"
echo "  2. Set CLOUDFLARE_API_TOKEN in /etc/caddy/environment for wildcard TLS"
echo "  3. Update your Taro .env with this server's IP"
