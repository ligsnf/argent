import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="bg-background flex min-h-full flex-1 flex-col">
      <header className="bg-background/95 supports-backdrop-filter:bg-background/80 border-border sticky top-0 z-40 flex h-14 items-center justify-between border-b px-4 backdrop-blur">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-foreground font-semibold">
            Argent
          </Link>
          <AppNav />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground hidden text-sm sm:inline">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
