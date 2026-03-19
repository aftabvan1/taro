import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, and } from "drizzle-orm";
import { NodeSSH } from "node-ssh";
import { validateShellName, validatePort } from "@/lib/shell-sanitize";
import { env } from "@/lib/env";

interface DiagnosticResult {
  label: string;
  ok: boolean;
  detail: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;

  const [instance] = await db
    .select()
    .from(instances)
    .where(and(eq(instances.id, id), eq(instances.userId, auth.userId)))
    .limit(1);

  if (!instance) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 });
  }

  const results: DiagnosticResult[] = [];
  const ssh = new NodeSSH();

  try {
    await ssh.connect({
      host: env.HETZNER_SERVER_IP,
      username: "root",
      privateKey: env.HETZNER_SSH_PRIVATE_KEY,
    });
    results.push({ label: "SSH connection", ok: true, detail: "Connected" });
  } catch (err) {
    results.push({ label: "SSH connection", ok: false, detail: (err as Error).message });
    return NextResponse.json({ results });
  }

  // Validate DB values before shell interpolation
  validateShellName(instance.name, "instance name");

  // Framework-aware config
  const framework = instance.agentFramework || "openclaw";
  const containerSuffix = framework === "hermes" ? "hermes" : "openclaw";
  const internalPort = framework === "hermes" ? 8642 : 18789;
  const frameworkLabel = framework === "hermes" ? "Hermes" : "OpenClaw";

  // Docker container
  const docker = await ssh.execCommand(
    `docker ps --filter "name=taro-${instance.name}-${containerSuffix}" --format "{{.Status}}" 2>&1`
  );
  const containerUp = docker.stdout.includes("Up");
  results.push({
    label: `${frameworkLabel} container`,
    ok: containerUp,
    detail: docker.stdout.trim() || "Not found",
  });

  // Agent API port
  const wsCheck = await ssh.execCommand(`ss -tlnp | grep ${internalPort}`);
  const wsListening = wsCheck.stdout.includes(String(internalPort));
  results.push({
    label: `${frameworkLabel} API (${internalPort})`,
    ok: wsListening,
    detail: wsListening ? "Listening" : "Not listening",
  });

  // Node.js
  const nodeCheck = await ssh.execCommand("which node && node --version 2>&1");
  const nodeInstalled = nodeCheck.code === 0;
  results.push({
    label: "Node.js",
    ok: nodeInstalled,
    detail: nodeInstalled ? nodeCheck.stdout.trim() : "Not installed",
  });

  // Sync daemon service
  const syncService = await ssh.execCommand(
    `systemctl is-active taro-sync-${instance.name} 2>&1`
  );
  const syncActive = syncService.stdout.trim() === "active";
  results.push({
    label: "Sync daemon service",
    ok: syncActive,
    detail: syncService.stdout.trim() || "Not found",
  });

  // Sync daemon port
  const mcPort = instance.mcPort ?? 0;
  if (mcPort > 0) validatePort(mcPort, "mc port");
  const portCheck = mcPort > 0
    ? await ssh.execCommand(`ss -tlnp | grep ${mcPort}`)
    : { stdout: "", code: 1 };
  const portListening = portCheck.stdout.includes(String(mcPort));
  results.push({
    label: `Sync daemon port (${mcPort})`,
    ok: portListening,
    detail: portListening ? "Listening" : "Not listening",
  });

  // Sync daemon health
  if (portListening) {
    const health = await ssh.execCommand(
      `curl -s --connect-timeout 2 http://127.0.0.1:${mcPort}/health 2>&1`
    );
    let healthOk = false;
    try {
      const parsed = JSON.parse(health.stdout);
      healthOk = parsed.status === "ok" && parsed.connected === true;
      results.push({
        label: "Sync daemon health",
        ok: healthOk,
        detail: health.stdout.trim(),
      });
    } catch {
      results.push({
        label: "Sync daemon health",
        ok: false,
        detail: health.stdout.trim() || "No response",
      });
    }
  } else {
    results.push({
      label: "Sync daemon health",
      ok: false,
      detail: "Skipped (port not listening)",
    });
  }

  ssh.dispose();

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, results });
}
