import { NextRequest, NextResponse } from "next/server";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { getInstanceForUser, execSyncDaemon } from "@/lib/ssh-exec";

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const instance = await getInstanceForUser(auth.userId);
  if (!instance?.mcPort) {
    return NextResponse.json({ error: "No instance found" }, { status: 404 });
  }

  const body = await req.json();
  const { message, sessionId } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  // Limit message length
  if (message.length > 10000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const result = await execSyncDaemon(instance.mcPort, {
    method: "POST",
    path: "/openclaw/chat",
    body: { message, sessionId: sessionId || undefined },
  });

  return NextResponse.json(result.data, { status: result.status });
}
