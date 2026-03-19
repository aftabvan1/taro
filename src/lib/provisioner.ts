import { NodeSSH } from "node-ssh";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { logActivity } from "@/lib/activity";
import { seedInstanceData } from "@/lib/seed-instance";
import { logger } from "@/lib/logger";
import { validateShellName, validatePort } from "@/lib/shell-sanitize";
import { env } from "@/lib/env";

const PORT_BASE = 10000;
const PORT_STRIDE = 10; // each instance gets 10 ports

// ─── Framework Configuration ───────────────────────────────────────────────────

const FRAMEWORK_CONFIGS = {
  openclaw: {
    image: "alpine/openclaw:2026.3.13-1",
    internalPort: 18789,
    containerSuffix: "openclaw",
    configDir: "openclaw-config",
    dataDir: "openclaw",
    configMountPath: "/home/node/.openclaw",
    extraVolumes: [
      { host: "data/mcporter-config", container: "/home/node/.mcporter" },
    ],
    env: {
      NODE_OPTIONS: "--max-old-space-size=1536",
      NPM_CONFIG_CACHE: "/data/.npm-cache",
      PATH: "/data/.npm-global/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    },
    healthcheck: `node -e \\"fetch('http://127.0.0.1:18789/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\\"`,
    needsDevicePairing: true,
    needsMcporter: true,
    needsComposio: true,
    syncDaemonScript: "openclaw-sync.mjs",
    command: "",
    readOnly: true,
    useSeccomp: true,
    runAsUser: 1000,
  },
  hermes: {
    image: "hermes-agent:webapi",
    internalPort: 8642,
    containerSuffix: "hermes",
    configDir: "hermes-config",
    dataDir: "hermes",
    configMountPath: "/root/.hermes",
    extraVolumes: [] as { host: string; container: string }[],
    env: {
      API_SERVER_ENABLED: "true",
      API_SERVER_HOST: "0.0.0.0",
      GATEWAY_ALLOW_ALL_USERS: "true",
    } as Record<string, string>,
    command: "python -m gateway.run",
    healthcheck: "wget -qO- http://127.0.0.1:8642/health || exit 1",
    needsDevicePairing: false,
    needsMcporter: false,
    needsComposio: false,
    syncDaemonScript: "hermes-sync.mjs",
    readOnly: false,
    useSeccomp: false,
    runAsUser: 0,
  },
} as const;

type AgentFramework = keyof typeof FRAMEWORK_CONFIGS;

// ─── Types ──────────────────────────────────────────────────────────────────────

interface ProvisionResult {
  agentPort: number;
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
    host: env.HETZNER_SERVER_IP,
    username: "root",
    privateKey: env.HETZNER_SSH_PRIVATE_KEY,
  });
  return conn;
};

/**
 * Allocate ports atomically using a single UPDATE with a subquery.
 * Retries on unique constraint violations (concurrent port allocation).
 */
const allocatePorts = async (instanceId: string, maxRetries = 3) => {
  const defaultBase = PORT_BASE - PORT_STRIDE;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Single atomic UPDATE: compute next port block and assign in one statement
      await db
        .update(instances)
        .set({
          agentPort: sql`(SELECT COALESCE(MAX(agent_port), ${defaultBase}) + ${PORT_STRIDE} FROM instances)`,
          ttydPort: sql`(SELECT COALESCE(MAX(agent_port), ${defaultBase}) + ${PORT_STRIDE} + 1 FROM instances)`,
          mcPort: sql`(SELECT COALESCE(MAX(agent_port), ${defaultBase}) + ${PORT_STRIDE} + 2 FROM instances)`,
        })
        .where(eq(instances.id, instanceId));

      // Read back the assigned ports
      const [assigned] = await db
        .select({
          agent: instances.agentPort,
          ttyd: instances.ttydPort,
          mc: instances.mcPort,
        })
        .from(instances)
        .where(eq(instances.id, instanceId))
        .limit(1);

      return {
        agent: assigned!.agent!,
        ttyd: assigned!.ttyd!,
        mc: assigned!.mc!,
      };
    } catch (err) {
      const isUniqueViolation = err instanceof Error && err.message.includes("unique");
      if (isUniqueViolation && attempt < maxRetries - 1) {
        logger.info(`Port allocation conflict (attempt ${attempt + 1}), retrying...`);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Port allocation failed after max retries");
};

/**
 * Deploy the sync daemon on a server instance.
 * Installs Node.js if missing, writes the script + deps, creates systemd service.
 */
export const deploySyncDaemon = async (
  conn: NodeSSH,
  instanceName: string,
  instanceId: string,
  mcPort: number,
  agentFramework: AgentFramework = "openclaw"
) => {
  validateShellName(instanceName, "instance name");
  validatePort(mcPort, "mc port");
  const instanceDir = `/opt/taro/instances/${instanceName}`;
  const containerName = `taro-${instanceName}`;
  const fw = FRAMEWORK_CONFIGS[agentFramework];

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
{"name":"taro-sync","private":true,"type":"module","dependencies":{"@neondatabase/serverless":"^0.10.0"}}
PKGEOF`
  );
  await conn.execCommand(`cd ${instanceDir}/sync && npm install --production 2>&1 | tail -1`);

  // Write the sync script to the server
  const fs = await import("fs");
  const path = await import("path");
  const syncScriptPath = path.join(process.cwd(), `docker/scripts/${fw.syncDaemonScript}`);
  const syncScript = fs.readFileSync(syncScriptPath, "utf-8");
  await conn.execCommand(
    `cat > ${instanceDir}/sync/${fw.syncDaemonScript} << 'SYNCEOF'
${syncScript}
SYNCEOF`
  );

  // Create env file with secrets — use quoted heredoc to prevent shell expansion
  // Use SYNC_DATABASE_URL (restricted role) if available, fall back to DATABASE_URL
  const databaseUrl = process.env.SYNC_DATABASE_URL || process.env.DATABASE_URL!;
  const envContent = [
    `DATABASE_URL=${databaseUrl}`,
    `INSTANCE_ID=${instanceId}`,
    `CONTAINER_NAME=${containerName}-${fw.containerSuffix}`,
    `SYNC_HTTP_PORT=${mcPort}`,
  ].join("\n");
  await conn.execCommand(
    `cat > ${instanceDir}/sync/.env << 'ENVEOF'\n${envContent}\nENVEOF\nchmod 600 ${instanceDir}/sync/.env`
  );

  // Create and start systemd service
  await conn.execCommand(
    `cat > /etc/systemd/system/taro-sync-${instanceName}.service << SYNCSERVEOF
[Unit]
Description=Taro sync daemon for ${containerName}
After=docker.service

[Service]
ExecStart=/usr/bin/node ${instanceDir}/sync/${fw.syncDaemonScript}
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
  mcAuthToken: string,
  agentFramework: AgentFramework = "openclaw"
): Promise<ProvisionResult> => {
  validateShellName(instanceName, "instance name");
  const conn = await getSSHConnection();
  const serverIp = env.HETZNER_SERVER_IP;
  const fw = FRAMEWORK_CONFIGS[agentFramework];

  // Allocate ports atomically (reserves them in DB within a transaction)
  const ports = await allocatePorts(instanceId);

  const containerName = `taro-${instanceName}`;
  const instanceDir = `/opt/taro/instances/${instanceName}`;

  // Create instance directory and config
  const mkdirParts = [`${instanceDir}/data/${fw.dataDir}`, `${instanceDir}/data/${fw.configDir}`];
  if (fw.extraVolumes.length > 0) {
    for (const vol of fw.extraVolumes) {
      mkdirParts.push(`${instanceDir}/${vol.host}`);
    }
  }
  await conn.execCommand(`mkdir -p ${mkdirParts.join(" ")}`);
  if (fw.runAsUser !== 0) {
    await conn.execCommand(`chown -R ${fw.runAsUser}:${fw.runAsUser} ${mkdirParts.join(" ")}`);
  }

  // Deploy seccomp profile for container security (only for frameworks that use it)
  if (fw.useSeccomp) {
    await conn.execCommand(`mkdir -p /opt/taro/seccomp`);
    const seccompCheck = await conn.execCommand(`test -f /opt/taro/seccomp/openclaw-seccomp.json && echo exists`);
    if (seccompCheck.stdout.trim() !== "exists") {
      const fs = await import("fs");
      const path = await import("path");
      const seccompPath = path.join(process.cwd(), "docker/scripts/openclaw-seccomp.json");
      const seccompProfile = fs.readFileSync(seccompPath, "utf-8");
      await conn.execCommand(
        `cat > /opt/taro/seccomp/openclaw-seccomp.json << 'SECCOMPEOF'
${seccompProfile}
SECCOMPEOF`
      );
    }
  }

  // Write framework-specific config
  const instanceDomain = env.INSTANCE_DOMAIN;
  const appUrl = env.APP_URL;
  const composioConsumerKey = env.COMPOSIO_CONSUMER_KEY;

  if (agentFramework === "openclaw") {
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
      ...(composioConsumerKey ? {
        plugins: {
          entries: {
            composio: {
              enabled: true,
              config: {
                consumerKey: composioConsumerKey,
              },
            },
          },
        },
      } : {}),
    }, null, 2);
    await conn.execCommand(
      `cat > ${instanceDir}/data/${fw.configDir}/openclaw.json << 'CONFIGEOF'\n${openclawConfig}\nCONFIGEOF`
    );
  } else if (agentFramework === "hermes") {
    const hermesConfig = JSON.stringify({
      default_model: "anthropic/claude-sonnet-4-20250514",
      provider: "openrouter",
    }, null, 2);
    await conn.execCommand(
      `cat > ${instanceDir}/data/${fw.configDir}/config.json << 'CONFIGEOF'\n${hermesConfig}\nCONFIGEOF`
    );
  }
  if (fw.runAsUser !== 0) {
    await conn.execCommand(`chown -R ${fw.runAsUser}:${fw.runAsUser} ${instanceDir}/data/${fw.configDir}`);
  }

  // Generate per-instance terminal token for ttyd auth
  const terminalToken = randomBytes(32).toString("hex");

  // Build volume mounts
  const volumes = [
    `./data/${fw.dataDir}:/data`,
    `./data/${fw.configDir}:${fw.configMountPath}`,
    ...fw.extraVolumes.map(v => `./${v.host}:${v.container}`),
  ];

  // Build environment variables — omit the block entirely if empty (empty `environment:` is invalid YAML)
  const envEntries = Object.entries(fw.env);
  const envBlock = envEntries.length > 0
    ? `    environment:\n${envEntries.map(([k, v]) => `      - ${k}=${v}`).join("\n")}`
    : "";

  // Build security options
  const securityOpts = ["no-new-privileges:true"];
  if (fw.useSeccomp) securityOpts.push("seccomp=/opt/taro/seccomp/openclaw-seccomp.json");

  // Write docker-compose.yml — bridge networking with explicit port mapping
  // Each container gets its own isolated network; only necessary ports are exposed on 127.0.0.1
  // 2 CPUs + 4GB mem (+ 1GB swap) + security hardening; 120s healthcheck start_period for startup
  const commandLine = fw.command ? `\n    command: ${fw.command}` : "";
  const compose = `
services:
  ${fw.containerSuffix}:
    image: ${fw.image}
    container_name: ${containerName}-${fw.containerSuffix}${commandLine}
    ports:
      - "127.0.0.1:${ports.agent}:${fw.internalPort}"
    volumes:
${volumes.map(v => `      - ${v}`).join("\n")}
${envBlock}
    restart: unless-stopped
    mem_limit: 4g
    memswap_limit: 6g
    mem_swappiness: 60
    cpus: 2
    pids_limit: 256
    oom_score_adj: -200${fw.readOnly ? `
    read_only: true
    tmpfs:
      - /tmp:size=256m,nosuid,nodev
      - /run:size=64m,noexec,nosuid,nodev` : ""}
    security_opt:
${securityOpts.map(o => `      - ${o}`).join("\n")}
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    healthcheck:
      test: ["CMD-SHELL", "${fw.healthcheck}"]
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

  // Start the stack — check exit code so failures don't go silent
  const composeUp = await conn.execCommand(`cd ${instanceDir} && docker compose up -d 2>&1`);
  if (composeUp.code !== 0) {
    throw new Error(`docker compose up failed: ${composeUp.stdout} ${composeUp.stderr}`.trim());
  }

  // OpenClaw-only post-startup steps
  if (fw.needsMcporter) {
    await conn.execCommand(
      `docker exec -e NPM_CONFIG_CACHE=/tmp/.npm -e NPM_CONFIG_PREFIX=/data/.npm-global ${containerName}-${fw.containerSuffix} npm install -g mcporter 2>/dev/null || true`
    );
  }

  if (fw.needsComposio && composioConsumerKey) {
    await conn.execCommand(
      `docker exec ${containerName}-${fw.containerSuffix} openclaw plugins install @composio/openclaw-plugin 2>/dev/null || true`
    );
  }

  try {
    // Install ttyd on host if not present
    await conn.execCommand(
      `which ttyd || (apt-get update -qq && apt-get install -y -qq ttyd)`
    );

    // Kill any rogue process occupying the ttyd port before starting the service
    await conn.execCommand(
      `fuser -k ${ports.ttyd}/tcp 2>/dev/null || true`
    );

    // Create ttyd systemd service that execs into the agent container
    await conn.execCommand(
      `cat > /etc/systemd/system/taro-ttyd-${instanceName}.service << TTYDEOF
[Unit]
Description=ttyd terminal for ${containerName}
After=docker.service

[Service]
ExecStartPre=/bin/sh -c 'fuser -k ${ports.ttyd}/tcp 2>/dev/null || true'
ExecStart=/usr/bin/ttyd -i 127.0.0.1 -p ${ports.ttyd} -W docker exec -it ${containerName}-${fw.containerSuffix} /bin/sh
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
TTYDEOF
systemctl daemon-reload && systemctl enable taro-ttyd-${instanceName} && systemctl start taro-ttyd-${instanceName}`
    );

    // Deploy sync daemon
    await deploySyncDaemon(conn, instanceName, instanceId, ports.mc, agentFramework);

    // Create auto-approve service for OpenClaw device pairing (not needed for Hermes)
    if (fw.needsDevicePairing) {
      await conn.execCommand(
        `cat > /etc/systemd/system/taro-autopair-${instanceName}.service << AUTOPAIREOF
[Unit]
Description=Auto-approve OpenClaw device pairing for ${containerName}
After=docker.service

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'docker exec ${containerName}-${fw.containerSuffix} openclaw devices approve --latest 2>/dev/null || true'
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

    // Add HTTPS reverse proxy entries for agent and ttyd via Caddy
    // ttyd requires a terminal token query param for authentication
    const agentDomain = `${instanceName}.${instanceDomain}`;
    const ttydDomain = `ttyd-${instanceName}.${instanceDomain}`;
    await conn.execCommand(
      `cat > /etc/caddy/sites/${instanceName}.caddy << 'CADDYEOF'
${agentDomain} {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
    reverse_proxy 127.0.0.1:${ports.agent}
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
      await conn.execCommand(`systemctl stop taro-ttyd-${instanceName} 2>/dev/null || true`);
      if (fw.needsDevicePairing) {
        await conn.execCommand(`systemctl stop taro-autopair-${instanceName}.timer 2>/dev/null || true`);
        await conn.execCommand(`systemctl disable taro-autopair-${instanceName}.timer 2>/dev/null || true`);
      }
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
      agentPort: ports.agent,
      ttydPort: ports.ttyd,
      mcPort: ports.mc,
      containerName,
      terminalToken,
    })
    .where(eq(instances.id, instanceId));

  // Seed Mission Control data so dashboard isn't empty
  await seedInstanceData(instanceId, agentFramework);

  await logActivity(
    instanceId,
    "deploy",
    `Instance provisioned on ${serverIp} (ports ${ports.agent}/${ports.ttyd}/${ports.mc})`
  );

  conn.dispose();

  return {
    agentPort: ports.agent,
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
  agentPort: number,
  ttydPort: number,
  agentFramework: AgentFramework = "openclaw"
) => {
  validateShellName(instanceName, "instance name");
  validateShellName(containerName, "container name");
  validatePort(agentPort, "agent port");
  validatePort(ttydPort, "ttyd port");
  const conn = await getSSHConnection();
  const instanceDir = `/opt/taro/instances/${instanceName}`;
  const fw = FRAMEWORK_CONFIGS[agentFramework];

  // Ensure extra volume directories exist
  if (fw.extraVolumes.length > 0) {
    const extraDirs = fw.extraVolumes.map(v => `${instanceDir}/${v.host}`).join(" ");
    await conn.execCommand(`mkdir -p ${extraDirs}`);
    if (fw.runAsUser !== 0) {
      await conn.execCommand(`chown -R ${fw.runAsUser}:${fw.runAsUser} ${extraDirs}`);
    }
  }

  // Build volume mounts
  const volumes = [
    `./data/${fw.dataDir}:/data`,
    `./data/${fw.configDir}:${fw.configMountPath}`,
    ...fw.extraVolumes.map(v => `./${v.host}:${v.container}`),
  ];

  // Build environment variables — omit the block entirely if empty (empty `environment:` is invalid YAML)
  const envEntries = Object.entries(fw.env);
  const envBlock = envEntries.length > 0
    ? `    environment:\n${envEntries.map(([k, v]) => `      - ${k}=${v}`).join("\n")}`
    : "";

  // Build security options
  const securityOpts = ["no-new-privileges:true"];
  if (fw.useSeccomp) securityOpts.push("seccomp=/opt/taro/seccomp/openclaw-seccomp.json");

  const commandLine = fw.command ? `\n    command: ${fw.command}` : "";

  // Rebuild the docker-compose.yml with security hardening
  const compose = `
services:
  ${fw.containerSuffix}:
    image: ${fw.image}
    container_name: ${containerName}-${fw.containerSuffix}${commandLine}
    ports:
      - "127.0.0.1:${agentPort}:${fw.internalPort}"
    volumes:
${volumes.map(v => `      - ${v}`).join("\n")}
${envBlock}
    restart: unless-stopped
    mem_limit: 4g
    memswap_limit: 6g
    mem_swappiness: 60
    cpus: 2
    pids_limit: 256
    oom_score_adj: -200${fw.readOnly ? `
    read_only: true
    tmpfs:
      - /tmp:size=256m,nosuid,nodev
      - /run:size=64m,noexec,nosuid,nodev` : ""}
    security_opt:
${securityOpts.map(o => `      - ${o}`).join("\n")}
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    healthcheck:
      test: ["CMD-SHELL", "${fw.healthcheck}"]
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

  // Rewrite framework config with latest settings
  if (agentFramework === "openclaw") {
    const [instForAuth] = await db
      .select({ mcAuthToken: instances.mcAuthToken })
      .from(instances)
      .where(eq(instances.id, instanceId))
      .limit(1);
    if (instForAuth?.mcAuthToken) {
      const instanceDomainForConfig = env.INSTANCE_DOMAIN;
      const appUrlForConfig = env.APP_URL;
      const composioConsumerKey = env.COMPOSIO_CONSUMER_KEY;
      const updatedConfig = JSON.stringify({
        gateway: {
          controlUi: {
            allowedOrigins: [
              `https://${instanceName}.${instanceDomainForConfig}`,
              appUrlForConfig,
            ],
          },
          auth: { mode: "token", token: instForAuth.mcAuthToken },
          bind: "lan",
          trustedProxies: ["172.16.0.0/12", "10.0.0.0/8"],
        },
        ...(composioConsumerKey ? {
          plugins: {
            entries: {
              composio: {
                enabled: true,
                config: {
                  consumerKey: composioConsumerKey,
                },
              },
            },
          },
        } : {}),
      }, null, 2);
      await conn.execCommand(
        `cat > ${instanceDir}/data/${fw.configDir}/openclaw.json << 'CONFIGEOF'\n${updatedConfig}\nCONFIGEOF`
      );
      if (fw.runAsUser !== 0) {
        await conn.execCommand(`chown -R ${fw.runAsUser}:${fw.runAsUser} ${instanceDir}/data/${fw.configDir}`);
      }
    }
  } else if (agentFramework === "hermes") {
    // Rewrite Hermes config with latest LLM settings from DB
    const [instForModel] = await db
      .select({ llmProvider: instances.llmProvider, llmModel: instances.llmModel })
      .from(instances)
      .where(eq(instances.id, instanceId))
      .limit(1);
    const hermesConfig = JSON.stringify({
      default_model: instForModel?.llmModel || "anthropic/claude-sonnet-4-20250514",
      provider: instForModel?.llmProvider || "openrouter",
    }, null, 2);
    await conn.execCommand(
      `cat > ${instanceDir}/data/${fw.configDir}/config.json << 'CONFIGEOF'\n${hermesConfig}\nCONFIGEOF`
    );
    if (fw.runAsUser !== 0) {
      await conn.execCommand(`chown -R ${fw.runAsUser}:${fw.runAsUser} ${instanceDir}/data/${fw.configDir}`);
    }
  }

  // Stop old ttyd container if it exists, then remove it
  await conn.execCommand(
    `docker stop ${containerName}-ttyd 2>/dev/null; docker rm ${containerName}-ttyd 2>/dev/null`
  );

  // Recreate container with new config
  await conn.execCommand(`cd ${instanceDir} && docker compose up -d --force-recreate`);

  // Install ttyd on host if not present
  await conn.execCommand(
    `which ttyd || (apt-get update -qq && apt-get install -y -qq ttyd)`
  );

  // Kill any rogue process occupying the ttyd port before starting the service
  await conn.execCommand(
    `fuser -k ${ttydPort}/tcp 2>/dev/null || true`
  );

  // Create/update ttyd systemd service on host
  await conn.execCommand(
    `cat > /etc/systemd/system/taro-ttyd-${instanceName}.service << TTYDEOF
[Unit]
Description=ttyd terminal for ${containerName}
After=docker.service

[Service]
ExecStartPre=/bin/sh -c 'fuser -k ${ttydPort}/tcp 2>/dev/null || true'
ExecStart=/usr/bin/ttyd -i 127.0.0.1 -p ${ttydPort} -W docker exec -it ${containerName}-${fw.containerSuffix} /bin/sh
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
    const [inst] = await db
      .select({ id: instances.id, mcPort: instances.mcPort })
      .from(instances)
      .where(eq(instances.id, instanceId))
      .limit(1);
    if (inst?.mcPort) {
      await deploySyncDaemon(conn, instanceName, instanceId, inst.mcPort, agentFramework);
    }
  } else {
    // Update sync daemon script with latest code
    const fs = await import("fs");
    const path = await import("path");
    const syncScriptPath = path.join(process.cwd(), `docker/scripts/${fw.syncDaemonScript}`);
    try {
      const syncScript = fs.readFileSync(syncScriptPath, "utf-8");
      await conn.execCommand(
        `cat > ${instanceDir}/sync/${fw.syncDaemonScript} << 'SYNCEOF'
${syncScript}
SYNCEOF`
      );
      await conn.execCommand(`systemctl restart taro-sync-${instanceName}`);
    } catch {
      // sync script update is best-effort during reprovision
    }
  }

  // Ensure auto-approve timer exists for device pairing (OpenClaw only)
  if (fw.needsDevicePairing) {
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
ExecStart=/bin/sh -c 'docker exec ${containerName}-${fw.containerSuffix} openclaw devices approve --latest 2>/dev/null || true'
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
  }

  // Rewrite Caddy config and reload
  const [instForToken] = await db
    .select({ terminalToken: instances.terminalToken })
    .from(instances)
    .where(eq(instances.id, instanceId))
    .limit(1);
  const termToken = instForToken?.terminalToken || randomBytes(32).toString("hex");

  const instanceDomain = env.INSTANCE_DOMAIN;
  const agentDomain = `${instanceName}.${instanceDomain}`;
  const ttydDomain = `ttyd-${instanceName}.${instanceDomain}`;
  await conn.execCommand(
    `cat > /etc/caddy/sites/${instanceName}.caddy << 'CADDYEOF'
${agentDomain} {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
    reverse_proxy 127.0.0.1:${agentPort}
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
  mcPort?: number,
  agentFramework: AgentFramework = "openclaw"
) => {
  validateShellName(instanceName, "instance name");
  if (mcPort !== undefined) validatePort(mcPort, "mc port");
  const conn = await getSSHConnection();
  const instanceDir = `/opt/taro/instances/${instanceName}`;
  const fw = FRAMEWORK_CONFIGS[agentFramework];

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
      await deploySyncDaemon(conn, instanceName, instanceId, mcPort, agentFramework);
      return;
    }

    // Write the updated sync script
    const fs = await import("fs");
    const path = await import("path");
    const syncScriptPath = path.join(process.cwd(), `docker/scripts/${fw.syncDaemonScript}`);
    const syncScript = fs.readFileSync(syncScriptPath, "utf-8");
    await conn.execCommand(
      `cat > ${instanceDir}/sync/${fw.syncDaemonScript} << 'SYNCEOF'
${syncScript}
SYNCEOF`
    );

    // Restart the sync daemon to pick up changes
    await conn.execCommand(`systemctl restart taro-sync-${instanceName}`);
  } finally {
    conn.dispose();
  }
};

export const stopInstance = async (containerName: string, agentFramework?: AgentFramework) => {
  const conn = await getSSHConnection();
  const instanceName = containerName.replace("taro-", "");
  validateShellName(instanceName, "instance name");
  try {
    await conn.execCommand(
      `cd /opt/taro/instances/${instanceName} && docker compose stop`
    );
    if (agentFramework !== "hermes") {
      await conn.execCommand(`systemctl stop taro-sync-${instanceName} taro-autopair-${instanceName}.timer 2>/dev/null`);
    } else {
      await conn.execCommand(`systemctl stop taro-sync-${instanceName} 2>/dev/null`);
    }
  } finally {
    conn.dispose();
  }
};

export const startInstance = async (containerName: string, agentFramework?: AgentFramework) => {
  const conn = await getSSHConnection();
  const instanceName = containerName.replace("taro-", "");
  validateShellName(instanceName, "instance name");
  try {
    await conn.execCommand(
      `cd /opt/taro/instances/${instanceName} && docker compose start`
    );
    if (agentFramework !== "hermes") {
      await conn.execCommand(`systemctl start taro-sync-${instanceName} taro-autopair-${instanceName}.timer 2>/dev/null`);
    } else {
      await conn.execCommand(`systemctl start taro-sync-${instanceName} 2>/dev/null`);
    }
  } finally {
    conn.dispose();
  }
};

export const restartInstance = async (containerName: string, agentFramework?: AgentFramework) => {
  const conn = await getSSHConnection();
  const instanceName = containerName.replace("taro-", "");
  validateShellName(instanceName, "instance name");
  try {
    await conn.execCommand(
      `cd /opt/taro/instances/${instanceName} && docker compose restart`
    );
    await conn.execCommand(`systemctl restart taro-sync-${instanceName} 2>/dev/null`);
    if (agentFramework !== "hermes") {
      await conn.execCommand(`systemctl restart taro-autopair-${instanceName}.timer 2>/dev/null`);
    }
  } finally {
    conn.dispose();
  }
};

export const deleteInstance = async (containerName: string, instanceId?: string) => {
  const conn = await getSSHConnection();
  const instanceName = containerName.replace("taro-", "");
  validateShellName(instanceName, "instance name");
  const instanceDir = `/opt/taro/instances/${instanceName}`;
  try {
    // 0. Free ports before deletion so they can be reused
    if (instanceId) {
      await db
        .update(instances)
        .set({ agentPort: null, ttydPort: null, mcPort: null })
        .where(eq(instances.id, instanceId));
    }
    // 1. Stop systemd services FIRST (sync daemon, ttyd, autopair)
    await conn.execCommand(
      `systemctl stop taro-sync-${instanceName} taro-ttyd-${instanceName} taro-autopair-${instanceName}.timer 2>/dev/null`
    );
    // 2. Stop and remove containers
    await conn.execCommand(`cd ${instanceDir} && docker compose down -v`);
    // 3. Delete instance directory and backup files
    await conn.execCommand(`rm -rf ${instanceDir} /opt/taro/backups/${instanceName}`);
    // 4. Disable and remove systemd unit files, clean up Caddy config
    await conn.execCommand(
      `systemctl disable taro-ttyd-${instanceName} taro-sync-${instanceName} taro-autopair-${instanceName}.timer 2>/dev/null; rm -f /etc/systemd/system/taro-ttyd-${instanceName}.service /etc/systemd/system/taro-sync-${instanceName}.service /etc/systemd/system/taro-autopair-${instanceName}.service /etc/systemd/system/taro-autopair-${instanceName}.timer; rm -f /etc/caddy/sites/${instanceName}.caddy; systemctl daemon-reload; systemctl reload caddy 2>/dev/null`
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
  containerName: string,
  agentFramework: AgentFramework = "openclaw"
): Promise<ContainerStats> => {
  validateShellName(containerName.replace("taro-", ""), "container name");
  const fw = FRAMEWORK_CONFIGS[agentFramework];
  const conn = await getSSHConnection();
  try {
    const result = await conn.execCommand(
      `docker stats ${containerName}-${fw.containerSuffix} --no-stream --format '{"cpu":"{{.CPUPerc}}","mem":"{{.MemUsage}}","net":"{{.NetIO}}"}'`
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
