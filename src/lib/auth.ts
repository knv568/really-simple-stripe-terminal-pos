import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "pos_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function getSessionSecret(): string {
  const secret = process.env.POS_SESSION_SECRET;
  if (!secret) {
    throw new Error("POS_SESSION_SECRET is not configured");
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

export function createSessionToken(): string {
  const issuedAt = Date.now().toString();
  const signature = signPayload(issuedAt);
  return `${issuedAt}.${signature}`;
}

export function isAuthenticatedSession(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) {
    return false;
  }

  const expected = signPayload(issuedAt);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return false;
  }

  const ageMs = Date.now() - Number(issuedAt);
  return ageMs >= 0 && ageMs <= SESSION_MAX_AGE_SECONDS * 1000;
}

export function verifyPin(pin: string): boolean {
  const expectedPin = process.env.POS_ACCESS_PIN;
  if (!expectedPin) {
    throw new Error("POS_ACCESS_PIN is not configured");
  }

  const pinBuffer = Buffer.from(pin);
  const expectedBuffer = Buffer.from(expectedPin);

  if (pinBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(pinBuffer, expectedBuffer);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export async function requireApiAuth(request: Request): Promise<Response | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)pos_session=([^;]+)/);
  const token = match?.[1];

  if (!isAuthenticatedSession(token)) {
    return unauthorizedResponse();
  }

  return null;
}
