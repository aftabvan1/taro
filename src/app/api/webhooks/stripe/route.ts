import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    logger.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    logger.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId) {
          logger.error("Stripe checkout webhook missing userId in metadata", {
            sessionId: session.id,
            customer: session.customer,
          });
          break;
        }

        await db
          .update(users)
          .set({
            plan: "pro",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          })
          .where(eq(users.id, userId));

        logger.info(`User ${userId} subscribed to Pro plan`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const plan = subscription.status === "active" ? "pro" : "hobby";
        await db
          .update(users)
          .set({
            plan,
            stripeSubscriptionId: subscription.id,
          })
          .where(eq(users.stripeCustomerId, customerId));

        logger.info(`Subscription ${subscription.id} updated to ${plan}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await db
          .update(users)
          .set({
            plan: "hobby",
            stripeSubscriptionId: null,
          })
          .where(eq(users.stripeCustomerId, customerId));

        logger.info(`Subscription ${subscription.id} canceled, downgraded to hobby`);
        break;
      }
    }
  } catch (error) {
    logger.error("Stripe webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
