import { NextResponse } from "next/server";
import { isStripeTestMode } from "@/lib/stripe";

export async function GET() {
  return NextResponse.json({
    testMode: isStripeTestMode(),
  });
}
