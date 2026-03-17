import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { logActivity } from "@/lib/activity";
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

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.llmProvider !== undefined) updates.llmProvider = body.llmProvider;
    if (body.llmModel !== undefined) updates.llmModel = body.llmModel;

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

    // TODO: Sprint 3 — stop and remove Docker containers here

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
