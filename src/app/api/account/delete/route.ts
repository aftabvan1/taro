import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { verifyPassword } from "@/lib/auth";
import { deleteInstance } from "@/lib/provisioner";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

const schema = z.object({
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Password is required to delete your account" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    // Clean up any running instances on the server
    const userInstances = await db
      .select({ containerName: instances.containerName })
      .from(instances)
      .where(eq(instances.userId, auth.userId));

    for (const inst of userInstances) {
      if (inst.containerName) {
        try {
          await deleteInstance(inst.containerName);
        } catch (err) {
          logger.error("Instance cleanup during account deletion:", err);
        }
      }
    }

    // Delete user (cascades to instances, backups, activity, etc.)
    await db.delete(users).where(eq(users.id, auth.userId));

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error) {
    logger.error("Delete account error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
