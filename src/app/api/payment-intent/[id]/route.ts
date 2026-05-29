import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import {
  isPosOwnedPaymentIntent,
  isValidPaymentIntentId,
} from "@/lib/payment-intent-access";
import { formatGbp, getStripe, mapPaymentIntentStatus } from "@/lib/stripe";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const authError = await requireApiAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const { id } = await context.params;
    if (!isValidPaymentIntentId(id)) {
      return NextResponse.json({ error: "Invalid payment reference" }, { status: 400 });
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(id);

    if (!isPosOwnedPaymentIntent(paymentIntent.metadata)) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: paymentIntent.id,
      status: mapPaymentIntentStatus(paymentIntent.status),
      amountPence: paymentIntent.amount,
      amountFormatted: formatGbp(paymentIntent.amount),
      receiptEmail: paymentIntent.receipt_email ?? null,
      lastPaymentErrorCode: paymentIntent.last_payment_error?.code ?? null,
      lastPaymentErrorMessage: paymentIntent.last_payment_error?.message ?? null,
      metadata: paymentIntent.metadata,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
