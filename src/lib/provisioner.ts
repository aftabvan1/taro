import { NodeSSH } from "node-ssh";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { logActivity } from "@/lib/activity";
import { seedInstanceData } from "@/lib/seed-instance";
import { logger } from "@/lib/logger";
import { validateShellName, validatePort } from "@/lib/shell-sanitize";

const PORT_BASE = 10000;
const PORT_STRIDE = 10; // each instance gets 10 ports

interface ProvisionResult {
  openclawPort: number;
  ttydPort: number;
  mcPort: number;
  containerName: string;
}

/**
 * Create a fresh SSH connection per operation to prevent
 * command interleaving across concurrent operations.
 */
const getSSHConnection = async () => {
  const conn = new NodeSSH();
  await conn.connect({
    host: process.env.HETZNER_SERVER_IP!,
    username: "root",
    privateKey: process.env.HETZNER_SSH_PRIVATE_KEY!,
  });
  return conn;
};

/**
 * Allocate ports using an atomic DB query to prevent race conditions.
 * Uses COALESCE + MAX to find the next available port block in a single query.
 */
const allocatePorts = async () => {
  const [result] = await db
    .select({
      maxPort: sql<number>`COALESCE(MAX(${instances.openclawPort}), ${PORT_BASE - PORT_STRIDE})`,
    })
    .from(instances);

  const base = (result?.maxPort ?? PORT_BASE - PORT_STRIDE) + PORT_STRIDE;
  return {
    openclaw: base,
    ttyd: base + 1,
    mc: base + 2,
  };
};

/**
 * Deploy the sync daemon on a server instance.
 * Installs Node.js if missing, writes the script + deps, creates systemd service.
 */
export const deploySyncDaemon = async (
  conn: NodeSSH,
  instanceName: string,
  instanceId: string,
  mcPort: number
) => {
  validateShellName(instanceName, "instance name");
  validatePort(mcPort, "mc port");
  const instanceDir = `/opt/taro/instances/${instanceName}`;
  const containerName = `taro-${instanceName}`;

  // Install Node.js on host if not present
  const nodeCheck = await conn.execCommand("which node");
  if (nodeCheck.code !== 0) {
    logger.info("[deploySyncDaemon] Node.js not found, installing...");
    await conn.execCommand(
      "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs"
    );
  }

  // Create sync directory and package.json
  await conn.execCommand(`mkdir -p ${instanceDir}/sync`);
  await conn.execCommand(
    `cat > ${instanceDir}/sync/package.json << 'PKGEOF'
{"name":"openclaw-sync","private":true,"type":"module","dependencies":{"@neondatabase/serverless":"^0.10.0"}}
PKGEOF`
  );
  await conn.execCommand(`cd ${instanceDir}/sync && npm install --production 2>&1 | tail -1`);

  // Write the sync script to the server
  const fs = await import("fs");
  const path = await import("path");
  const syncScriptPath = path.join(process.cwd(), "docker/scripts/openclaw-sync.mjs");
  const syncScript = fs.readFileSync(syncScriptPath, "utf-8");
  await conn.execCommand(
    `cat > ${instanceDir}/sync/openclaw-sync.mjs << 'SYNCEOF'
${syncScript}
SYNCEOF`
  );

  // Create env file with secrets — use quoted heredoc to prevent shell expansion
  // Use SYNC_DATABASE_URL (restricted role) if available, fall back to DATABASE_URL
  const databaseUrl = process.env.SYNC_DATABASE_URL || process.env.DATABASE_URL!;
  const envContent = [
    `DATABASE_URL=${databaseUrl}`,
    `INSTANCE_ID=${instanceId}`,
    `CONTAINER_NAME=${containerName}-openclaw`,
    `SYNC_HTTP_PORT=${mcPort}`,
  ].join("\n");
  await conn.execCommand(
    `cat > ${instanceDir}/sync/.env << 'ENVEOF'\n${envContent}\nENVEOF\nchmod 600 ${instanceDir}/sync/.env`
  );

  // Create and start systemd service
  await conn.execCommand(
    `cat > /etc/systemd/system/taro-sync-${instanceName}.service << SYNCSERVEOF
[Unit]
Description=OpenClaw sync daemon for ${containerName}
After=docker.service

[Service]
ExecStart=/usr/bin/node ${instanceDir}/sync/openclaw-sync.mjs
EnvironmentFile=${instanceDir}/sync/.env
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SYNCSERVEOF
systemctl daemon-reload && systemctl enable taro-sync-${instanceName} && systemctl start taro-sync-${instanceName}`
  );

  logger.info(`[deploySyncDaemon] Sync daemon deployed for ${instanceName} on port ${mcPort}`);
};

export const provisionInstance = async (
  instanceId: string,
  instanceName: string,
  mcAuthToken: string
): Promise<ProvisionResult> => {
  validateShellName(instanceName, "instance name");
  const conn = await getSSHConnection();
  const serverIp = process.env.HETZNER_SERVER_IP!;

  // Allocate ports based on highest currently-used port
  const ports = await allocatePorts();

  const containerName = `taro-${instanceName}`;
  const instanceDir = `/opt/taro/instances/${instanceName}`;

  // Create instance directory and config
  await conn.execCommand(`mkdir -p ${instanceDir}/data/openclaw ${instanceDir}/data/openclaw-config`);

  // Write OpenClaw config with token-based auth
  const instanceDomain = process.env.INSTANCE_DOMAIN || "instances.taroagent.com";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const openclawConfig = JSON.stringify({
    gateway: {
      controlUi: {
        allowedOrigins: [
          `https://${instanceName}.${instanceDomain}`,
          appUrl,
        ],
      },
      auth: { mode: "token", token: mcAuthToken },
      bind: "lan",
      trustedProxies: ["172.16.0.0/12", "10.0.0.0/8"],
    },
  }, null, 2);
  await conn.execCommand(
    `cat > ${instanceDir}/data/openclaw-config/openclaw.json << 'CONFIGEOF'\n${openclawConfig}\nCONFIGEOF`
  );
  await conn.execCommand(`chown -R 1000:1000 ${instanceDir}/data/openclaw-config`);

  // Generate per-instance terminal token for ttyd auth
  const terminalToken = randomBytes(32).toString("hex");

  // Write docker-compose.yml — bridge networking with explicit port mapping
  // Each container gets its own isolated network; only necessary ports are exposed on 127.0.0.1
  // Note: OpenClaw's internal supervisor spawns multiple gateway processes during startup;
  // 2 CPUs + 6GB mem + 120s healthcheck start_period prevents OOM kills during this phase
  const compose = `
services:
  openclaw:
    image: alpine/openclaw:latest
    container_name: ${containerName}-openclaw
    ports:
      - "127.0.0.1:${ports.openclaw}:18789"
    volumes:
      - ./data/openclaw:/data
      - ./data/openclaw-config:/home/node/.openclaw
    environment:
      - NODE_OPTIONS=--max-old-space-size=2048
    restart: unless-stopped
    mem_limit: 6g
    memswap_limit: 8g
    cpus: 2
    pids_limit: 256
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    healthcheck:
      test: ["CMD-SHELL", "node -e \\"fetch('http://127.0.0.1:18789/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\\""]
      interval: 180s
      timeout: 10s
      start_period: 120s
      retries: 3
`;

  await conn.execCommand(
    `cat > ${instanceDir}/docker-compose.yml << 'COMPOSEEOF'
${compose}
COMPOSEEOF`
  );

  // Start the stack
  await conn.execCommand(`cd ${instanceDir} && docker compose up -d`);

  try {
    // Install ttyd on host if not present
    await conn.execCommand(
      `which ttyd || (apt-get update -qq && apt-get install -y -qq ttyd)`
    );

    // Create ttyd systemd service that execs into the OpenClaw container
    await conn.execCommand(
      `cat > /etc/systemd/system/taro-ttyd-${instanceName}.service << TTYDEOF
[Unit]
Description=ttyd terminal for ${containerName}
After=docker.service

[Service]
ExecStart=/usr/bin/ttyd -i 127.0.0.1 -p ${ports.ttyd} -W docker exec -it ${containerName}-openclaw /bin/sh
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
TTYDEOF
systemctl daemon-reload && systemctl enable taro-ttyd-${instanceName} && systemctl start taro-ttyd-${instanceName}`
    );

    // Deploy OpenClaw sync daemon
    await deploySyncDaemon(conn, instanceName, instanceId, ports.mc);

    // Create auto-approve service for OpenClaw device pairing
    // OpenClaw requires browser clients to be "paired" as devices — this auto-approves them
    await conn.execCommand(
      `cat > /etc/systemd/system/taro-autopair-${instanceName}.service << AUTOPAIREOF
[Unit]
Description=Auto-approve OpenClaw device pairing for ${containerName}
After=docker.service

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'docker exec ${containerName}-openclaw openclaw devices approve --latest 2>/dev/null || true'
AUTOPAIREOF

cat > /etc/systemd/system/taro-autopair-${instanceName}.timer << TIMEREOF
[Unit]
Description=Auto-approve OpenClaw device pairing timer for ${containerName}

[Timer]
OnBootSec=30s
OnUnitActiveSec=5s

[Install]
WantedBy=timers.target
TIMEREOF
systemctl daemon-reload && systemctl enable taro-autopair-${instanceName}.timer && systemctl start taro-autopair-${instanceName}.timer`
    );

    // Add HTTPS reverse proxy entries for OpenClaw and ttyd via Caddy
    // ttyd requires a terminal token query param for authentication
    const openclawDomain = `${instanceName}.${instanceDomain}`;
    const ttydDomain = `ttyd-${instanceName}.${instanceDomain}`;
    await conn.execCommand(
      `cat > /etc/caddy/sites/${instanceName}.caddy << 'CADDYEOF'
${openclawDomain} {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
    reverse_proxy 127.0.0.1:${ports.openclaw}
}

${ttydDomain} {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
    @no_token not query token=${terminalToken}
    respond @no_token 403 {
        body "Unauthorized"
        close
    }
    reverse_proxy 127.0.0.1:${ports.ttyd}
}
CADDYEOF
systemctl reload caddy`
    );
  } catch (provisionError) {
    // Rollback: stop and remove containers if post-startup steps fail
    logger.error(`Provisioning failed after container start for ${instanceName}, rolling back:`, provisionError);
    try {
      await conn.execCommand(`cd ${instanceDir} && docker compose down --remove-orphans 2>/dev/null || true`);
      await conn.execCommand(`systemctl stop taro-ttyd-${instanceName} taro-autopair-${instanceName}.timer 2>/dev/null || true`);
      await conn.execCommand(`systemctl disable taro-autopair-${instanceName}.timer 2>/dev/null || true`);
      await conn.execCommand(`systemctl stop taro-sync-${instanceName} 2>/dev/null || true`);
      await conn.execCommand(`rm -f /etc/caddy/sites/${instanceName}.caddy`);
      await conn.execCommand(`rm -rf ${instanceDir}`);
    } catch (cleanupErr) {
      logger.error(`Rollback cleanup also failed for ${instanceName}:`, cleanupErr);
    }
    conn.dispose();
    throw provisionError;
  }

  // Update DB with connection details + terminal auth token
  await db
    .update(instances)
    .set({
      status: "running",
      serverIp,
      openclawPort: ports.openclaw,
      ttydPort: ports.ttyd,
      mcPort: ports.mc,
      containerName,
      terminalToken,
    })
    .where(eq(instances.id, instanceId));

  // Seed Mission Control data so dashboard isn't empty
  await seedInstanceData(instanceId);

  await logActivity(
    instanceId,
    "deploy",
    `Instance provisioned on ${serverIp} (ports ${ports.openclaw}/${ports.ttyd}/${ports.mc})`
  );

  conn.dispose();

  return {
    openclawPort: ports.openclaw,
    ttydPort: ports.ttyd,
    mcPort: ports.mc,
    containerName,
  };
};

export const reprovisionInstance = async (
  instanceId: string,
  instanceName: string,
  containerName: string,
  serverIp: string,
  openclawPort: number,
  ttydPort: number
) => {
  validateShellName(instanceName, "instance name");
  validateShellName(containerName, "container name");
  validatePort(openclawPort, "openclaw port");
  validatePort(ttydPort, "ttyd port");
  const conn = await getSSHConnection();
  const instanceDir = `/opt/taro/instances/${instanceName}`;

  // Rebuild the docker-compose.yml with bridge networking + resource limits
  const compose = `
services:
  openclaw:
    image: alpine/openclaw:latest
    container_name: ${containerName}-openclaw
    ports:
      - "127.0.0.1:${openclawPort}:18789"
    volumes:
      - ./data/openclaw:/data
      - ./data/openclaw-config:/home/node/.openclaw
    environment:
      - NODE_OPTIONS=--max-old-space-size=2048
    restart: unless-stopped
    mem_limit: 6g
    memswap_limit: 8g
    cpus: 2
    pids_limit: 256
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    healthcheck:
      test: ["CMD-SHELL", "node -e \\"fetch('http://127.0.0.1:18789/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\\""]
      interval: 180s
      timeout: 10s
      start_period: 120s
      retries: 3
`;

  // Write updated compose file
  await conn.execCommand(
    `cat > ${instanceDir}/docker-compose.yml << 'COMPOSEEOF'
${compose}
COMPOSEEOF`
  );

  // Stop old ttyd container if it exists, then remove it
  await conn.execCommand(
    `docker stop ${containerName}-ttyd 2>/dev/null; docker rm ${containerName}-ttyd 2>/dev/null`
  );

  // Recreate OpenClaw container with new config
  await conn.execCommand(`cd ${instanceDir} && docker compose up -d --force-recreate`);

  // Install ttyd on host if not present
  await conn.execCommand(
    `which ttyd || (apt-get update -qq && apt-get install -y -qq ttyd)`
  );

  // Create/update ttyd systemd service on host
  await conn.execCommand(
    `cat > /etc/systemd/system/taro-ttyd-${instanceName}.service << TTYDEOF
[Unit]
Description=ttyd terminal for ${containerName}
After=docker.service

[Service]
ExecStart=/usr/bin/ttyd -i 127.0.0.1 -p ${ttydPort} -W docker exec -it ${containerName}-openclaw /bin/sh
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
TTYDEOF
systemctl daemon-reload && systemctl restart taro-ttyd-${instanceName}`
  );

  // Check if sync daemon exists — deploy if missing, update if present
  const syncCheck = await conn.execCommand(`systemctl is-active taro-sync-${instanceName} 2>/dev/null`);
  if (syncCheck.stdout.trim() !== "active") {
    // Get instance ID and mcPort from DB for deploySyncDaemon
    const [inst] = await db
      .select({ id: instances.id, mcPort: instances.mcPort })
      .from(instances)
      .where(eq(instances.id, instanceId))
      .limit(1);
    if (inst?.mcPort) {
      await deploySyncDaemon(conn, instanceName, instanceId, inst.mcPort);
    }
  } else {
    // Update sync daemon script with latest code
    const fs = await import("fs");
    const path = await import("path");
    const syncScriptPath = path.join(process.cwd(), "docker/scripts/openclaw-sync.mjs");
    try {
      const syncScript = fs.readFileSync(syncScriptPath, "utf-8");
      await conn.execCommand(
        `cat > ${instanceDir}/sync/openclaw-sync.mjs << 'SYNCEOF'
${syncScript}
SYNCEOF`
      );
      await conn.execCommand(`systemctl restart taro-sync-${instanceName}`);
    } catch {
      // sync script update is best-effort during reprovision
    }
  }

  // Ensure auto-approve timer exists for device pairing
  const autopairCheck = await conn.execCommand(
    `systemctl is-active taro-autopair-${instanceName}.timer 2>/dev/null`
  );
  if (autopairCheck.stdout.trim() !== "active") {
    await conn.execCommand(
      `cat > /etc/systemd/system/taro-autopair-${instanceName}.service << AUTOPAIREOF
[Unit]
Description=Auto-approve OpenClaw device pairing for ${containerName}
After=docker.service

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'docker exec ${containerName}-openclaw openclaw devices approve --latest 2>/dev/null || true'
AUTOPAIREOF

cat > /etc/systemd/system/taro-autopair-${instanceName}.timer << TIMEREOF
[Unit]
Description=Auto-approve OpenClaw device pairing timer for ${containerName}

[Timer]
OnBootSec=30s
OnUnitActiveSec=5s

[Install]
WantedBy=timers.target
TIMEREOF
systemctl daemon-reload && systemctl enable taro-autopair-${instanceName}.timer && systemctl start taro-autopair-${instanceName}.timer`
    );
  }

  // Rewrite Caddy config and reload — ensures reverse proxy reconnects
  // after the upstream containers restart
  // Fetch terminal token from DB for Caddy auth
  const [instForToken] = await db
    .select({ terminalToken: instances.terminalToken })
    .from(instances)
    .where(eq(instances.id, instanceId))
    .limit(1);
  const termToken = instForToken?.terminalToken || randomBytes(32).toString("hex");

  const instanceDomain = process.env.INSTANCE_DOMAIN || "instances.taroagent.com";
  const openclawDomain = `${instanceName}.${instanceDomain}`;
  const ttydDomain = `ttyd-${instanceName}.${instanceDomain}`;
  await conn.execCommand(
    `cat > /etc/caddy/sites/${instanceName}.caddy << 'CADDYEOF'
${openclawDomain} {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
    reverse_proxy 127.0.0.1:${openclawPort}
}

${ttydDomain} {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
    @no_token not query token=${termToken}
    respond @no_token 403 {
        body "Unauthorized"
        close
    }
    reverse_proxy 127.0.0.1:${ttydPort}
}
CADDYEOF
systemctl reload caddy`
  );

  await db
    .update(instances)
    .set({ status: "running" })
    .where(eq(instances.id, instanceId));

  await logActivity(
    instanceId,
    "deploy",
    `Instance reprovisioned with updated terminal config`
  );

  conn.dispose();
};

/**
 * Update the sync daemon script on a running instance.
 * If the sync daemon was never deployed, does a full deploy instead.
 */
export const updateSyncDaemon = async (
  instanceName: string,
  instanceId?: string,
  mcPort?: number
) => {
  validateShellName(instanceName, "instance name");
  if (mcPort !== undefined) validatePort(mcPort, "mc port");
  const conn = await getSSHConnection();
  const instanceDir = `/opt/taro/instances/${instanceName}`;

  try {
    // Check if sync daemon service exists
    const serviceCheck = await conn.execCommand(
      `test -f /etc/systemd/system/taro-sync-${instanceName}.service && echo exists`
    );

    if (serviceCheck.stdout.trim() !== "exists") {
      // Sync daemon was never deployed — do full deploy
      if (!instanceId || !mcPort) {
        throw new Error("Sync daemon not deployed and missing instanceId/mcPort for deployment");
      }
      await deploySyncDaemon(conn, instanceName, instanceId, mcPort);
      return;
    }

    // Write the updated sync script
    const fs = await import("fs");
    const path = await import("path");
    const syncScriptPath = path.join(process.cwd(), "docker/scripts/openclaw-sync.mjs");
    const syncScript = fs.readFileSync(syncScriptPath, "utf-8");
    await conn.execCommand(
      `cat > ${instanceDir}/sync/openclaw-sync.mjs << 'SYNCEOF'
${syncScript}
SYNCEOF`
    );

    // Restart the sync daemon to pick up changes
    await conn.execCommand(`systemctl restart taro-sync-${instanceName}`);
  } finally {
    conn.dispose();
  }
};

export const stopInstance = async (containerName: string) => {
  const conn = await getSSHConnection();
  const instanceName = containerName.replace("taro-", "");
  validateShellName(instanceName, "instance name");
  try {
    await conn.execCommand(
      `cd /opt/taro/instances/${instanceName} && docker compose stop`
    );
    await conn.execCommand(`systemctl stop taro-sync-${instanceName} taro-autopair-${instanceName}.timer 2>/dev/null`);
  } finally {
    conn.dispose();
  }
};

export const startInstance = async (containerName: string) => {
  const conn = await getSSHConnection();
  const instanceName = containerName.replace("taro-", "");
  validateShellName(instanceName, "instance name");
  try {
    await conn.execCommand(
      `cd /opt/taro/instances/${instanceName} && docker compose start`
    );
    await conn.execCommand(`systemctl start taro-sync-${instanceName} taro-autopair-${instanceName}.timer 2>/dev/null`);
  } finally {
    conn.dispose();
  }
};

export const restartInstance = async (containerName: string) => {
  const conn = await getSSHConnection();
  const instanceName = containerName.replace("taro-", "");
  validateShellName(instanceName, "instance name");
  try {
    await conn.execCommand(
      `cd /opt/taro/instances/${instanceName} && docker compose restart`
    );
    await conn.execCommand(`systemctl restart taro-sync-${instanceName} 2>/dev/null`);
    await conn.execCommand(`systemctl restart taro-autopair-${instanceName}.timer 2>/dev/null`);
  } finally {
    conn.dispose();
  }
};

export const deleteInstance = async (containerName: string) => {
  const conn = await getSSHConnection();
  const instanceName = containerName.replace("taro-", "");
  validateShellName(instanceName, "instance name");
  const instanceDir = `/opt/taro/instances/${instanceName}`;
  try {
    await conn.execCommand(`cd ${instanceDir} && docker compose down -v`);
    await conn.execCommand(`rm -rf ${instanceDir}`);
    // Clean up systemd services (ttyd, sync, autopair) and Caddy site config
    await conn.execCommand(
      `systemctl stop taro-ttyd-${instanceName} taro-sync-${instanceName} taro-autopair-${instanceName}.timer 2>/dev/null; systemctl disable taro-ttyd-${instanceName} taro-sync-${instanceName} taro-autopair-${instanceName}.timer 2>/dev/null; rm -f /etc/systemd/system/taro-ttyd-${instanceName}.service /etc/systemd/system/taro-sync-${instanceName}.service /etc/systemd/system/taro-autopair-${instanceName}.service /etc/systemd/system/taro-autopair-${instanceName}.timer; rm -f /etc/caddy/sites/${instanceName}.caddy; systemctl daemon-reload; systemctl reload caddy 2>/dev/null`
    );
  } finally {
    conn.dispose();
  }
};

export interface ContainerStats {
  cpuPercent: number;
  memoryUsageMB: number;
  memoryLimitMB: number;
  networkRxMB: number;
  networkTxMB: number;
}

export const getInstanceStats = async (
  containerName: string
): Promise<ContainerStats> => {
  validateShellName(containerName.replace("taro-", ""), "container name");
  const conn = await getSSHConnection();
  try {
    const result = await conn.execCommand(
      `docker stats ${containerName}-openclaw --no-stream --format '{"cpu":"{{.CPUPerc}}","mem":"{{.MemUsage}}","net":"{{.NetIO}}"}'`
    );

    if (result.code !== 0) {
      throw new Error(`Failed to get stats: ${result.stderr}`);
    }

    try {
      const raw = JSON.parse(result.stdout.trim());
      const cpuPercent = parseFloat(raw.cpu.replace("%", ""));

      const memParts = raw.mem.split(" / ");
      const memoryUsageMB = parseMemory(memParts[0]);
      const memoryLimitMB = parseMemory(memParts[1]);

      const netParts = raw.net.split(" / ");
      const networkRxMB = parseMemory(netParts[0]);
      const networkTxMB = parseMemory(netParts[1]);

      return { cpuPercent, memoryUsageMB, memoryLimitMB, networkRxMB, networkTxMB };
    } catch {
      return {
        cpuPercent: 0,
        memoryUsageMB: 0,
        memoryLimitMB: 0,
        networkRxMB: 0,
        networkTxMB: 0,
      };
    }
  } finally {
    conn.dispose();
  }
};

const parseMemory = (str: string): number => {
  const trimmed = str.trim();
  if (trimmed.endsWith("GiB")) return parseFloat(trimmed) * 1024;
  if (trimmed.endsWith("MiB")) return parseFloat(trimmed);
  if (trimmed.endsWith("KiB")) return parseFloat(trimmed) / 1024;
  if (trimmed.endsWith("GB")) return parseFloat(trimmed) * 1000;
  if (trimmed.endsWith("MB")) return parseFloat(trimmed);
  if (trimmed.endsWith("KB")) return parseFloat(trimmed) / 1000;
  return parseFloat(trimmed) || 0;
};
