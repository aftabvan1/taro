import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcApprovals } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;

  await db
    .update(mcApprovals)
    .set({ status: "denied" })
    .where(eq(mcApprovals.id, id));

  return NextResponse.json({ success: true });
}
