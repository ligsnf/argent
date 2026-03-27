"use client";

import { useState, useTransition } from "react";
import { renameLedgerAccount } from "@/actions/accounts";
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

export function AccountNodeActions({
  fullPath,
}: {
  fullPath: string;
}) {
  const parts = fullPath.split(":");
  const parentPath = parts.slice(0, -1).join(":");
  const initialSegment = parts[parts.length - 1] ?? "";
  const [open, setOpen] = useState(false);
  const [segment, setSegment] = useState(initialSegment);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nextPath = parentPath ? `${parentPath}:${segment}` : segment;

  return (
    <div className="flex items-center gap-1">
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setSegment(initialSegment);
            setError(null);
          }
        }}
      >
        <DialogTrigger render={<Button type="button" variant="ghost" size="xs" className="h-7 px-2 text-blue-500 hover:text-blue-500" />}>
          Edit
        </DialogTrigger>
        <DialogContent className="min-w-0 overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename account</DialogTitle>
            <DialogDescription>Renaming updates this account and all descendants.</DialogDescription>
          </DialogHeader>
          <form
            className="flex min-w-0 flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              formData.set("nextPath", nextPath);
              setError(null);
              startTransition(async () => {
                const result = await renameLedgerAccount(fullPath, undefined, formData);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
              });
            }}
          >
            {error ? (
              <p className="text-destructive min-w-0 break-words text-sm" role="alert">
                {error}
              </p>
            ) : null}
            <div className="min-w-0 space-y-1">
              <p className="text-muted-foreground text-xs">Renamed path (this node)</p>
              <div className="max-h-24 min-h-0 overflow-auto rounded-md border border-border bg-muted/40 px-2 py-1.5">
                <code className="text-foreground block break-all font-mono text-xs">{nextPath}</code>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Descendant paths update automatically on save.
              </p>
            </div>
            <Input
              value={segment}
              onChange={(e) => setSegment(e.target.value.toLowerCase())}
              autoComplete="off"
              required
              className="min-w-0 font-mono lowercase"
            />
            <DialogFooter className="mt-2 min-w-0 shrink-0 border-0 bg-transparent shadow-none">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
