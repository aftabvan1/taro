import { NodeSSH } from "node-ssh";
import { db } from "@/lib/db";
import { backups, instances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/activity";

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

  try {
    const conn = await getSSHConnection();
    const instanceDir = `/opt/taro/instances/${instanceName}`;

    // Create backup directory
    await conn.execCommand(
      `mkdir -p /opt/taro/backups/${instanceName}`
    );

    // Stop containers briefly for consistent backup
    await conn.execCommand(`cd ${instanceDir} && docker compose pause`);

    // Tar the data directory
    await conn.execCommand(
      `tar -czf ${backupPath} -C ${instanceDir} data/`
    );

    // Resume containers
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
  const instanceDir = `/opt/taro/instances/${instanceName}`;
  const conn = await getSSHConnection();

  try {
    // Stop containers
    await conn.execCommand(`cd ${instanceDir} && docker compose stop`);

    // Remove current data and restore from backup
    await conn.execCommand(`rm -rf ${instanceDir}/data`);
    await conn.execCommand(
      `tar -xzf ${backup.storagePath} -C ${instanceDir}`
    );

    // Restart containers
    await conn.execCommand(`cd ${instanceDir} && docker compose up -d`);

    conn.dispose();

    await logActivity(
      instanceId,
      "restore",
      `Restored from backup ${backupId}`
    );
  } catch (error) {
    // Try to restart even on failure
    await conn.execCommand(`cd ${instanceDir} && docker compose up -d`);
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
