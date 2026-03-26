export type DefaultLedgerAccountRow = {
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
};

export const DEFAULT_LEDGER_ACCOUNTS: DefaultLedgerAccountRow[] = [
  { name: "assets", type: "asset" },
  { name: "assets:bank", type: "asset" },
  { name: "assets:cash", type: "asset" },
  { name: "liabilities", type: "liability" },
  { name: "liabilities:credit", type: "liability" },
  { name: "equity", type: "equity" },
  { name: "equity:opening-balances", type: "equity" },
  { name: "income", type: "income" },
  { name: "expenses", type: "expense" },
  { name: "expenses:adjustments", type: "expense" },
];
