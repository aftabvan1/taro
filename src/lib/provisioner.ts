import { NodeSSH } from "node-ssh";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/activity";
import { seedInstanceData } from "@/lib/seed-instance";
import { logger } from "@/lib/logger";
import { validateShellName, validatePort } from "@/lib/shell-sanitize";

const ssh = new NodeSSH();

const PORT_BASE = 10000;
const PORT_STRIDE = 10; // each instance gets 10 ports

interface ProvisionResult {
  openclawPort: number;
  ttydPort: number;
  mcPort: number;
  containerName: string;
}

const getSSHConnection = async () => {
  if (ssh.isConnected()) return ssh;

  await ssh.connect({
    host: process.env.HETZNER_SERVER_IP!,
    username: "root",
    privateKey: process.env.HETZNER_SSH_PRIVATE_KEY!,
  });

  return ssh;
};

const allocatePort = async (instanceIndex: number) => {
  const base = PORT_BASE + instanceIndex * PORT_STRIDE;
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

  // Create env file with secrets
  const databaseUrl = process.env.DATABASE_URL!;
  await conn.execCommand(
    `cat > ${instanceDir}/sync/.env << ENVEOF
DATABASE_URL=${databaseUrl}
INSTANCE_ID=${instanceId}
CONTAINER_NAME=${containerName}-openclaw
SYNC_HTTP_PORT=${mcPort}
ENVEOF
chmod 600 ${instanceDir}/sync/.env`
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

  // Get instance index for port allocation
  const allInstances = await db.select({ id: instances.id }).from(instances);
  const instanceIndex = allInstances.findIndex((i) => i.id === instanceId);
  const ports = await allocatePort(instanceIndex >= 0 ? instanceIndex : allInstances.length);

  const containerName = `taro-${instanceName}`;
  const instanceDir = `/opt/taro/instances/${instanceName}`;

  // Create instance directory and config
  await conn.execCommand(`mkdir -p ${instanceDir}/data/openclaw ${instanceDir}/data/openclaw-config`);

  // Write OpenClaw config (no auth for seamless Web Chat access via HTTPS proxy)
  await conn.execCommand(
    `cat > ${instanceDir}/data/openclaw-config/openclaw.json << CONFIGEOF
{
  "gateway": {
    "controlUi": {
      "allowedOrigins": ["https://${serverIp}", "http://${serverIp}:${ports.openclaw}", "http://localhost:3000"]
    },
    "auth": {
      "mode": "none"
    }
  }
}
CONFIGEOF`
  );
  await conn.execCommand(`chown -R 1000:1000 ${instanceDir}/data/openclaw-config`);

  // Write docker-compose.yml
  // OpenClaw binds to 127.0.0.1:18789 internally, so we use host networking
  // and a socat forwarder to expose it on the allocated port.
  // Mission Control runs globally on the server, not per-instance.
  const compose = `
services:
  openclaw:
    image: alpine/openclaw:latest
    container_name: ${containerName}-openclaw
    network_mode: host
    volumes:
      - ./data/openclaw:/data
      - ./data/openclaw-config:/home/node/.openclaw
    restart: unless-stopped
    mem_limit: 1536m
    memswap_limit: 2g
`;

  await conn.execCommand(
    `cat > ${instanceDir}/docker-compose.yml << 'COMPOSEEOF'
${compose}
COMPOSEEOF`
  );

  // Start the stack
  await conn.execCommand(`cd ${instanceDir} && docker compose up -d`);

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
ExecStart=/usr/bin/ttyd -p ${ports.ttyd} -W docker exec -it ${containerName}-openclaw /bin/sh
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
TTYDEOF
systemctl daemon-reload && systemctl enable taro-ttyd-${instanceName} && systemctl start taro-ttyd-${instanceName}`
  );

  // Create socat forwarder to expose OpenClaw (binds to localhost only) on the allocated port
  await conn.execCommand(
    `cat > /etc/systemd/system/taro-socat-${instanceName}.service << SOCATEOF
[Unit]
Description=Socat forwarder for ${containerName} OpenClaw
After=docker.service

[Service]
ExecStart=/usr/bin/socat TCP-LISTEN:${ports.openclaw},fork,reuseaddr TCP:127.0.0.1:18789
Restart=always

[Install]
WantedBy=multi-user.target
SOCATEOF
systemctl daemon-reload && systemctl enable taro-socat-${instanceName} && systemctl start taro-socat-${instanceName}`
  );

  // Deploy OpenClaw sync daemon
  await deploySyncDaemon(conn, instanceName, instanceId, ports.mc);

  // Add HTTPS reverse proxy entries for OpenClaw and ttyd via Caddy + nip.io
  const nipDomain = serverIp.replace(/\./g, "-") + ".nip.io";
  await conn.execCommand(
    `cat > /etc/caddy/Caddyfile << CADDYEOF
${nipDomain} {
    reverse_proxy 127.0.0.1:18789
}

ttyd-${nipDomain} {
    reverse_proxy 127.0.0.1:${ports.ttyd}
}
CADDYEOF
systemctl reload caddy`
  );

  // Update DB with connection details
  await db
    .update(instances)
    .set({
      status: "running",
      serverIp,
      openclawPort: ports.openclaw,
      ttydPort: ports.ttyd,
      mcPort: ports.mc,
      containerName,
    })
    .where(eq(instances.id, instanceId));

  // Seed Mission Control data so dashboard isn't empty
  await seedInstanceData(instanceId);

  await logActivity(
    instanceId,
    "deploy",
    `Instance provisioned on ${serverIp} (ports ${ports.openclaw}/${ports.ttyd}/${ports.mc})`
  );

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

  // Rebuild the docker-compose.yml with updated config (ttyd now runs on host)
  const compose = `
services:
  openclaw:
    image: alpine/openclaw:latest
    container_name: ${containerName}-openclaw
    network_mode: host
    volumes:
      - ./data/openclaw:/data
      - ./data/openclaw-config:/home/node/.openclaw
    restart: unless-stopped
    mem_limit: 1536m
    memswap_limit: 2g
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
ExecStart=/usr/bin/ttyd -p ${ttydPort} -W docker exec -it ${containerName}-openclaw /bin/sh
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

  // Rewrite Caddy config and reload — ensures reverse proxy reconnects
  // after the upstream containers restart
  const nipDomain = serverIp.replace(/\./g, "-") + ".nip.io";
  await conn.execCommand(
    `cat > /etc/caddy/Caddyfile << CADDYEOF
${nipDomain} {
    reverse_proxy 127.0.0.1:18789
}

ttyd-${nipDomain} {
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
};

export const stopInstance = async (containerName: string) => {
  const conn = await getSSHConnection();
  const instanceName = containerName.replace("taro-", "");
  validateShellName(instanceName, "instance name");
  await conn.execCommand(
    `cd /opt/taro/instances/${instanceName} && docker compose stop`
  );
  await conn.execCommand(`systemctl stop taro-sync-${instanceName} 2>/dev/null`);
};

export const startInstance = async (containerName: string) => {
  const conn = await getSSHConnection();
  const instanceName = containerName.replace("taro-", "");
  validateShellName(instanceName, "instance name");
  await conn.execCommand(
    `cd /opt/taro/instances/${instanceName} && docker compose start`
  );
  await conn.execCommand(`systemctl start taro-sync-${instanceName} 2>/dev/null`);
};

export const restartInstance = async (containerName: string) => {
  const conn = await getSSHConnection();
  const instanceName = containerName.replace("taro-", "");
  validateShellName(instanceName, "instance name");
  await conn.execCommand(
    `cd /opt/taro/instances/${instanceName} && docker compose restart`
  );
  await conn.execCommand(`systemctl restart taro-sync-${instanceName} 2>/dev/null`);
};

export const deleteInstance = async (containerName: string) => {
  const conn = await getSSHConnection();
  const instanceName = containerName.replace("taro-", "");
  validateShellName(instanceName, "instance name");
  const instanceDir = `/opt/taro/instances/${instanceName}`;
  await conn.execCommand(`cd ${instanceDir} && docker compose down -v`);
  await conn.execCommand(`rm -rf ${instanceDir}`);
  // Clean up all systemd services (socat, ttyd, sync)
  await conn.execCommand(
    `systemctl stop taro-socat-${instanceName} taro-ttyd-${instanceName} taro-sync-${instanceName} 2>/dev/null; systemctl disable taro-socat-${instanceName} taro-ttyd-${instanceName} taro-sync-${instanceName} 2>/dev/null; rm -f /etc/systemd/system/taro-socat-${instanceName}.service /etc/systemd/system/taro-ttyd-${instanceName}.service /etc/systemd/system/taro-sync-${instanceName}.service; systemctl daemon-reload`
  );
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
