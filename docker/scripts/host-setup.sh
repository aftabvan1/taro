#!/bin/bash
# Taro Host Server Setup Script
# Run once on each Hetzner server to configure memory optimization and security
# Usage: sudo bash host-setup.sh

set -euo pipefail

echo "=== Taro Host Setup ==="

# ─── zram (compressed swap in RAM) ───────────────────────────────────────────
# Provides 30-50% more effective memory via compression
# Critical for container density on 16GB-64GB servers
echo "[1/6] Configuring zram..."
if ! lsmod | grep -q zram; then
  modprobe zram
  echo "zram" >> /etc/modules-load.d/zram.conf
fi

# Size zram at 25% of total RAM (conservative, good compression ratio)
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
ZRAM_SIZE_KB=$((TOTAL_RAM_KB / 4))
ZRAM_SIZE_MB=$((ZRAM_SIZE_KB / 1024))

# Reset zram device if already configured
swapoff /dev/zram0 2>/dev/null || true
echo 1 > /sys/block/zram0/reset 2>/dev/null || true

echo lz4 > /sys/block/zram0/comp_algorithm
echo "${ZRAM_SIZE_MB}M" > /sys/block/zram0/disksize
mkswap /dev/zram0
swapon -p 100 /dev/zram0

echo "  zram configured: ${ZRAM_SIZE_MB}MB with lz4 compression"

# ─── KSM (Kernel Same-page Merging) ─────────────────────────────────────────
# Deduplicates identical memory pages across containers running the same image
# 30-50% memory savings for identical OpenClaw containers
echo "[2/6] Enabling KSM..."
echo 1 > /sys/kernel/mm/ksm/run
echo 2000 > /sys/kernel/mm/ksm/pages_to_scan
echo 20 > /sys/kernel/mm/ksm/sleep_millisecs

# Persist KSM settings
cat > /etc/sysctl.d/90-taro-ksm.conf << 'EOF'
# KSM is enabled via /sys/kernel/mm/ksm/run at boot
EOF

echo "  KSM enabled: scanning 2000 pages per 20ms cycle"

# ─── Kernel memory tuning ───────────────────────────────────────────────────
echo "[3/6] Tuning kernel memory parameters..."
cat > /etc/sysctl.d/90-taro-memory.conf << 'EOF'
# Taro container hosting memory optimization

# Heuristic overcommit (default, safe for container hosting)
vm.overcommit_memory = 0

# Reclaim page cache faster for container workloads
vm.vfs_cache_pressure = 150

# Prefer reclaiming page cache over swapping application memory
vm.swappiness = 30

# Dirty page ratios for write-heavy workloads (PostgreSQL)
vm.dirty_ratio = 10
vm.dirty_background_ratio = 5

# Increase max inotify watchers for Node.js file watching
fs.inotify.max_user_watches = 524288
fs.inotify.max_user_instances = 512
EOF

sysctl --system > /dev/null 2>&1
echo "  Kernel parameters tuned"

# ─── Docker daemon security ─────────────────────────────────────────────────
echo "[4/6] Configuring Docker daemon security..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 65536
    },
    "nproc": {
      "Name": "nproc",
      "Hard": 4096,
      "Soft": 4096
    }
  }
}
EOF

systemctl restart docker 2>/dev/null || echo "  Docker not installed yet, config saved for later"
echo "  Docker daemon configured with security defaults"

# ─── iptables security rules ────────────────────────────────────────────────
echo "[5/6] Configuring network security rules..."

# Block containers from accessing cloud metadata service
iptables -C DOCKER-USER -d 169.254.169.254 -j REJECT 2>/dev/null || \
  iptables -I DOCKER-USER -d 169.254.169.254 -j REJECT

# Block containers from accessing host SSH
HOST_IP=$(hostname -I | awk '{print $1}')
iptables -C DOCKER-USER -d "$HOST_IP" -p tcp --dport 22 -j DROP 2>/dev/null || \
  iptables -I DOCKER-USER -d "$HOST_IP" -p tcp --dport 22 -j DROP

# Save iptables rules to persist across reboots
if command -v iptables-save > /dev/null; then
  iptables-save > /etc/iptables/rules.v4 2>/dev/null || \
    mkdir -p /etc/iptables && iptables-save > /etc/iptables/rules.v4
fi

echo "  Network security rules applied"

# ─── Boot persistence ───────────────────────────────────────────────────────
echo "[6/6] Setting up boot persistence..."
cat > /etc/systemd/system/taro-host-init.service << 'INITEOF'
[Unit]
Description=Taro Host Initialization
After=docker.service
Wants=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes

# zram setup
ExecStart=/bin/bash -c 'modprobe zram; swapoff /dev/zram0 2>/dev/null || true; echo 1 > /sys/block/zram0/reset 2>/dev/null || true; echo lz4 > /sys/block/zram0/comp_algorithm; TOTAL_KB=$(grep MemTotal /proc/meminfo | awk "{print \\$2}"); SIZE_MB=$((TOTAL_KB / 4 / 1024)); echo "${SIZE_MB}M" > /sys/block/zram0/disksize; mkswap /dev/zram0; swapon -p 100 /dev/zram0'

# KSM
ExecStart=/bin/bash -c 'echo 1 > /sys/kernel/mm/ksm/run; echo 2000 > /sys/kernel/mm/ksm/pages_to_scan; echo 20 > /sys/kernel/mm/ksm/sleep_millisecs'

# iptables
ExecStart=/bin/bash -c 'iptables -C DOCKER-USER -d 169.254.169.254 -j REJECT 2>/dev/null || iptables -I DOCKER-USER -d 169.254.169.254 -j REJECT'

[Install]
WantedBy=multi-user.target
INITEOF

systemctl daemon-reload
systemctl enable taro-host-init.service

echo "  Boot persistence configured"

echo ""
echo "=== Taro Host Setup Complete ==="
echo "  zram: ${ZRAM_SIZE_MB}MB (lz4)"
echo "  KSM: enabled"
echo "  Docker: security hardened"
echo "  iptables: metadata + SSH blocked"
echo ""
echo "Reboot recommended to verify persistence."
