import { NextResponse } from "next/server";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
  verifyPin,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pin?: string };
    const pin = body.pin?.trim() ?? "";

    if (!verifyPin(pin)) {
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
    }

    const token = createSessionToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
