"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
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

const types = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
] as const;

function CreateAccountFormFields({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState<AccountFormState | undefined, FormData>(
    createLedgerAccount,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === undefined) return;
    if (!state.error) {
      onSuccess();
      formRef.current?.reset();
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state?.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="acct-name">Full name</Label>
        <Input id="acct-name" name="name" placeholder="expenses:subscriptions" required autoComplete="off" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="acct-type">Type</Label>
        <select
          id="acct-type"
          name="type"
          required
          className="border-input bg-background h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          defaultValue="expense"
        >
          {types.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <DialogFooter className="border-0 bg-transparent p-0 shadow-none">
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New account</DialogTitle>
          <DialogDescription>
            Use a hierarchical name with colons, for example{" "}
            <code className="text-foreground">expenses:groceries</code>. Lowercase letters and numbers only.
          </DialogDescription>
        </DialogHeader>
        <CreateAccountFormFields key={formKey} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
