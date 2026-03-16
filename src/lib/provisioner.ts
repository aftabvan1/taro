import { NodeSSH } from "node-ssh";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/activity";

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

export const provisionInstance = async (
  instanceId: string,
  instanceName: string,
  mcAuthToken: string
): Promise<ProvisionResult> => {
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
    environment:
      - NODE_OPTIONS=--max-old-space-size=1024
    restart: unless-stopped

  ttyd:
    image: tsl0922/ttyd:latest
    container_name: ${containerName}-ttyd
    ports:
      - "${ports.ttyd}:7681"
    command: ttyd -W bash
    restart: unless-stopped
`;

  await conn.execCommand(
    `cat > ${instanceDir}/docker-compose.yml << 'COMPOSEEOF'
${compose}
COMPOSEEOF`
  );

  // Start the stack
  await conn.execCommand(`cd ${instanceDir} && docker compose up -d`);

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

export const stopInstance = async (containerName: string) => {
  const conn = await getSSHConnection();
  await conn.execCommand(
    `cd /opt/taro/instances/${containerName.replace("taro-", "")} && docker compose stop`
  );
};

export const startInstance = async (containerName: string) => {
  const conn = await getSSHConnection();
  await conn.execCommand(
    `cd /opt/taro/instances/${containerName.replace("taro-", "")} && docker compose start`
  );
};

export const restartInstance = async (containerName: string) => {
  const conn = await getSSHConnection();
  await conn.execCommand(
    `cd /opt/taro/instances/${containerName.replace("taro-", "")} && docker compose restart`
  );
};

export const deleteInstance = async (containerName: string) => {
  const conn = await getSSHConnection();
  const instanceName = containerName.replace("taro-", "");
  const instanceDir = `/opt/taro/instances/${instanceName}`;
  await conn.execCommand(`cd ${instanceDir} && docker compose down -v`);
  await conn.execCommand(`rm -rf ${instanceDir}`);
  // Clean up socat forwarder
  await conn.execCommand(
    `systemctl stop taro-socat-${instanceName} 2>/dev/null; systemctl disable taro-socat-${instanceName} 2>/dev/null; rm -f /etc/systemd/system/taro-socat-${instanceName}.service; systemctl daemon-reload`
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
