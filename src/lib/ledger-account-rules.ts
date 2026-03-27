/**
 * Pure rules for hierarchical ledger account names (shared by server actions and unit tests).
 */

export const ACCOUNT_NAME_RE = /^[a-z][a-z0-9]*(?::[a-z][a-z0-9]*)*$/;

export const SEGMENT_RE = /^[a-z][a-z0-9]*$/;

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

export function isValidAccountNameFormat(name: string): boolean {
  return ACCOUNT_NAME_RE.test(name);
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
  if (!isValidAccountNameFormat(nextName)) {
    return {
      ok: false,
      error:
        "Use lowercase letters and numbers only, with segments separated by colons (e.g. expenses:groceries).",
    };
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

  const nextSegment = nextParts[nextParts.length - 1]!;
  if (!SEGMENT_RE.test(nextSegment)) {
    return { ok: false, error: "Segment must use lowercase letters and numbers only." };
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
