"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { createLedgerAccount, type AccountFormState } from "@/actions/accounts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const types = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
] as const;
const typeToRoot = {
  asset: "assets",
  liability: "liabilities",
  equity: "equity",
  income: "income",
  expense: "expenses",
} as const;

function CreateAccountFormFields({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState<AccountFormState | undefined, FormData>(
    createLedgerAccount,
    undefined,
  );
  const [type, setType] = useState<(typeof types)[number]["value"]>("expense");
  const [name, setName] = useState("expenses:");

  useEffect(() => {
    if (state === undefined) return;
    if (!state.error) {
      onSuccess();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex min-w-0 flex-col gap-4">
      {state?.error ? (
        <p className="text-destructive min-w-0 break-words text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="min-w-0 space-y-2">
        <Label htmlFor="acct-name">Full name</Label>
        <Input
          id="acct-name"
          name="name"
          placeholder="expenses:subscriptions"
          required
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase())}
          className="font-mono lowercase"
        />
      </div>
      <div className="min-w-0 space-y-2">
        <Label htmlFor="acct-type">Type</Label>
        <input type="hidden" name="type" value={type} />
        <Select
          value={type}
          onValueChange={(v) => {
            const nextType = v as (typeof types)[number]["value"];
            const nextRoot = typeToRoot[nextType];
            setType(nextType);
            const normalized = name.trim().toLowerCase();
            const suffix = normalized.includes(":")
              ? normalized.split(":").slice(1).join(":")
              : normalized;
            setName(suffix ? `${nextRoot}:${suffix}` : `${nextRoot}:`);
          }}
        >
          <SelectTrigger id="acct-type" className="w-full" aria-label="Account type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
          {types.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter className="mt-2 min-w-0 shrink-0 border-0 bg-transparent shadow-none">
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CreateAccountForm() {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const handleSuccess = useCallback(() => setOpen(false), []);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setFormKey((k) => k + 1);
        }
      }}
    >
      <DialogTrigger render={<Button type="button" />}>Add account</DialogTrigger>
      <DialogContent className="min-w-0 overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New account</DialogTitle>
          <DialogDescription>
            Use colons between levels, for example{" "}
            <code className="text-foreground">expenses:groceries</code> or{" "}
            <code className="text-foreground">equity:opening-balances</code>. Each segment uses lowercase
            letters, numbers, and hyphens only.
          </DialogDescription>
        </DialogHeader>
        <CreateAccountFormFields key={formKey} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
