import Stripe from "stripe";

let _stripe: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
};

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!;

/**
 * Create a Stripe Checkout session for a new subscription.
 */
export const createCheckoutSession = async (
  userId: string,
  email: string,
  customerId?: string | null
) => {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: customerId || undefined,
    customer_email: customerId ? undefined : email,
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
    metadata: { userId },
  });

  return session;
};

/**
 * Create a Stripe Customer Portal session for managing subscriptions.
 */
export const createPortalSession = async (customerId: string) => {
  const stripe = getStripe();
  const portalConfig = process.env.STRIPE_PORTAL_CONFIG_ID;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    ...(portalConfig ? { configuration: portalConfig } : {}),
  });

  return session;
};
