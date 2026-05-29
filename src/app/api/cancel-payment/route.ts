import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireApiAuth } from "@/lib/auth";
import {
  isPosOwnedPaymentIntent,
  isValidPaymentIntentId,
} from "@/lib/payment-intent-access";
import { getReaderId, getStripe } from "@/lib/stripe";

const CANCELABLE_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "requires_capture",
  "processing",
]);

export async function POST(request: Request) {
  const authError = await requireApiAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as { paymentIntentId?: string };
    const stripe = getStripe();
    const readerId = getReaderId();

    let readerCancelled = false;
    let readerBusy = false;

    try {
      await stripe.terminal.readers.cancelAction(readerId);
      readerCancelled = true;
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        if (error.code === "terminal_reader_busy") {
          readerBusy = true;
        } else if (
          error.code === "terminal_reader_invalid_action" ||
          error.code === "terminal_reader_no_action"
        ) {
          // Reader already idle — continue to cancel PaymentIntent if needed
          readerCancelled = true;
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    let paymentIntentStatus: string | null = null;

    if (body.paymentIntentId) {
      if (!isValidPaymentIntentId(body.paymentIntentId)) {
        return NextResponse.json({ error: "Invalid payment reference" }, { status: 400 });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(body.paymentIntentId);

      if (!isPosOwnedPaymentIntent(paymentIntent.metadata)) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      paymentIntentStatus = paymentIntent.status;

      if (CANCELABLE_STATUSES.has(paymentIntent.status)) {
        try {
          const cancelled = await stripe.paymentIntents.cancel(body.paymentIntentId);
          paymentIntentStatus = cancelled.status;
        } catch (cancelError) {
          if (
            cancelError instanceof Stripe.errors.StripeError &&
            cancelError.code === "payment_intent_unexpected_state"
          ) {
            const latest = await stripe.paymentIntents.retrieve(body.paymentIntentId);
            paymentIntentStatus = latest.status;
          } else {
            throw cancelError;
          }
        }
      }
    }

    if (readerBusy && paymentIntentStatus !== "canceled") {
      return NextResponse.json(
        {
          error:
            "The reader is processing a card. Wait a few seconds, or ask the guest to cancel on the reader screen.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      readerCancelled,
      paymentIntentStatus,
      message: "Transaction cancelled. You can correct the amount and try again.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not cancel transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
