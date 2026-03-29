"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, Trash2Icon } from "lucide-react";
import { createLedgerTransaction } from "@/actions/transactions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AccountOption = {
  id: string;
  name: string;
  type: string;
};

type PostingDraft = {
  accountId: string;
  amount: string;
  note: string;
};

type AccountComboItem = { value: string; label: string };

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeAmountInput(raw: string): string {
  let value = raw.replace(/[^0-9.\-]/g, "");
  const hasLeadingMinus = value.startsWith("-");
  value = value.replace(/-/g, "");
  if (hasLeadingMinus) value = `-${value}`;

  const dot = value.indexOf(".");
  if (dot !== -1) {
    value = `${value.slice(0, dot + 1)}${value.slice(dot + 1).replace(/\./g, "")}`;
  }

  if (value === "-.") return "-0.";
  if (value.startsWith(".")) return `0${value}`;
  if (value.startsWith("-.")) return `-0.${value.slice(2)}`;
  return value;
}

function finalizeAmountOnBlur(raw: string): string {
  const value = raw.trim();
  if (!value || value === "-" || value === "0." || value === "-0.") return "";

  const m = value.match(/^(-?)(\d+)(?:\.(\d*))?$/);
  if (!m) return value;

  const sign = m[1] ?? "";
  let integer = m[2] ?? "0";
  const fraction = m[3];

  integer = integer.replace(/^0+(?=\d)/, "");
  if (!integer) integer = "0";

  if (fraction === undefined || fraction === "") {
    return `${sign}${integer}`;
  }
  return `${sign}${integer}.${fraction}`;
}

function DatePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00.000Z`) : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor="tx-postedOn">Date</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" id="tx-postedOn" className="w-full justify-start font-normal" />
          }
        >
          {selected ? selected.toLocaleDateString() : "Select date"}
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            captionLayout="dropdown"
            onSelect={(date) => {
              if (!date) return;
              onChange(date.toISOString().slice(0, 10));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function AccountCombobox({
  value,
  onChange,
  items,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  items: AccountComboItem[];
  id: string;
}) {
  const selected = items.find((o) => o.value === value) ?? null;

  return (
    <Combobox items={items} value={selected} onValueChange={(next) => onChange(next?.value ?? "")}>
      <ComboboxInput id={id} placeholder="Search account..." aria-label="Search account" showClear />
      <ComboboxContent>
        <ComboboxEmpty>No account found.</ComboboxEmpty>
        <ComboboxList className="max-h-32">
          {(item: AccountComboItem) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function PostingRow({
  index,
  posting,
  accountItems,
  canRemove,
  onAccountChange,
  onAmountChange,
  onAmountBlur,
  onNoteChange,
  onRemove,
}: {
  index: number;
  posting: PostingDraft;
  accountItems: AccountComboItem[];
  canRemove: boolean;
  onAccountChange: (accountId: string) => void;
  onAmountChange: (amount: string) => void;
  onAmountBlur: () => void;
  onNoteChange: (note: string) => void;
  onRemove: () => void;
}) {
  const [noteOpen, setNoteOpen] = useState(false);

  return (
    <div className="rounded-lg border p-3">
      <Collapsible open={noteOpen} onOpenChange={setNoteOpen}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,10rem)_auto] sm:gap-x-3 sm:gap-y-2">
          <Label htmlFor={`posting-account-${index}`} className="sm:col-start-1 sm:row-start-1">
            Account
          </Label>
          <div className="min-w-0 sm:col-start-1 sm:row-start-2">
            <AccountCombobox
              id={`posting-account-${index}`}
              value={posting.accountId}
              items={accountItems}
              onChange={onAccountChange}
            />
          </div>
          <Label htmlFor={`posting-amount-${index}`} className="sm:col-start-2 sm:row-start-1">
            Amount
          </Label>
          <Input
            id={`posting-amount-${index}`}
            className="sm:col-start-2 sm:row-start-2"
            placeholder="e.g. -12.34"
            inputMode="decimal"
            value={posting.amount}
            onChange={(e) => onAmountChange(e.target.value)}
            onBlur={onAmountBlur}
            required
          />
          <div className="flex shrink-0 justify-end gap-1 sm:col-start-3 sm:row-start-2 sm:justify-start">
            <CollapsibleTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-expanded={noteOpen}
                  aria-label={noteOpen ? "Hide posting note" : "Show posting note"}
                  className="text-muted-foreground"
                />
              }
            >
              {noteOpen ? (
                <ChevronUpIcon className="size-4" />
              ) : (
                <ChevronDownIcon className="size-4" />
              )}
            </CollapsibleTrigger>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              disabled={!canRemove}
              aria-label="Remove posting"
              onClick={onRemove}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        </div>
        <CollapsibleContent className="mt-3 space-y-2 border-t border-border pt-3">
          <Label htmlFor={`posting-note-${index}`}>Posting note (optional)</Label>
          <Textarea
            id={`posting-note-${index}`}
            rows={3}
            placeholder="Optional detail for this posting"
            value={posting.note}
            onChange={(e) => onNoteChange(e.target.value)}
            className="min-h-0 resize-y"
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function CreateTransactionForm({ accounts }: { accounts: AccountOption[] }) {
  const [postings, setPostings] = useState<PostingDraft[]>([
    { accountId: "", amount: "", note: "" },
    { accountId: "", amount: "", note: "" },
  ]);
  const [transactionNoteOpen, setTransactionNoteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const accountItems = useMemo<AccountComboItem[]>(
    () => accounts.map((a) => ({ value: a.id, label: a.name })),
    [accounts],
  );

  const form = useForm({
    defaultValues: {
      postedOn: todayIsoDate(),
      description: "",
      status: "unmarked" as "unmarked" | "pending" | "cleared",
      note: "",
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setSuccess(null);
      const result = await createLedgerTransaction({
        ...value,
        note: value.note.trim() || undefined,
        postings: postings.map((p) => ({
          accountId: p.accountId,
          amount: p.amount,
          note: p.note.trim() || undefined,
        })),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Transaction saved.");
      form.reset();
      setTransactionNoteOpen(false);
      setPostings([
        { accountId: "", amount: "", note: "" },
        { accountId: "", amount: "", note: "" },
      ]);
    },
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

      <Collapsible open={transactionNoteOpen} onOpenChange={setTransactionNoteOpen}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="postedOn">{(field) => <DatePickerField value={field.state.value} onChange={field.handleChange} />}</form.Field>
            <form.Field name="status">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="tx-status">Status</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange((v ?? "unmarked") as "unmarked" | "pending" | "cleared")}
                  >
                    <SelectTrigger id="tx-status" className="w-full" aria-label="Transaction status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectItem value="unmarked">Unmarked</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cleared">Cleared</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="description">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="tx-description">Description</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tx-description"
                    className="min-w-0 flex-1"
                    placeholder="Lunch with friends"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                  <CollapsibleTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-expanded={transactionNoteOpen}
                        aria-label={
                          transactionNoteOpen ? "Hide transaction note" : "Show transaction note"
                        }
                        className="text-muted-foreground shrink-0"
                      />
                    }
                  >
                    {transactionNoteOpen ? (
                      <ChevronUpIcon className="size-4" />
                    ) : (
                      <ChevronDownIcon className="size-4" />
                    )}
                  </CollapsibleTrigger>
                </div>
              </div>
            )}
          </form.Field>
        </div>
        <CollapsibleContent className="mt-3 w-full space-y-2 border-t border-border pt-3">
          <form.Field name="note">
            {(noteField) => (
              <>
                <Label htmlFor="tx-note">Note (optional)</Label>
                <Textarea
                  id="tx-note"
                  rows={3}
                  placeholder="Any extra context"
                  value={noteField.state.value}
                  onChange={(e) => noteField.handleChange(e.target.value)}
                  className="min-h-0 w-full resize-y"
                />
              </>
            )}
          </form.Field>
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Postings</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPostings((prev) => [...prev, { accountId: "", amount: "", note: "" }])}
          >
            Add posting
          </Button>
        </div>

        <div className="space-y-3">
          {postings.map((posting, index) => (
            <PostingRow
              key={index}
              index={index}
              posting={posting}
              accountItems={accountItems}
              canRemove={postings.length > 2}
              onAccountChange={(v) =>
                setPostings((prev) => prev.map((p, i) => (i === index ? { ...p, accountId: v } : p)))
              }
              onAmountChange={(raw) =>
                setPostings((prev) =>
                  prev.map((p, i) =>
                    i === index ? { ...p, amount: normalizeAmountInput(raw) } : p,
                  ),
                )
              }
              onAmountBlur={() =>
                setPostings((prev) =>
                  prev.map((p, i) =>
                    i === index ? { ...p, amount: finalizeAmountOnBlur(p.amount) } : p,
                  ),
                )
              }
              onNoteChange={(note) =>
                setPostings((prev) => prev.map((p, i) => (i === index ? { ...p, note } : p)))
              }
              onRemove={() => setPostings((prev) => prev.filter((_, i) => i !== index))}
            />
          ))}
        </div>
      </div>

      <Button type="submit" disabled={form.state.isSubmitting}>
        {form.state.isSubmitting ? "Saving..." : "Save transaction"}
      </Button>
    </form>
  );
}

