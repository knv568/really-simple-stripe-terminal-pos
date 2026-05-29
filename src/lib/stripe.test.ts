import { describe, expect, it } from "vitest";
import { BRAND, STRIPE_TAGS } from "@/lib/branding";
import { buildDescription, buildMetadata, mapPaymentIntentStatus } from "@/lib/stripe";

describe("buildMetadata", () => {
  it("tags POS sales and trims fields", () => {
    expect(
      buildMetadata({
        amountPence: 1500,
        customerName: "  Alex  ",
        reference: "3",
        note: "oat milk",
      }),
    ).toEqual({
      payment_type: STRIPE_TAGS.paymentType,
      source: STRIPE_TAGS.source,
      customer_name: "Alex",
      reference: "3",
      note: "oat milk",
    });
  });

  it("omits empty optional fields", () => {
    expect(buildMetadata({ amountPence: 500, customerName: "   " })).toEqual({
      payment_type: STRIPE_TAGS.paymentType,
      source: STRIPE_TAGS.source,
    });
  });
});

describe("buildDescription", () => {
  it("uses business name from branding", () => {
    expect(
      buildDescription({ amountPence: 1000, customerName: "Sam", reference: "2" }),
    ).toBe(`${BRAND.businessName} — Sam (2)`);
  });
});

describe("mapPaymentIntentStatus", () => {
  it("maps known Stripe statuses", () => {
    expect(mapPaymentIntentStatus("succeeded")).toBe("succeeded");
    expect(mapPaymentIntentStatus("processing")).toBe("processing");
  });

  it("maps unknown statuses to failed", () => {
    expect(mapPaymentIntentStatus("requires_source" as "succeeded")).toBe("failed");
  });
});
