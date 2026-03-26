import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";

export function proxy(request: Request) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const current = new URL(request.url);
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", current.pathname + current.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
