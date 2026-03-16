import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq } from "drizzle-orm";

// Catch-all proxy to Mission Control backend
// Forwards: /api/mission-control/agents → http://{serverIp}:{mcPort}/api/agents

async function proxyToMC(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { path } = await params;
  const mcPath = "/" + path.join("/");

  try {
    // Get user's first running instance
    const [instance] = await db
      .select()
      .from(instances)
      .where(eq(instances.userId, auth.userId))
      .limit(1);

    if (!instance || !instance.serverIp || !instance.mcPort || !instance.mcAuthToken) {
      return NextResponse.json(
        { error: "No running instance found" },
        { status: 404 }
      );
    }

    const mcUrl = `http://${instance.serverIp}:${instance.mcPort}/api${mcPath}`;

    // Forward the request
    const mcRes = await fetch(mcUrl, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${instance.mcAuthToken}`,
        "Content-Type": "application/json",
      },
      body: req.method !== "GET" ? await req.text() : undefined,
    });

    const data = await mcRes.text();

    return new NextResponse(data, {
      status: mcRes.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("MC proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to Mission Control" },
      { status: 502 }
    );
  }
}

export const GET = proxyToMC;
export const POST = proxyToMC;
export const PUT = proxyToMC;
export const PATCH = proxyToMC;
export const DELETE = proxyToMC;
