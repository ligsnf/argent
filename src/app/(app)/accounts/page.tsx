import { ensureDefaultLedgerAccounts, listLedgerAccountsForUser } from "@/actions/accounts";
import { AccountTree } from "@/components/account-tree";
import { CreateAccountForm } from "@/components/create-account-form";
import { buildLedgerAccountTree, serializeLedgerTree } from "@/lib/ledger-account-tree";

export default async function AccountsPage() {
  await ensureDefaultLedgerAccounts();
  const rows = await listLedgerAccountsForUser();
  const tree = serializeLedgerTree(
    buildLedgerAccountTree(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        createdAt: r.createdAt,
      })),
    ),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chart of accounts</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Hierarchical ledger accounts (colon-separated names). Remove only works if the account has no postings yet.
          </p>
        </div>
        <CreateAccountForm />
      </div>
      <AccountTree nodes={tree} />
    </div>
  );
}
