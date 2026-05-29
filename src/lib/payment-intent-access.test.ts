import { describe, expect, it } from "vitest";
import { STRIPE_TAGS } from "@/lib/branding";
import {
  isPosOwnedPaymentIntent,
  isValidPaymentIntentId,
} from "@/lib/payment-intent-access";

describe("isValidPaymentIntentId", () => {
  it("accepts Stripe-style ids", () => {
    expect(isValidPaymentIntentId("pi_3QxYzAbCdEfGhIjK")).toBe(true);
  });

  it("rejects malformed ids", () => {
    expect(isValidPaymentIntentId("")).toBe(false);
    expect(isValidPaymentIntentId("ch_123")).toBe(false);
    expect(isValidPaymentIntentId("pi_../etc")).toBe(false);
  });
});

describe("isPosOwnedPaymentIntent", () => {
  it("allows POS payment_type metadata", () => {
    expect(isPosOwnedPaymentIntent({ payment_type: STRIPE_TAGS.paymentType })).toBe(true);
  });

  it("allows POS source metadata", () => {
    expect(isPosOwnedPaymentIntent({ source: STRIPE_TAGS.source })).toBe(true);
  });

  it("denies other Stripe account payments", () => {
    expect(isPosOwnedPaymentIntent({ payment_type: "ecommerce" })).toBe(false);
    expect(isPosOwnedPaymentIntent({})).toBe(false);
  });
});
