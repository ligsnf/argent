"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, asc, count, eq, inArray, like } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { ledgerAccount, ledgerPosting } from "@/db/schema";
import { DEFAULT_LEDGER_ACCOUNTS } from "@/lib/default-ledger-accounts";
import {
  ROOT_ACCOUNT_NAMES,
  TYPE_TO_ROOT,
  accountNamePrefixes,
  isValidAccountNameFormat,
  missingPrefixesToInsert,
  nameMatchesAccountType,
  renamedPathForRow,
  renameTargetsCollideInternally,
  validateRenamePaths,
  type LedgerAccountTypeKey,
} from "@/lib/ledger-account-rules";

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function ensureDefaultLedgerAccounts() {
  const userId = await requireUserId();
  const rootDefaults = DEFAULT_LEDGER_ACCOUNTS.filter((a) => !a.name.includes(":"));
  const existing = await db
    .select({ name: ledgerAccount.name })
    .from(ledgerAccount)
    .where(eq(ledgerAccount.userId, userId));

  const existingNames = new Set(existing.map((row) => row.name));
  const missing = rootDefaults.filter((a) => !existingNames.has(a.name));
  if (missing.length === 0) {
    return { seeded: false as const };
  }

  await db.insert(ledgerAccount).values(
    missing.map((a) => ({
      userId,
      name: a.name,
      type: a.type,
    })),
  );
  return { seeded: true as const };
}

export type AccountFormState = { error?: string };
export type RenameAccountFormState = { error?: string };

export async function createLedgerAccount(
  _prev: AccountFormState | undefined,
  formData: FormData,
): Promise<AccountFormState> {
  const userId = await requireUserId();
  const nameRaw = String(formData.get("name") ?? "")
    .trim()
    .toLowerCase();
  const type = String(formData.get("type") ?? "");

  if (!isValidAccountNameFormat(nameRaw)) {
    return {
      error:
        "Use lowercase letters and numbers only, with segments separated by colons (e.g. expenses:groceries).",
    };
  }

  const allowed = new Set(["asset", "liability", "equity", "income", "expense"]);
  if (!allowed.has(type)) {
    return { error: "Pick a valid account type." };
  }
  const typeKey = type as LedgerAccountTypeKey;
  if (!nameMatchesAccountType(nameRaw, typeKey)) {
    const expectedRoot = TYPE_TO_ROOT[typeKey];
    return { error: `Name must be under ${expectedRoot} for ${type} accounts.` };
  }

  const accountType = type as "asset" | "liability" | "equity" | "income" | "expense";

  const [existingLeaf] = await db
    .select({ id: ledgerAccount.id })
    .from(ledgerAccount)
    .where(and(eq(ledgerAccount.userId, userId), eq(ledgerAccount.name, nameRaw)));
  if (existingLeaf) {
    return { error: "An account with that name already exists." };
  }

  const prefixes = accountNamePrefixes(nameRaw);
  const existingRows = await db
    .select({ name: ledgerAccount.name })
    .from(ledgerAccount)
    .where(and(eq(ledgerAccount.userId, userId), inArray(ledgerAccount.name, prefixes)));
  const existingNames = new Set(existingRows.map((r) => r.name));
  const missing = missingPrefixesToInsert(nameRaw, existingNames);

  try {
    for (const name of missing) {
      await db.insert(ledgerAccount).values({
        userId,
        name,
        type: accountType,
      });
    }
  } catch {
    return { error: "An account with that name already exists." };
  }

  revalidatePath("/accounts");
  return {};
}

export async function renameLedgerAccount(
  currentPath: string,
  _prev: RenameAccountFormState | undefined,
  formData: FormData,
): Promise<RenameAccountFormState> {
  const userId = await requireUserId();
  const nextName = String(formData.get("nextPath") ?? "")
    .trim()
    .toLowerCase();

  const pathCheck = validateRenamePaths(currentPath, nextName);
  if (!pathCheck.ok) {
    return { error: pathCheck.error };
  }
  if (nextName === currentPath) {
    return {};
  }

  const currentParts = currentPath.split(":");
  const root = currentParts[0]!;

  const directRows = await db
    .select({ id: ledgerAccount.id, name: ledgerAccount.name, type: ledgerAccount.type })
    .from(ledgerAccount)
    .where(and(eq(ledgerAccount.userId, userId), eq(ledgerAccount.name, currentPath)));
  const descendants = await db
    .select({ id: ledgerAccount.id, name: ledgerAccount.name, type: ledgerAccount.type })
    .from(ledgerAccount)
    .where(and(eq(ledgerAccount.userId, userId), like(ledgerAccount.name, `${currentPath}:%`)));

  const rowsToRename = [...directRows, ...descendants];
  if (rowsToRename.length === 0) {
    return { error: "Account branch not found." };
  }
  if (directRows.length > 0) {
    const expectedRoot = TYPE_TO_ROOT[directRows[0]!.type];
    if (expectedRoot !== root) {
      return { error: "Account root/type mismatch." };
    }
  }

  const renamePairs = rowsToRename.map((row) => ({
    id: row.id,
    from: row.name,
    to: renamedPathForRow(currentPath, nextName, row.name),
  }));

  if (renameTargetsCollideInternally(renamePairs.map((p) => p.to))) {
    return { error: "Rename would produce duplicate account names." };
  }
  const nextNames = new Set(renamePairs.map((p) => p.to));

  const allUserAccounts = await db
    .select({ id: ledgerAccount.id, name: ledgerAccount.name })
    .from(ledgerAccount)
    .where(eq(ledgerAccount.userId, userId));
  const renameIds = new Set(renamePairs.map((p) => p.id));
  const conflicting = allUserAccounts.find((row) => !renameIds.has(row.id) && nextNames.has(row.name));
  if (conflicting) {
    return { error: `Another account already uses "${conflicting.name}".` };
  }

  for (const pair of renamePairs.sort((a, b) => a.from.length - b.from.length)) {
    await db
      .update(ledgerAccount)
      .set({ name: pair.to })
      .where(and(eq(ledgerAccount.id, pair.id), eq(ledgerAccount.userId, userId)));
  }

  revalidatePath("/accounts");
  return {};
}

export async function deleteLedgerAccount(accountId: string) {
  const userId = await requireUserId();
  const [target] = await db
    .select({ id: ledgerAccount.id, name: ledgerAccount.name })
    .from(ledgerAccount)
    .where(and(eq(ledgerAccount.id, accountId), eq(ledgerAccount.userId, userId)));

  if (!target) {
    return { error: "Account not found." };
  }

  if (ROOT_ACCOUNT_NAMES.has(target.name)) {
    return { error: "Root accounts cannot be removed." };
  }

  const [childRow] = await db
    .select({ n: count() })
    .from(ledgerAccount)
    .where(and(eq(ledgerAccount.userId, userId), like(ledgerAccount.name, `${target.name}:%`)));

  if ((childRow?.n ?? 0) > 0) {
    return { error: "Remove sub-accounts first — this account still has child accounts." };
  }

  const [postRow] = await db
    .select({ n: count() })
    .from(ledgerPosting)
    .where(eq(ledgerPosting.accountId, accountId));

  if ((postRow?.n ?? 0) > 0) {
    return { error: "Cannot delete an account that already has postings." };
  }

  const removed = await db
    .delete(ledgerAccount)
    .where(and(eq(ledgerAccount.id, accountId), eq(ledgerAccount.userId, userId)))
    .returning({ id: ledgerAccount.id });

  if (removed.length === 0) {
    return { error: "Account not found." };
  }

  revalidatePath("/accounts");
  return { ok: true as const };
}

/** Form action wrapper — HTML form `action` must return void. */
export async function deleteLedgerAccountForm(accountId: string, _formData: FormData): Promise<void> {
  void _formData;
  await deleteLedgerAccount(accountId);
}

export async function listLedgerAccountsForUser() {
  const userId = await requireUserId();
  return db
    .select()
    .from(ledgerAccount)
    .where(eq(ledgerAccount.userId, userId))
    .orderBy(asc(ledgerAccount.name));
}
