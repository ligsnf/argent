import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Argent</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          Personal finance built on double-entry bookkeeping.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {session ? (
          <Link href="/dashboard" className={cn(buttonVariants())}>
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className={cn(buttonVariants())}>
              Sign in
            </Link>
            <Link href="/signup" className={cn(buttonVariants({ variant: "outline" }))}>
              Create account
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
