import type Stripe from "stripe";
import { STRIPE_TAGS } from "@/lib/branding";

const POS_PAYMENT_TYPES = new Set<string>([STRIPE_TAGS.paymentType]);
const POS_SOURCES = new Set<string>([STRIPE_TAGS.source]);

const PAYMENT_INTENT_ID_PATTERN = /^pi_[a-zA-Z0-9]+$/;

export function isValidPaymentIntentId(id: string): boolean {
  return PAYMENT_INTENT_ID_PATTERN.test(id);
}

/** Restrict API access to PaymentIntents created by this POS (not other apps in the same Stripe account). */
export function isPosOwnedPaymentIntent(metadata: Stripe.Metadata): boolean {
  const paymentType = metadata.payment_type;
  if (paymentType && POS_PAYMENT_TYPES.has(paymentType)) {
    return true;
  }
  const source = metadata.source;
  if (source && POS_SOURCES.has(source)) {
    return true;
  }
  return false;
}
