import { NextResponse } from "next/server";
import { getReaderId, getStripe } from "@/lib/stripe";
import { requireApiAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const authError = await requireApiAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const stripe = getStripe();
    const reader = await stripe.terminal.readers.retrieve(getReaderId());

    if (reader.deleted) {
      return NextResponse.json({ error: "Reader not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: reader.id,
      label: reader.label ?? null,
      status: reader.status,
      deviceType: reader.device_type,
      location: reader.location,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load reader";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
