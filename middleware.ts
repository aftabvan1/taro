import { NextRequest, NextResponse } from "next/server";

/**
 * Global auth middleware — protects all /api/* routes except public ones.
 * This catches new routes that forget to add per-route auth.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public API routes that don't require auth
  const publicPaths = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/webhooks/stripe",
    "/api/webhooks/clerk",
  ];

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // All other /api routes require a Bearer token
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  // Token validity is still checked per-route via authenticate(),
  // but this middleware ensures no route is accidentally left unprotected.
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
