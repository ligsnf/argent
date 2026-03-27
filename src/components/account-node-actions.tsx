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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename account</DialogTitle>
            <DialogDescription>Renaming updates this account and all descendants.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
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
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
            <p className="text-muted-foreground text-xs">
              New full path: <code className="text-foreground">{nextPath}</code>
            </p>
            <Input
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              autoComplete="off"
              required
            />
            <DialogFooter className="mt-2 border-0 bg-transparent shadow-none">
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
