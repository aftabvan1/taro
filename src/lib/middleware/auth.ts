import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export interface AuthenticatedRequest {
  userId: string;
  email: string;
}

export const authenticate = (
  req: NextRequest
): AuthenticatedRequest | NextResponse => {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  return { userId: payload.userId, email: payload.email };
};

export const isAuthenticated = (
  result: AuthenticatedRequest | NextResponse
): result is AuthenticatedRequest => {
  return "userId" in result;
};
