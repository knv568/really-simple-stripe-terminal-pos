import { describe, expect, it } from "vitest";
import {
  MAX_CHARGE_AMOUNT_PENCE,
  METADATA_VALUE_MAX_LENGTH,
  MIN_CHARGE_AMOUNT_PENCE,
  sanitizeMetadataValue,
  validateChargeAmount,
} from "@/lib/charge-limits";

describe("validateChargeAmount", () => {
  it("accepts bounds", () => {
    expect(validateChargeAmount(MIN_CHARGE_AMOUNT_PENCE)).toBeNull();
    expect(validateChargeAmount(MAX_CHARGE_AMOUNT_PENCE)).toBeNull();
  });

  it("rejects below minimum", () => {
    expect(validateChargeAmount(49)).toMatch(/£0\.50/);
  });

  it("rejects above maximum", () => {
    expect(validateChargeAmount(MAX_CHARGE_AMOUNT_PENCE + 1)).toMatch(/£1,500/);
  });

  it("rejects non-integers", () => {
    expect(validateChargeAmount(10.5)).toMatch(/whole number/);
  });
});

describe("sanitizeMetadataValue", () => {
  it("trims and caps length", () => {
    const long = "a".repeat(METADATA_VALUE_MAX_LENGTH + 20);
    const result = sanitizeMetadataValue(`  ${long}  `);
    expect(result.length).toBe(METADATA_VALUE_MAX_LENGTH);
    expect(result).toBe("a".repeat(METADATA_VALUE_MAX_LENGTH));
  });
});
