import { NextRequest, NextResponse } from "next/server";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { getInstanceForUser, execSyncDaemon } from "@/lib/ssh-exec";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const instance = await getInstanceForUser(auth.userId);
  if (!instance?.mcPort) {
    return NextResponse.json({ error: "No instance found" }, { status: 404 });
  }

  const result = await execSyncDaemon(instance.mcPort, {
    method: "GET",
    path: "/openclaw/status",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "OpenClaw sync daemon unreachable", details: result.data },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data, { status: result.status });
}
