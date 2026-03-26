"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, asc, count, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { ledgerAccount, ledgerPosting } from "@/db/schema";
import { DEFAULT_LEDGER_ACCOUNTS } from "@/lib/default-ledger-accounts";

const ACCOUNT_NAME_RE = /^[a-z][a-z0-9]*(?::[a-z][a-z0-9]*)*$/;

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function ensureDefaultLedgerAccounts() {
  const userId = await requireUserId();
  const [row] = await db
    .select({ n: count() })
    .from(ledgerAccount)
    .where(eq(ledgerAccount.userId, userId));
  if ((row?.n ?? 0) > 0) {
    return { seeded: false as const };
  }
  await db.insert(ledgerAccount).values(
    DEFAULT_LEDGER_ACCOUNTS.map((a) => ({
      userId,
      name: a.name,
      type: a.type,
    })),
  );
  return { seeded: true as const };
}

export type AccountFormState = { error?: string };

export async function createLedgerAccount(
  _prev: AccountFormState | undefined,
  formData: FormData,
): Promise<AccountFormState> {
  const userId = await requireUserId();
  const nameRaw = String(formData.get("name") ?? "")
    .trim()
    .toLowerCase();
  const type = String(formData.get("type") ?? "");

  if (!ACCOUNT_NAME_RE.test(nameRaw)) {
    return {
      error:
        "Use lowercase letters and numbers only, with segments separated by colons (e.g. expenses:groceries).",
    };
  }

  const allowed = new Set(["asset", "liability", "equity", "income", "expense"]);
  if (!allowed.has(type)) {
    return { error: "Pick a valid account type." };
  }

  try {
    await db.insert(ledgerAccount).values({
      userId,
      name: nameRaw,
      type: type as "asset" | "liability" | "equity" | "income" | "expense",
    });
  } catch {
    return { error: "An account with that name already exists." };
  }

  revalidatePath("/accounts");
  return {};
}

export async function deleteLedgerAccount(accountId: string) {
  const userId = await requireUserId();

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
