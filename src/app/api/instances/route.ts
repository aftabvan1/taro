import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { db } from "@/lib/db";
import { instances, users } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { logActivity } from "@/lib/activity";
import { provisionInstance } from "@/lib/provisioner";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

const createInstanceSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(30)
    .regex(
      /^[a-z0-9-]+$/,
      "Name must be lowercase alphanumeric with hyphens only"
    ),
});

// GET /api/instances — list user's instances
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  try {
    const userInstances = await db
      .select()
      .from(instances)
      .where(eq(instances.userId, auth.userId))
      .orderBy(instances.createdAt);

    return NextResponse.json({ data: userInstances });
  } catch (error) {
    logger.error("List instances error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/instances — create a new instance
export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = createInstanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    // Require active Stripe subscription before allowing instance creation
    const [user] = await db
      .select({
        stripeSubscriptionId: users.stripeSubscriptionId,
      })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);

    if (!user?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Active subscription required. Please subscribe before deploying an instance." },
        { status: 402 }
      );
    }

    // Check for duplicate instance name for this user
    const existing = await db
      .select({ id: instances.id })
      .from(instances)
      .where(eq(instances.userId, auth.userId))
      .limit(1);

    // Pro plan: 1 instance max
    if (existing.length >= 1) {
      return NextResponse.json(
        { error: "Instance limit reached for your plan" },
        { status: 403 }
      );
    }

    const mcAuthToken = randomBytes(32).toString("hex");

    const [instance] = await db
      .insert(instances)
      .values({
        userId: auth.userId,
        name,
        status: "provisioning",
        mcAuthToken,
      })
      .returning();

    await logActivity(
      instance.id,
      "deploy",
      `Instance "${name}" created`
    );

    // Trigger Docker provisioning (fire-and-forget — don't block the response)
    provisionInstance(instance.id, name, mcAuthToken).catch((err) => {
      logger.error("Provisioning failed:", err);
      db.update(instances)
        .set({ status: "error" })
        .where(eq(instances.id, instance.id))
        .catch((e) => logger.error("Failed to update instance status:", e));
    });

    const { mcAuthToken: _, ...safeInstance } = instance;
    return NextResponse.json(
      { data: safeInstance, message: "Instance provisioning started" },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Create instance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
