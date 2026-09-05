import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const adminHostname = process.env.ADMIN_HOSTNAME?.trim().toLowerCase();
  if (!adminHostname) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const hostname = host.split(":")[0].toLowerCase();
  const localHost = hostname === "localhost" || hostname === "127.0.0.1";

  if (hostname === adminHostname || localHost) return NextResponse.next();

  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/admin/:path*"],
};
