/**
 * Pure validation and math helpers for double-entry transactions.
 */

export const MAX_POSTINGS_PER_TRANSACTION = 64;
const SCALE = BigInt(10_000); // numeric(19,4)
const ZERO = BigInt(0);
const NEGATIVE_ONE = BigInt(-1);

export type PostingInput = {
  accountId: string;
  amount: string;
  note?: string;
};

export type TransactionInput = {
  postedOn: string;
  description: string;
  status?: "unmarked" | "pending" | "cleared";
  note?: string;
  postings: PostingInput[];
};

export type ValidatedPosting = {
  accountId: string;
  amount: string; // normalized decimal string (4dp)
  scaled: bigint;
  note?: string;
};

export type ValidationResult =
  | { ok: true; postings: ValidatedPosting[] }
  | { ok: false; error: string };

const POSTED_ON_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidPostedOn(value: string): boolean {
  if (!POSTED_ON_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
}

/**
 * Parses a decimal amount to fixed 4dp bigint.
 * Supports optional +/- and up to 4 fractional digits.
 */
export function parseAmountToScaled(value: string): bigint | null {
  const raw = value.trim();
  if (!/^[+-]?\d+(?:\.\d{1,4})?$/.test(raw)) return null;
  const sign = raw.startsWith("-") ? NEGATIVE_ONE : BigInt(1);
  const unsigned = raw.startsWith("-") || raw.startsWith("+") ? raw.slice(1) : raw;
  const [whole, frac = ""] = unsigned.split(".");
  const fracPadded = frac.padEnd(4, "0");
  const scaled = BigInt(whole) * SCALE + BigInt(fracPadded);
  return sign * scaled;
}

export function scaledToFixedString(scaled: bigint): string {
  const negative = scaled < ZERO;
  const abs = negative ? -scaled : scaled;
  const whole = abs / SCALE;
  const frac = (abs % SCALE).toString().padStart(4, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${frac}`;
}

export function validatePostings(postings: PostingInput[]): ValidationResult {
  if (postings.length < 2) {
    return { ok: false, error: "Add at least two postings." };
  }
  if (postings.length > MAX_POSTINGS_PER_TRANSACTION) {
    return {
      ok: false,
      error: `Use at most ${MAX_POSTINGS_PER_TRANSACTION} postings per transaction.`,
    };
  }

  const normalized: ValidatedPosting[] = [];
  let total = ZERO;

  for (let i = 0; i < postings.length; i++) {
    const p = postings[i]!;
    if (!p.accountId?.trim()) {
      return { ok: false, error: `Posting ${i + 1}: pick an account.` };
    }

    const scaled = parseAmountToScaled(String(p.amount ?? ""));
    if (scaled === null) {
      return { ok: false, error: `Posting ${i + 1}: amount must be a decimal with up to 4 places.` };
    }
    if (scaled === ZERO) {
      return { ok: false, error: `Posting ${i + 1}: amount cannot be zero.` };
    }

    total += scaled;
    normalized.push({
      accountId: p.accountId,
      amount: scaledToFixedString(scaled),
      scaled,
      note: p.note,
    });
  }

  if (total !== ZERO) {
    return { ok: false, error: "Transaction is not balanced. Posting amounts must sum to 0.0000." };
  }

  return { ok: true, postings: normalized };
}

export function validateTransactionInputShape(input: TransactionInput): { ok: true } | { ok: false; error: string } {
  if (!isValidPostedOn(input.postedOn)) {
    return { ok: false, error: "Enter a valid posting date (YYYY-MM-DD)." };
  }
  const description = input.description.trim();
  if (!description) {
    return { ok: false, error: "Description is required." };
  }
  if (description.length > 200) {
    return { ok: false, error: "Description must be 200 characters or fewer." };
  }
  return { ok: true };
}

