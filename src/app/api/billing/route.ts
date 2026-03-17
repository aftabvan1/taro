import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { createCheckoutSession, createPortalSession } from "@/lib/stripe";
import { eq } from "drizzle-orm";

// GET /api/billing — get current subscription status
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  try {
    const [user] = await db
      .select({
        plan: users.plan,
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId,
      })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        plan: user.plan,
        hasSubscription: !!user.stripeSubscriptionId,
      },
    });
  } catch (error) {
    logger.error("Get billing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/billing — create checkout session or portal session
export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  try {
    const body = await req.json();
    const { action } = body;

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId,
      })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "checkout") {
      const session = await createCheckoutSession(
        user.id,
        user.email,
        user.stripeCustomerId
      );
      return NextResponse.json({ data: { url: session.url } });
    }

    if (action === "portal") {
      if (!user.stripeCustomerId) {
        return NextResponse.json(
          { error: "No billing account found. Please subscribe first." },
          { status: 400 }
        );
      }
      const session = await createPortalSession(user.stripeCustomerId);
      return NextResponse.json({ data: { url: session.url } });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("Billing action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
