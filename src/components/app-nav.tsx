"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/transactions", label: "Transactions" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 text-sm">
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}
            aria-current={isActive ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
