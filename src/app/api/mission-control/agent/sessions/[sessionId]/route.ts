import { NextRequest, NextResponse } from "next/server";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { getInstanceForUser, execSyncDaemon } from "@/lib/ssh-exec";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { sessionId } = await params;

  // Validate sessionId format
  if (!/^[a-zA-Z0-9_:\.\-]+$/.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  const instance = await getInstanceForUser(auth.userId);
  if (!instance?.mcPort) {
    return NextResponse.json({ error: "No instance found" }, { status: 404 });
  }

  const prefix = instance.agentFramework || "openclaw";

  const result = await execSyncDaemon(instance.mcPort, {
    method: "GET",
    path: `/${prefix}/sessions/${sessionId}`,
  });

  return NextResponse.json(result.data, { status: result.status });
}
