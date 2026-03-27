import { describe, expect, it } from "vitest";
import {
  parseAmountToScaled,
  scaledToFixedString,
  validatePostings,
  validateTransactionInputShape,
} from "./ledger-transaction-rules";

describe("parseAmountToScaled", () => {
  it("parses signed amounts up to 4dp", () => {
    expect(parseAmountToScaled("10")).toBe(BigInt(100000));
    expect(parseAmountToScaled("-10.25")).toBe(BigInt(-102500));
    expect(parseAmountToScaled("+0.0001")).toBe(BigInt(1));
  });

  it("rejects invalid decimals", () => {
    expect(parseAmountToScaled("10.12345")).toBeNull();
    expect(parseAmountToScaled("abc")).toBeNull();
    expect(parseAmountToScaled("")).toBeNull();
  });
});

describe("scaledToFixedString", () => {
  it("formats fixed 4dp", () => {
    expect(scaledToFixedString(BigInt(123450))).toBe("12.3450");
    expect(scaledToFixedString(BigInt(-1))).toBe("-0.0001");
  });
});

describe("validatePostings", () => {
  it("requires at least 2 postings", () => {
    const res = validatePostings([{ accountId: "a", amount: "1" }]);
    expect(res.ok).toBe(false);
  });

  it("requires non-zero valid amounts", () => {
    const res = validatePostings([
      { accountId: "a", amount: "0" },
      { accountId: "b", amount: "0" },
    ]);
    expect(res.ok).toBe(false);
  });

  it("requires balanced sums", () => {
    const res = validatePostings([
      { accountId: "a", amount: "10" },
      { accountId: "b", amount: "-9.99" },
    ]);
    expect(res.ok).toBe(false);
  });

  it("returns normalized fixed amounts when balanced", () => {
    const res = validatePostings([
      { accountId: "a", amount: "10" },
      { accountId: "b", amount: "-10.0" },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.postings[0]?.amount).toBe("10.0000");
      expect(res.postings[1]?.amount).toBe("-10.0000");
    }
  });
});

describe("validateTransactionInputShape", () => {
  it("requires valid postedOn date and description", () => {
    expect(validateTransactionInputShape({ postedOn: "2026-02-30", description: "x", postings: [] }).ok).toBe(
      false,
    );
    expect(validateTransactionInputShape({ postedOn: "2026-02-28", description: "", postings: [] }).ok).toBe(
      false,
    );
  });

  it("accepts valid basics", () => {
    const res = validateTransactionInputShape({
      postedOn: "2026-02-28",
      description: "Lunch split",
      postings: [],
    });
    expect(res.ok).toBe(true);
  });
});

