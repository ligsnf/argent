/**
 * Pure rules for hierarchical ledger account names (shared by server actions and unit tests).
 *
 * Character rules: colon-separated segments; each segment is lowercase letters, digits, and
 * single hyphens (e.g. opening-balances). This matches common plain-text ledger style without
 * spaces. Tools like hledger allow richer names; we keep a stricter subset for URLs and UX.
 *
 * Limits: no universal ledger standard for depth/length; we cap nesting and size so names stay
 * readable in the UI (lists, dialogs) and discourage over-nested charts.
 */

/** Max colon-separated levels (root + children). */
export const MAX_ACCOUNT_SEGMENTS = 10;

/** Max characters per segment (single label between colons). */
export const MAX_SEGMENT_LENGTH = 32;

/** Max total characters for the full account name string. */
export const MAX_ACCOUNT_NAME_LENGTH = 256;

export const ROOT_ACCOUNT_NAMES = new Set([
  "assets",
  "liabilities",
  "equity",
  "income",
  "expenses",
]);

export const TYPE_TO_ROOT = {
  asset: "assets",
  liability: "liabilities",
  equity: "equity",
  income: "income",
  expense: "expenses",
} as const;

export type LedgerAccountTypeKey = keyof typeof TYPE_TO_ROOT;

/** Validates one segment (between colons). */
export function validateSegment(segment: string): { ok: true } | { ok: false; error: string } {
  if (segment.length === 0) {
    return { ok: false, error: "Account name cannot contain empty segments." };
  }
  if (segment.length > MAX_SEGMENT_LENGTH) {
    return {
      ok: false,
      error: `Each segment must be at most ${MAX_SEGMENT_LENGTH} characters.`,
    };
  }
  if (!/^[a-z][a-z0-9-]*$/.test(segment)) {
    return {
      ok: false,
      error:
        "Use lowercase letters, numbers, and hyphens only in each segment (e.g. expenses:groceries or opening-balances).",
    };
  }
  if (segment.includes("--")) {
    return { ok: false, error: "Segment cannot contain consecutive hyphens." };
  }
  if (segment.endsWith("-")) {
    return { ok: false, error: "Segment cannot end with a hyphen." };
  }
  return { ok: true };
}

/** Validates a full hierarchical account name. */
export function validateAccountNameStructure(
  name: string,
): { ok: true } | { ok: false; error: string } {
  if (name.length > MAX_ACCOUNT_NAME_LENGTH) {
    return {
      ok: false,
      error: `Account name must be at most ${MAX_ACCOUNT_NAME_LENGTH} characters.`,
    };
  }
  const segments = name.split(":");
  if (segments.length > MAX_ACCOUNT_SEGMENTS) {
    return {
      ok: false,
      error: `Account name can have at most ${MAX_ACCOUNT_SEGMENTS} segments (colon-separated levels).`,
    };
  }
  for (const seg of segments) {
    const r = validateSegment(seg);
    if (!r.ok) return r;
  }
  return { ok: true };
}

export function isValidAccountNameFormat(name: string): boolean {
  return validateAccountNameStructure(name).ok;
}

/** Full name must equal the type root or be nested under `root:` */
export function nameMatchesAccountType(name: string, type: LedgerAccountTypeKey): boolean {
  const expectedRoot = TYPE_TO_ROOT[type];
  return name === expectedRoot || name.startsWith(`${expectedRoot}:`);
}

/** Every prefix path for a nested account, shortest first (includes the full path). */
export function accountNamePrefixes(fullPath: string): string[] {
  const parts = fullPath.split(":");
  const prefixes: string[] = [];
  for (let i = 1; i <= parts.length; i++) {
    prefixes.push(parts.slice(0, i).join(":"));
  }
  return prefixes;
}

/** Prefixes that must be created, ordered shallow → deep. */
export function missingPrefixesToInsert(
  fullPath: string,
  existingNames: ReadonlySet<string>,
): string[] {
  return accountNamePrefixes(fullPath)
    .filter((p) => !existingNames.has(p))
    .sort((a, b) => a.split(":").length - b.split(":").length);
}

export type RenameValidation = { ok: true } | { ok: false; error: string };

/** Validates rename before DB lookups (segment-level rename, same parent, same root). */
export function validateRenamePaths(currentPath: string, nextName: string): RenameValidation {
  const structure = validateAccountNameStructure(nextName);
  if (!structure.ok) {
    return structure;
  }

  if (ROOT_ACCOUNT_NAMES.has(currentPath)) {
    return { ok: false, error: "Root accounts cannot be renamed." };
  }

  const currentParts = currentPath.split(":");
  const nextParts = nextName.split(":");
  if (nextParts.length !== currentParts.length) {
    return { ok: false, error: "Rename can only update this level's segment." };
  }

  const currentParent = currentParts.slice(0, -1).join(":");
  const nextParent = nextParts.slice(0, -1).join(":");
  if (currentParent !== nextParent) {
    return { ok: false, error: "Rename can only update this level's segment." };
  }

  if (nextName === currentPath) {
    return { ok: true };
  }

  const root = currentParts[0]!;
  if (!ROOT_ACCOUNT_NAMES.has(root) || nextParts[0] !== root) {
    return { ok: false, error: "Rename cannot change account type/root." };
  }

  return { ok: true };
}

/** New full path for one row when renaming `currentPath` → `nextName`. */
export function renamedPathForRow(currentPath: string, nextName: string, rowName: string): string {
  return rowName === currentPath ? nextName : `${nextName}${rowName.slice(currentPath.length)}`;
}

export function renameTargetsCollideInternally(targets: readonly string[]): boolean {
  const seen = new Set<string>();
  for (const t of targets) {
    if (seen.has(t)) return true;
    seen.add(t);
  }
  return false;
}
