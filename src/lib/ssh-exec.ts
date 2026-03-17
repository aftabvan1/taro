import { NodeSSH } from "node-ssh";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Execute an HTTP request against the sync daemon running on the Hetzner server
 * via SSH tunnel. This avoids duplicating SSH boilerplate across API routes.
 */

interface SyncDaemonRequestOptions {
  /** HTTP method */
  method: "GET" | "POST";
  /** Path on the sync daemon, e.g. "/openclaw/sessions" */
  path: string;
  /** JSON body for POST requests */
  body?: Record<string, unknown>;
}

interface SyncDaemonResponse {
  ok: boolean;
  status: number;
  data: unknown;
}

/**
 * Get the instance for a given userId and validate it has a running sync daemon.
 */
export async function getInstanceForUser(userId: string) {
  const [instance] = await db
    .select()
    .from(instances)
    .where(eq(instances.userId, userId))
    .limit(1);

  return instance ?? null;
}

/**
 * Execute an HTTP request to the sync daemon via SSH.
 */
export async function execSyncDaemon(
  mcPort: number,
  options: SyncDaemonRequestOptions
): Promise<SyncDaemonResponse> {
  const serverIp = process.env.HETZNER_SERVER_IP;
  const privateKey = process.env.HETZNER_SSH_PRIVATE_KEY;

  if (!serverIp || !privateKey) {
    return { ok: false, status: 500, data: { error: "SSH not configured" } };
  }

  // Validate path to prevent shell injection
  if (!/^\/[a-zA-Z0-9/_\-:.?=&%]*$/.test(options.path)) {
    return { ok: false, status: 400, data: { error: "Invalid path" } };
  }

  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: serverIp,
      username: "root",
      privateKey,
      readyTimeout: 5000,
    });

    let curlCmd: string;
    if (options.method === "GET") {
      curlCmd = `curl -s --connect-timeout 3 --max-time 8 -w '\\n%{http_code}' http://127.0.0.1:${mcPort}${options.path}`;
    } else {
      const bodyJson = JSON.stringify(options.body ?? {}).replace(/'/g, "'\\''");
      curlCmd = `curl -s --connect-timeout 3 --max-time 8 -w '\\n%{http_code}' -X POST http://127.0.0.1:${mcPort}${options.path} -H 'Content-Type: application/json' -d '${bodyJson}'`;
    }

    const result = await Promise.race([
      ssh.execCommand(curlCmd),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("SSH execCommand timeout")), 12000)
      ),
    ]);

    if (result.code !== 0) {
      logger.error(`[execSyncDaemon] SSH command failed on port ${mcPort}${options.path}:`, result.stderr);
      return {
        ok: false,
        status: 502,
        data: { error: "SSH command failed", stderr: result.stderr },
      };
    }

    // Parse response: last line is HTTP status code
    const lines = result.stdout.trim().split("\n");
    const httpStatus = parseInt(lines.pop() || "500", 10);
    const responseBody = lines.join("\n");

    let data: unknown;
    try {
      data = JSON.parse(responseBody);
    } catch {
      data = { raw: responseBody };
    }

    return {
      ok: httpStatus >= 200 && httpStatus < 300,
      status: httpStatus,
      data,
    };
  } catch (err) {
    logger.error(`[execSyncDaemon] SSH error for port ${mcPort}${options.path}:`, (err as Error).message);
    return {
      ok: false,
      status: 502,
      data: { error: `SSH error: ${(err as Error).message}` },
    };
  } finally {
    ssh.dispose();
  }
}
