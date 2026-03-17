import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcTaskTags } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id: taskId } = await params;
  const { tagId } = await req.json();

  await db
    .insert(mcTaskTags)
    .values({ taskId, tagId })
    .onConflictDoNothing();

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id: taskId } = await params;
  const { tagId } = await req.json();

  await db
    .delete(mcTaskTags)
    .where(and(eq(mcTaskTags.taskId, taskId), eq(mcTaskTags.tagId, tagId)));

  return NextResponse.json({ success: true });
}
