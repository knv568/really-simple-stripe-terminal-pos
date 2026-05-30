import { describe, expect, it } from "vitest";
import { getPwaIconMark } from "@/lib/pwa-icon";

describe("getPwaIconMark", () => {
  it("uses the first letter of pwaShortName when iconMark is empty", () => {
    expect(getPwaIconMark()).toBe("M");
  });
});
