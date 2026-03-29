"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, asc, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { ledgerAccount, ledgerPosting, ledgerTransaction } from "@/db/schema";
import {
  type PostingInput,
  type TransactionInput,
  validatePostings,
  validateTransactionInputShape,
} from "@/lib/ledger-transaction-rules";

export type CreateTransactionState = {
  error?: string;
  transactionId?: string;
};

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

function normalizePostingInputs(input: TransactionInput): PostingInput[] {
  return input.postings.map((p) => ({
    accountId: String(p.accountId ?? "").trim(),
    amount: String(p.amount ?? "").trim(),
    note: p.note?.trim() || undefined,
  }));
}

function parsePostedOnDate(postedOn: string): Date {
  return new Date(`${postedOn}T00:00:00.000Z`);
}

export async function createLedgerTransaction(input: TransactionInput): Promise<CreateTransactionState> {
  const userId = await requireUserId();

  const shape = validateTransactionInputShape(input);
  if (!shape.ok) return { error: shape.error };

  const normalizedPostings = normalizePostingInputs(input);
  const postingCheck = validatePostings(normalizedPostings);
  if (!postingCheck.ok) return { error: postingCheck.error };

  const accountIds = [...new Set(postingCheck.postings.map((p) => p.accountId))];
  const allowedAccounts = await db
    .select({ id: ledgerAccount.id })
    .from(ledgerAccount)
    .where(and(eq(ledgerAccount.userId, userId), inArray(ledgerAccount.id, accountIds)));
  const allowedIdSet = new Set(allowedAccounts.map((a) => a.id));
  if (!accountIds.every((id) => allowedIdSet.has(id))) {
    return { error: "One or more postings reference an unknown account." };
  }

  const [txRow] = await db
    .insert(ledgerTransaction)
    .values({
      userId,
      postedOn: parsePostedOnDate(input.postedOn),
      description: input.description.trim(),
      status: input.status ?? "unmarked",
      note: input.note?.trim() || null,
    })
    .returning({ id: ledgerTransaction.id });

  if (!txRow) {
    return { error: "Could not create transaction." };
  }

  try {
    await db.insert(ledgerPosting).values(
      postingCheck.postings.map((p) => ({
        transactionId: txRow.id,
        accountId: p.accountId,
        amount: p.amount,
        note: p.note ?? null,
      })),
    );
  } catch {
    // Best-effort cleanup because neon-http driver doesn't support transactions.
    await db.delete(ledgerTransaction).where(eq(ledgerTransaction.id, txRow.id));
    return { error: "Could not save postings for this transaction." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { transactionId: txRow.id };
}

export async function listTransactionAccountsForUser() {
  const userId = await requireUserId();
  return db
    .select({
      id: ledgerAccount.id,
      name: ledgerAccount.name,
      type: ledgerAccount.type,
    })
    .from(ledgerAccount)
    .where(eq(ledgerAccount.userId, userId))
    .orderBy(asc(ledgerAccount.name));
}

