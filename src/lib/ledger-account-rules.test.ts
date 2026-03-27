import { describe, expect, it } from "vitest";
import {
  MAX_ACCOUNT_NAME_LENGTH,
  MAX_ACCOUNT_SEGMENTS,
  MAX_SEGMENT_LENGTH,
  accountNamePrefixes,
  isValidAccountNameFormat,
  missingPrefixesToInsert,
  nameMatchesAccountType,
  renamedPathForRow,
  renameTargetsCollideInternally,
  validateAccountNameStructure,
  validateRenamePaths,
  validateSegment,
} from "./ledger-account-rules";

describe("validateSegment", () => {
  it("allows hyphens inside segments", () => {
    expect(validateSegment("opening-balances")).toEqual({ ok: true });
    expect(validateSegment("a-b")).toEqual({ ok: true });
  });
  it("rejects consecutive hyphens and trailing hyphen", () => {
    expect(validateSegment("a--b").ok).toBe(false);
    expect(validateSegment("foo-").ok).toBe(false);
  });
});

describe("validateAccountNameStructure / isValidAccountNameFormat", () => {
  it("accepts root and nested names including hyphens", () => {
    expect(isValidAccountNameFormat("expenses")).toBe(true);
    expect(isValidAccountNameFormat("expenses:groceries")).toBe(true);
    expect(isValidAccountNameFormat("equity:opening-balances")).toBe(true);
    expect(isValidAccountNameFormat("expenses:me:dates:test:fire")).toBe(true);
  });
  it("rejects invalid segments", () => {
    expect(isValidAccountNameFormat("Expenses")).toBe(false);
    expect(isValidAccountNameFormat("expenses:")).toBe(false);
    expect(isValidAccountNameFormat(":expenses")).toBe(false);
    expect(isValidAccountNameFormat("expenses::groceries")).toBe(false);
    expect(isValidAccountNameFormat("expenses:bad_underscore")).toBe(false);
  });
  it("rejects too many segments", () => {
    const parts = Array.from({ length: MAX_ACCOUNT_SEGMENTS + 1 }, () => "x");
    const name = parts.join(":");
    const r = validateAccountNameStructure(name);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/segments/);
  });
  it("rejects segment longer than max", () => {
    const seg = "a".repeat(MAX_SEGMENT_LENGTH + 1);
    const r = validateAccountNameStructure(`expenses:${seg}`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/segment/i);
  });
  it("rejects full path longer than max", () => {
    const name = "x".repeat(MAX_ACCOUNT_NAME_LENGTH + 1);
    const r = validateAccountNameStructure(name);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/256/);
  });
});

describe("nameMatchesAccountType", () => {
  it("requires name under the type root", () => {
    expect(nameMatchesAccountType("expenses", "expense")).toBe(true);
    expect(nameMatchesAccountType("expenses:foo", "expense")).toBe(true);
    expect(nameMatchesAccountType("assets:cash", "asset")).toBe(true);
    expect(nameMatchesAccountType("test", "expense")).toBe(false);
    expect(nameMatchesAccountType("income:salary", "expense")).toBe(false);
  });
});

describe("accountNamePrefixes & missingPrefixesToInsert", () => {
  it("lists every prefix in order", () => {
    expect(accountNamePrefixes("expenses:a:b")).toEqual(["expenses", "expenses:a", "expenses:a:b"]);
  });
  it("returns missing prefixes shallow to deep", () => {
    const existing = new Set(["expenses", "expenses:a"]);
    expect(missingPrefixesToInsert("expenses:a:b:c", existing)).toEqual([
      "expenses:a:b",
      "expenses:a:b:c",
    ]);
  });
  it("returns all segments when nothing exists", () => {
    expect(missingPrefixesToInsert("expenses:x", new Set())).toEqual(["expenses", "expenses:x"]);
  });
});

describe("validateRenamePaths", () => {
  it("allows no-op same path", () => {
    expect(validateRenamePaths("expenses:meals", "expenses:meals")).toEqual({ ok: true });
  });
  it("rejects renaming roots", () => {
    const r = validateRenamePaths("expenses", "expenses:food");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Root");
  });
  it("allows segment change at same level", () => {
    expect(validateRenamePaths("expenses:meals", "expenses:food")).toEqual({ ok: true });
  });
  it("allows hyphenated segment rename", () => {
    expect(validateRenamePaths("equity:old", "equity:opening-balances")).toEqual({ ok: true });
  });
  it("rejects depth change", () => {
    const r = validateRenamePaths("expenses:meals:dates", "expenses:me");
    expect(r.ok).toBe(false);
  });
  it("rejects parent change", () => {
    const r = validateRenamePaths("expenses:meals", "income:meals");
    expect(r.ok).toBe(false);
  });
  it("rejects invalid segment characters", () => {
    const r = validateRenamePaths("expenses:meals", "expenses:meal_stuff");
    expect(r.ok).toBe(false);
  });
});

describe("renamedPathForRow", () => {
  it("replaces branch prefix for descendants", () => {
    expect(renamedPathForRow("expenses:meals", "expenses:food", "expenses:meals:dates")).toBe(
      "expenses:food:dates",
    );
  });
});

describe("renameTargetsCollideInternally", () => {
  it("detects duplicate targets", () => {
    expect(renameTargetsCollideInternally(["a", "b", "a"])).toBe(true);
    expect(renameTargetsCollideInternally(["a", "b"])).toBe(false);
  });
});
