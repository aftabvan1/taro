import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users, instances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { stopInstance } from "@/lib/provisioner";
import { logActivity } from "@/lib/activity";
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

        // Idempotency: skip if user already has this subscription
        const [existingUser] = await db
          .select({ plan: users.plan, stripeSubscriptionId: users.stripeSubscriptionId })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (existingUser?.stripeSubscriptionId === (session.subscription as string)) {
          logger.info(`Webhook already processed for user ${userId}, skipping`);
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

        if (subscription.status === "active" || subscription.status === "trialing") {
          await db
            .update(users)
            .set({
              plan: "pro",
              stripeSubscriptionId: subscription.id,
            })
            .where(eq(users.stripeCustomerId, customerId));
          logger.info(`Subscription ${subscription.id} active, plan set to pro`);
        } else if (subscription.status === "past_due" || subscription.status === "unpaid") {
          logger.error(`Subscription ${subscription.id} is ${subscription.status} for customer ${customerId}`);
          // Keep plan as-is but log — Stripe will fire invoice.payment_failed for action
        }
        // Note: "canceled" and "incomplete_expired" are handled by the
        // customer.subscription.deleted event below — no action needed here.
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Downgrade plan
        const [downgraded] = await db
          .update(users)
          .set({
            plan: "hobby",
            stripeSubscriptionId: null,
          })
          .where(eq(users.stripeCustomerId, customerId))
          .returning({ id: users.id });

        if (downgraded) {
          // Stop all running instances so they don't get free hosting
          const userInstances = await db
            .select({ id: instances.id, containerName: instances.containerName, agentFramework: instances.agentFramework, status: instances.status })
            .from(instances)
            .where(eq(instances.userId, downgraded.id));

          for (const inst of userInstances) {
            if (inst.status === "running" && inst.containerName) {
              try {
                await stopInstance(inst.containerName, inst.agentFramework);
                await db
                  .update(instances)
                  .set({ status: "stopped" })
                  .where(eq(instances.id, inst.id));
              } catch (err) {
                logger.error(`Failed to stop instance ${inst.id} on subscription cancel:`, err);
                await db
                  .update(instances)
                  .set({ status: "error" })
                  .where(eq(instances.id, inst.id));
              }
            }
          }
        }

        logger.info(`Subscription ${subscription.id} canceled, user downgraded to hobby`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const failedCustomerId = invoice.customer as string;
        logger.error(`Payment failed for invoice ${invoice.id}, customer ${failedCustomerId}`);

        // Find user and log activity on their instances
        const [failedUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.stripeCustomerId, failedCustomerId))
          .limit(1);

        if (failedUser) {
          const failedInstances = await db
            .select({ id: instances.id })
            .from(instances)
            .where(eq(instances.userId, failedUser.id));

          for (const inst of failedInstances) {
            await logActivity(
              inst.id,
              "error",
              "Payment failed — please update your payment method to avoid service interruption"
            );
          }
        }
        break;
      }

      default:
        logger.info(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (error) {
    logger.error("Stripe webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
