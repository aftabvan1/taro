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

  // Create instance directory
  await conn.execCommand(`mkdir -p ${instanceDir}/data/openclaw ${instanceDir}/data/mc-db`);

  // Write docker-compose.yml
  const compose = `
services:
  openclaw:
    image: alpine/openclaw:latest
    container_name: ${containerName}-openclaw
    ports:
      - "${ports.openclaw}:3000"
    volumes:
      - ./data/openclaw:/data
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 2G
        reservations:
          memory: 512M

  ttyd:
    image: tsl0922/ttyd:latest
    container_name: ${containerName}-ttyd
    ports:
      - "${ports.ttyd}:7681"
    command: ttyd sh
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 256M

  mission-control:
    image: ghcr.io/abhi1693/openclaw-mission-control:latest
    container_name: ${containerName}-mc
    ports:
      - "${ports.mc}:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@mc-db:5432/mc
      - AUTH_MODE=local
      - AUTH_TOKEN=${mcAuthToken}
    depends_on:
      mc-db:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 512M

  mc-db:
    image: postgres:16-alpine
    container_name: ${containerName}-mcdb
    environment:
      - POSTGRES_DB=mc
      - POSTGRES_PASSWORD=postgres
    volumes:
      - ./data/mc-db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
`;

  await conn.execCommand(
    `cat > ${instanceDir}/docker-compose.yml << 'COMPOSEEOF'
${compose}
COMPOSEEOF`
  );

  // Start the stack
  await conn.execCommand(`cd ${instanceDir} && docker compose up -d`);

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
  const instanceDir = `/opt/taro/instances/${containerName.replace("taro-", "")}`;
  await conn.execCommand(`cd ${instanceDir} && docker compose down -v`);
  await conn.execCommand(`rm -rf ${instanceDir}`);
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
