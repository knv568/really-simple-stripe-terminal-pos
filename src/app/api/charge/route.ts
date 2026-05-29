import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireApiAuth } from "@/lib/auth";
import { validateChargeAmount } from "@/lib/charge-limits";
import {
  buildDescription,
  buildMetadata,
  getReaderId,
  getStripe,
  isStripeTestMode,
  mapPaymentIntentStatus,
} from "@/lib/stripe";

const MAX_RETRIES = 3;
const COLLECT_INPUTS_TIMEOUT_MS = 130_000;
const COLLECT_INPUTS_POLL_INTERVAL_MS = 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractCollectedEmail(reader: Stripe.Terminal.Reader): string | null {
  const action = reader.action;
  if (!action || action.type !== "collect_inputs") {
    return null;
  }

  if (action.status !== "succeeded") {
    return null;
  }

  const inputs = action.collect_inputs?.inputs ?? [];
  const emailInput = inputs.find((input) => input.type === "email");
  if (!emailInput || emailInput.skipped || typeof emailInput.email?.value !== "string") {
    return null;
  }

  const email = emailInput.email.value.trim();
  return email.length > 0 ? email : null;
}

async function collectReceiptEmailFromReader(
  stripe: Stripe,
  readerId: string,
): Promise<{ email: string | null; failureMessage: string | null }> {
  await stripe.terminal.readers.collectInputs(readerId, {
    inputs: [
      {
        type: "email",
        required: false,
        custom_text: {
          title: "Email receipt",
          description: "Enter email for receipt or tap Skip.",
          submit_button: "Use email",
          skip_button: "Skip",
        },
      },
    ],
  });

  const startedAt = Date.now();
  while (Date.now() - startedAt < COLLECT_INPUTS_TIMEOUT_MS) {
    const reader = await stripe.terminal.readers.retrieve(readerId);
    if (reader.deleted) {
      return {
        email: null,
        failureMessage: "Reader could not be found. Check STRIPE_READER_ID and try again.",
      };
    }

    const action = reader.action;

    if (action?.type === "collect_inputs") {
      if (action.status === "succeeded") {
        return { email: extractCollectedEmail(reader), failureMessage: null };
      }

      if (action.status === "failed") {
        return {
          email: null,
          failureMessage: action.failure_message ?? "Could not collect receipt email.",
        };
      }
    }

    await sleep(COLLECT_INPUTS_POLL_INTERVAL_MS);
  }

  return {
    email: null,
    failureMessage: "Timed out waiting for email entry on the reader.",
  };
}

export async function POST(request: Request) {
  const authError = await requireApiAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as {
      amountPence?: number;
      customerName?: string;
      reference?: string;
      note?: string;
      requestEmailReceipt?: boolean;
    };

    const amountPence = body.amountPence ?? 0;
    const amountError = validateChargeAmount(amountPence);
    if (amountError) {
      return NextResponse.json({ error: amountError }, { status: 400 });
    }

    const stripe = getStripe();
    const readerId = getReaderId();
    const wantsEmailReceipt = Boolean(body.requestEmailReceipt);
    const chargeInput = {
      amountPence,
      customerName: body.customerName,
      reference: body.reference,
      note: body.note,
    };
    let receiptEmail: string | null = null;

    if (wantsEmailReceipt) {
      try {
        const collectResult = await collectReceiptEmailFromReader(stripe, readerId);
        if (collectResult.failureMessage) {
          return NextResponse.json({ error: collectResult.failureMessage }, { status: 409 });
        }
        receiptEmail = collectResult.email;
      } catch (error) {
        if (error instanceof Stripe.errors.StripeError) {
          if (error.code === "terminal_reader_timeout") {
            return NextResponse.json(
              { error: "Email entry timed out on the reader. Please try again." },
              { status: 408 },
            );
          }

          if (error.code === "terminal_reader_busy") {
            return NextResponse.json(
              { error: "Reader is busy. Wait a moment and try again." },
              { status: 409 },
            );
          }
        }
        throw error;
      }
    }

    const createdPaymentIntent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: "gbp",
      payment_method_types: ["card_present"],
      capture_method: "automatic",
      receipt_email: receiptEmail ?? undefined,
      description: buildDescription(chargeInput),
      metadata: buildMetadata(chargeInput),
      payment_method_options: {
        card_present: {
          request_extended_authorization: false,
          request_incremental_authorization_support: false,
        },
      },
    });
    const paymentIntent = receiptEmail
      ? await stripe.paymentIntents.update(createdPaymentIntent.id, {
          receipt_email: receiptEmail,
        })
      : createdPaymentIntent;

    let lastErrorMessage: string | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        await stripe.terminal.readers.processPaymentIntent(readerId, {
          payment_intent: paymentIntent.id,
          process_config: {
            enable_customer_cancellation: true,
          },
        });

        const testMode = isStripeTestMode();

        return NextResponse.json({
          paymentIntentId: paymentIntent.id,
          status: mapPaymentIntentStatus(paymentIntent.status),
          testMode,
          receiptEmailProvided: Boolean(receiptEmail),
          message: testMode
            ? "Test reader waiting — tap “Simulate card tap” below."
            : receiptEmail
              ? "Receipt email saved. Ask the guest to tap or insert their card on the reader."
              : "Ask the guest to tap or insert their card on the reader.",
        });
      } catch (error) {
        if (!(error instanceof Stripe.errors.StripeError)) {
          throw error;
        }

        lastErrorMessage = error.message;

        if (error.code === "terminal_reader_timeout" && attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        if (error.code === "terminal_reader_offline") {
          return NextResponse.json(
            {
              error:
                "Reader is offline. Check that the WisePOS E is powered on and connected to Wi‑Fi.",
            },
            { status: 503 },
          );
        }

        if (error.code === "terminal_reader_busy") {
          return NextResponse.json(
            { error: "Reader is busy. Wait a moment and try again." },
            { status: 409 },
          );
        }

        if (error.code === "intent_invalid_state") {
          const latest = await stripe.paymentIntents.retrieve(paymentIntent.id);
          return NextResponse.json(
            {
              error: `Payment is already ${latest.status}.`,
              paymentIntentId: paymentIntent.id,
              status: mapPaymentIntentStatus(latest.status),
            },
            { status: 409 },
          );
        }

        break;
      }
    }

    return NextResponse.json(
      { error: lastErrorMessage ?? "Could not reach the reader" },
      { status: 502 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Charge failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
