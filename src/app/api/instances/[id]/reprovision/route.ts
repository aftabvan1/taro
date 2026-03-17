import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { reprovisionInstance } from "@/lib/provisioner";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;

  try {
    const [instance] = await db
      .select()
      .from(instances)
      .where(and(eq(instances.id, id), eq(instances.userId, auth.userId)))
      .limit(1);

    if (!instance) {
      return NextResponse.json(
        { error: "Instance not found" },
        { status: 404 }
      );
    }

    if (!instance.serverIp || !instance.containerName || !instance.openclawPort || !instance.ttydPort) {
      return NextResponse.json(
        { error: "Instance is not fully provisioned" },
        { status: 400 }
      );
    }

    await reprovisionInstance(
      instance.id,
      instance.name,
      instance.containerName,
      instance.serverIp,
      instance.openclawPort,
      instance.ttydPort
    );

    return NextResponse.json({
      message: "Instance reprovisioned successfully",
    });
  } catch (error) {
    logger.error("Reprovision instance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
