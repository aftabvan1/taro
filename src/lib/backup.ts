import { NodeSSH } from "node-ssh";
import { db } from "@/lib/db";
import { backups, instances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/activity";
import { validateShellName } from "@/lib/shell-sanitize";

const getSSHConnection = async () => {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: process.env.HETZNER_SERVER_IP!,
    username: "root",
    privateKey: process.env.HETZNER_SSH_PRIVATE_KEY!,
  });
  return ssh;
};

export const createBackup = async (instanceId: string) => {
  const [instance] = await db
    .select()
    .from(instances)
    .where(eq(instances.id, instanceId))
    .limit(1);

  if (!instance || !instance.containerName) {
    throw new Error("Instance not found or not provisioned");
  }

  const instanceName = instance.containerName.replace("taro-", "");
  validateShellName(instanceName, "instance name");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `/opt/taro/backups/${instanceName}/${timestamp}.tar.gz`;

  // Create backup record
  const [backup] = await db
    .insert(backups)
    .values({
      instanceId,
      status: "in_progress",
      storagePath: backupPath,
    })
    .returning();

  let conn: NodeSSH | null = null;

  try {
    conn = await getSSHConnection();
    const instanceDir = `/opt/taro/instances/${instanceName}`;

    // Create backup directory
    await conn.execCommand(
      `mkdir -p /opt/taro/backups/${instanceName}`
    );

    // Pause containers for consistent backup
    await conn.execCommand(`cd ${instanceDir} && docker compose pause`);

    // Tar the data directory
    await conn.execCommand(
      `tar -czf ${backupPath} -C ${instanceDir} data/`
    );

    // Resume containers immediately after tar
    await conn.execCommand(`cd ${instanceDir} && docker compose unpause`);

    // Get backup size
    const sizeResult = await conn.execCommand(`stat -c%s ${backupPath}`);
    const size = parseInt(sizeResult.stdout.trim(), 10) || 0;

    conn.dispose();

    // Update backup record
    await db
      .update(backups)
      .set({ status: "completed", size })
      .where(eq(backups.id, backup.id));

    await logActivity(
      instanceId,
      "backup",
      `Backup created (${(size / 1024 / 1024).toFixed(1)} MB)`
    );

    return { ...backup, size, status: "completed" as const };
  } catch (error) {
    // Always unpause containers and dispose SSH on error
    if (conn) {
      try {
        const instanceDir = `/opt/taro/instances/${instanceName}`;
        await conn.execCommand(`cd ${instanceDir} && docker compose unpause 2>/dev/null`);
      } catch {
        // best-effort unpause
      }
      conn.dispose();
    }

    await db
      .update(backups)
      .set({ status: "failed" })
      .where(eq(backups.id, backup.id));

    await logActivity(instanceId, "error", `Backup failed: ${error}`);

    throw error;
  }
};

export const restoreBackup = async (
  instanceId: string,
  backupId: string
) => {
  const [backup] = await db
    .select()
    .from(backups)
    .where(eq(backups.id, backupId))
    .limit(1);

  if (!backup || !backup.storagePath) {
    throw new Error("Backup not found");
  }

  const [instance] = await db
    .select()
    .from(instances)
    .where(eq(instances.id, instanceId))
    .limit(1);

  if (!instance || !instance.containerName) {
    throw new Error("Instance not found");
  }

  const instanceName = instance.containerName.replace("taro-", "");
  validateShellName(instanceName, "instance name");
  const instanceDir = `/opt/taro/instances/${instanceName}`;
  const conn = await getSSHConnection();

  try {
    // Verify backup file exists before touching anything
    const fileCheck = await conn.execCommand(`test -f ${backup.storagePath} && echo exists`);
    if (fileCheck.stdout.trim() !== "exists") {
      throw new Error("Backup file not found on server");
    }

    // Stop containers
    await conn.execCommand(`cd ${instanceDir} && docker compose stop`);

    // Extract to a temporary directory first (safe restore)
    await conn.execCommand(`rm -rf ${instanceDir}/data-restore`);
    await conn.execCommand(
      `tar -xzf ${backup.storagePath} -C ${instanceDir} --one-top-level=data-restore`
    );

    // Verify extraction succeeded
    const extractCheck = await conn.execCommand(`test -d ${instanceDir}/data-restore/data && echo ok`);
    if (extractCheck.stdout.trim() === "ok") {
      // Swap: old data -> data-old, restored -> data
      await conn.execCommand(`mv ${instanceDir}/data ${instanceDir}/data-old`);
      await conn.execCommand(`mv ${instanceDir}/data-restore/data ${instanceDir}/data`);
      await conn.execCommand(`rm -rf ${instanceDir}/data-old ${instanceDir}/data-restore`);
    } else {
      // Tar might extract directly without nested data/ — check flat extraction
      const flatCheck = await conn.execCommand(`test -d ${instanceDir}/data-restore && echo ok`);
      if (flatCheck.stdout.trim() === "ok") {
        await conn.execCommand(`mv ${instanceDir}/data ${instanceDir}/data-old`);
        await conn.execCommand(`mv ${instanceDir}/data-restore ${instanceDir}/data`);
        await conn.execCommand(`rm -rf ${instanceDir}/data-old`);
      } else {
        throw new Error("Backup extraction produced unexpected structure");
      }
    }

    // Restart containers
    await conn.execCommand(`cd ${instanceDir} && docker compose up -d`);

    conn.dispose();

    await logActivity(
      instanceId,
      "restore",
      `Restored from backup ${backupId}`
    );
  } catch (error) {
    // Try to restart even on failure, clean up temp dirs
    try {
      await conn.execCommand(`rm -rf ${instanceDir}/data-restore`);
      await conn.execCommand(`cd ${instanceDir} && docker compose up -d`);
    } catch {
      // best-effort recovery
    }
    conn.dispose();
    throw error;
  }
};

export const listBackups = async (instanceId: string) => {
  return db
    .select()
    .from(backups)
    .where(eq(backups.instanceId, instanceId))
    .orderBy(backups.createdAt);
};
