import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getReaderId, getStripe, isStripeTestMode } from "@/lib/stripe";

const TEST_CARD_SUCCESS = "4242424242424242";
const TEST_CARD_DECLINED = "4000000000009995";

export async function POST(request: Request) {
  const authError = await requireApiAuth(request);
  if (authError) {
    return authError;
  }

  if (!isStripeTestMode()) {
    return NextResponse.json(
      { error: "Card simulation is only available in Stripe test mode." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      declined?: boolean;
    };

    const stripe = getStripe();
    const readerId = getReaderId();

    await stripe.testHelpers.terminal.readers.presentPaymentMethod(readerId, {
      type: "card_present",
      card_present: {
        number: body.declined ? TEST_CARD_DECLINED : TEST_CARD_SUCCESS,
      },
    });

    return NextResponse.json({
      ok: true,
      message: body.declined
        ? "Simulated declined card on test reader."
        : "Simulated successful card tap on test reader.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not simulate card tap";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
