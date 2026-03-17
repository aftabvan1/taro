import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcBoardGroups } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;
  const body = await req.json();

  const [updated] = await db
    .update(mcBoardGroups)
    .set({ name: body.name })
    .where(eq(mcBoardGroups.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    created_at: updated.createdAt.toISOString(),
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;
  await db.delete(mcBoardGroups).where(eq(mcBoardGroups.id, id));
  return NextResponse.json({ success: true });
}
