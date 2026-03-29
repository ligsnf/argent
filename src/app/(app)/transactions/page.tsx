import { listTransactionAccountsForUser } from "@/actions/transactions";
import { CreateTransactionForm } from "@/components/create-transaction-form";

export default async function TransactionsPage() {
  const accounts = await listTransactionAccountsForUser();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Enter multi-posting transactions. Amounts must balance to zero.
        </p>
      </div>
      <CreateTransactionForm accounts={accounts} />
    </div>
  );
}

