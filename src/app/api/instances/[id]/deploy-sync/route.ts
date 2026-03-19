import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, and } from "drizzle-orm";
import { NodeSSH } from "node-ssh";
import { deploySyncDaemon } from "@/lib/provisioner";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(req, { windowMs: 60 * 1000, max: 3 });
  if (limited) return limited;

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

  if (!instance.mcPort || !instance.serverIp) {
    return NextResponse.json(
      { error: "Instance not fully provisioned (missing mcPort or serverIp)" },
      { status: 400 }
    );
  }

  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: env.HETZNER_SERVER_IP,
      username: "root",
      privateKey: env.HETZNER_SSH_PRIVATE_KEY,
    });

    await deploySyncDaemon(ssh, instance.name, instance.id, instance.mcPort, instance.agentFramework);

    // Verify the service started
    const check = await ssh.execCommand(
      `systemctl is-active taro-sync-${instance.name}`
    );
    ssh.dispose();

    const active = check.stdout.trim() === "active";

    return NextResponse.json({
      ok: true,
      message: active
        ? "Sync daemon deployed and running"
        : "Sync daemon deployed but may still be starting",
      serviceActive: active,
    });
  } catch (err) {
    ssh.dispose();
    logger.error("[deploy-sync] Failed:", (err as Error).message);
    return NextResponse.json(
      { error: `Failed to deploy sync daemon: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
