import Stripe from "stripe";
import { BRAND, STRIPE_TAGS } from "@/lib/branding";
import { sanitizeMetadataValue } from "@/lib/charge-limits";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export function isStripeTestMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return key.startsWith("sk_test_") || key.startsWith("rk_test_");
}

export function getReaderId(): string {
  const readerId = process.env.STRIPE_READER_ID;
  if (!readerId) {
    throw new Error("STRIPE_READER_ID is not configured");
  }
  return readerId;
}

export function formatGbp(amountPence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amountPence / 100);
}

export type ChargeRequest = {
  amountPence: number;
  customerName?: string;
  reference?: string;
  note?: string;
};

export type PaymentStatus =
  | "processing"
  | "requires_payment_method"
  | "requires_confirmation"
  | "requires_action"
  | "requires_capture"
  | "succeeded"
  | "canceled"
  | "failed";

export function mapPaymentIntentStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
  switch (status) {
    case "processing":
    case "requires_payment_method":
    case "requires_confirmation":
    case "requires_action":
    case "requires_capture":
    case "succeeded":
    case "canceled":
      return status;
    default:
      return "failed";
  }
}

export function buildMetadata(input: ChargeRequest): Record<string, string> {
  const metadata: Record<string, string> = {
    payment_type: STRIPE_TAGS.paymentType,
    source: STRIPE_TAGS.source,
  };

  if (input.customerName?.trim()) {
    metadata.customer_name = sanitizeMetadataValue(input.customerName);
  }
  if (input.reference?.trim()) {
    metadata.reference = sanitizeMetadataValue(input.reference);
  }
  if (input.note?.trim()) {
    metadata.note = sanitizeMetadataValue(input.note);
  }

  return metadata;
}

export function buildDescription(input: ChargeRequest): string {
  const parts: string[] = [BRAND.businessName];
  if (input.customerName?.trim()) {
    parts.push(`— ${input.customerName.trim()}`);
  }
  if (input.reference?.trim()) {
    parts.push(`(${input.reference.trim()})`);
  }
  if (input.note?.trim()) {
    parts.push(`- ${input.note.trim()}`);
  }
  return parts.join(" ");
}
