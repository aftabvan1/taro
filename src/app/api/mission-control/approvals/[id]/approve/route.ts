import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcApprovals, instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, and } from "drizzle-orm";
import { NodeSSH } from "node-ssh";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;

  // Get the approval
  const [approval] = await db
    .select()
    .from(mcApprovals)
    .where(eq(mcApprovals.id, id))
    .limit(1);

  if (!approval) {
    return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  }

  // Verify the approval belongs to the authenticated user's instance
  const [instance] = await db
    .select()
    .from(instances)
    .where(and(eq(instances.id, approval.instanceId), eq(instances.userId, auth.userId)))
    .limit(1);

  if (!instance) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Update DB status
  await db
    .update(mcApprovals)
    .set({ status: "approved" })
    .where(eq(mcApprovals.id, id));

  // Forward resolution to OpenClaw via sync daemon
  if (approval.openclawApprovalId && instance.mcPort) {
    // Validate openclawApprovalId to prevent shell injection
    if (!/^[a-zA-Z0-9_\-]+$/.test(approval.openclawApprovalId)) {
      console.error("Invalid openclawApprovalId format:", approval.openclawApprovalId);
    } else {
      try {
        const ssh = new NodeSSH();
        await ssh.connect({
          host: process.env.HETZNER_SERVER_IP!,
          username: "root",
          privateKey: process.env.HETZNER_SSH_PRIVATE_KEY!,
        });
        await ssh.execCommand(
          `curl -s -X POST http://127.0.0.1:${instance.mcPort}/resolve-approval -H 'Content-Type: application/json' -d '{"openclawApprovalId":"${approval.openclawApprovalId}","resolution":"approve"}'`
        );
        ssh.dispose();
      } catch (err) {
        console.error("Failed to forward approval to OpenClaw:", err);
      }
    }
  }

  return NextResponse.json({ success: true });
}
