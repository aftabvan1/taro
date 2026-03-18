import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { logActivity } from "@/lib/activity";
import { deleteInstance } from "@/lib/provisioner";
import { eq, and } from "drizzle-orm";

// GET /api/instances/:id — get instance details
export async function GET(
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

    const { mcAuthToken: _, ...safeInstance } = instance;
    return NextResponse.json({ data: safeInstance });
  } catch (error) {
    logger.error("Get instance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/instances/:id — update instance
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;

  const patchSchema = z.object({
    name: z.string().min(1).max(63).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/).optional(),
    llmProvider: z.string().min(1).max(100).optional(),
    llmModel: z.string().min(1).max(100).optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.llmProvider !== undefined) updates.llmProvider = parsed.data.llmProvider;
    if (parsed.data.llmModel !== undefined) updates.llmModel = parsed.data.llmModel;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const [instance] = await db
      .update(instances)
      .set(updates)
      .where(and(eq(instances.id, id), eq(instances.userId, auth.userId)))
      .returning();

    if (!instance) {
      return NextResponse.json(
        { error: "Instance not found" },
        { status: 404 }
      );
    }

    const { mcAuthToken: _, ...safeInstance } = instance;
    return NextResponse.json({ data: safeInstance });
  } catch (error) {
    logger.error("Update instance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/instances/:id — delete instance
export async function DELETE(
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

    // Clean up Docker containers, systemd services, and Caddy config on the server
    if (instance.containerName) {
      try {
        await deleteInstance(instance.containerName);
      } catch (cleanupError) {
        logger.error("Container cleanup failed:", cleanupError);
        // Don't delete DB record if server cleanup fails — mark as error so user can retry
        await db
          .update(instances)
          .set({ status: "error" })
          .where(eq(instances.id, id));
        return NextResponse.json(
          { error: "Failed to clean up server resources. Instance marked as error — please retry." },
          { status: 502 }
        );
      }
    }

    await logActivity(
      id,
      "stop",
      `Instance "${instance.name}" deleted`
    );

    await db
      .delete(instances)
      .where(eq(instances.id, id));

    return NextResponse.json({ message: "Instance deleted" });
  } catch (error) {
    logger.error("Delete instance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
