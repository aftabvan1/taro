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
import { rateLimit } from "@/lib/rate-limit";

const createInstanceSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(30)
    .regex(
      /^[a-z0-9-]+$/,
      "Name must be lowercase alphanumeric with hyphens only"
    ),
  agentFramework: z.enum(["openclaw", "hermes"]).default("openclaw"),
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
  const limited = await rateLimit(req, { windowMs: 60 * 60 * 1000, max: 5 });
  if (limited) return limited;

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

    const { name, agentFramework } = parsed.data;

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

    // Pro plan: 1 instance max
    const existing = await db
      .select({ id: instances.id })
      .from(instances)
      .where(eq(instances.userId, auth.userId))
      .limit(1);

    if (existing.length >= 1) {
      return NextResponse.json(
        { error: "Instance limit reached for your plan" },
        { status: 403 }
      );
    }

    // Instance names are used in DNS subdomains — must be globally unique
    const nameTaken = await db
      .select({ id: instances.id })
      .from(instances)
      .where(eq(instances.name, name))
      .limit(1);

    if (nameTaken.length > 0) {
      return NextResponse.json(
        { error: "Instance name is already taken. Please choose a different name." },
        { status: 409 }
      );
    }

    const mcAuthToken = randomBytes(32).toString("hex");

    const [instance] = await db
      .insert(instances)
      .values({
        userId: auth.userId,
        name,
        agentFramework,
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
    provisionInstance(instance.id, name, mcAuthToken, agentFramework).catch(async (err) => {
      logger.error("Provisioning failed:", err);
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await db.update(instances)
            .set({ status: "error" })
            .where(eq(instances.id, instance.id));
          return;
        } catch (e) {
          logger.error(`Failed to mark instance as error (attempt ${attempt + 1}/3):`, e);
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
      logger.error(`CRITICAL: Instance ${instance.id} stuck in provisioning state — manual intervention needed`);
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
