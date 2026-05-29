import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  isAuthenticatedSession,
  verifyPin,
} from "@/lib/auth";

describe("verifyPin", () => {
  beforeEach(() => {
    vi.stubEnv("POS_ACCESS_PIN", "48291");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts the configured PIN", () => {
    expect(verifyPin("48291")).toBe(true);
  });

  it("rejects wrong PIN without throwing", () => {
    expect(verifyPin("00000")).toBe(false);
  });

  it("rejects wrong length in constant time path", () => {
    expect(verifyPin("4829")).toBe(false);
    expect(verifyPin("482911")).toBe(false);
  });
});

describe("session token", () => {
  beforeEach(() => {
    vi.stubEnv("POS_SESSION_SECRET", "test-secret-for-unit-tests-only");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("issues a token that validates immediately", () => {
    const token = createSessionToken();
    expect(isAuthenticatedSession(token)).toBe(true);
  });

  it("rejects tampered signature", () => {
    const token = createSessionToken();
    const [issuedAt, signature] = token.split(".");
    const badSignature = signature.startsWith("a")
      ? `b${signature.slice(1)}`
      : `a${signature.slice(1)}`;
    expect(isAuthenticatedSession(`${issuedAt}.${badSignature}`)).toBe(false);
  });

  it("rejects expired sessions", () => {
    const issuedAt = (Date.now() - 13 * 60 * 60 * 1000).toString();
    const signature = createHmac("sha256", "test-secret-for-unit-tests-only")
      .update(issuedAt)
      .digest("hex");
    expect(isAuthenticatedSession(`${issuedAt}.${signature}`)).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(isAuthenticatedSession(undefined)).toBe(false);
    expect(isAuthenticatedSession("not-a-token")).toBe(false);
  });
});
