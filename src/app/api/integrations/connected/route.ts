import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { listConnectedAccounts } from "@/lib/composio/client";

// GET /api/integrations/connected — list user's connected accounts
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  try {
    const accounts = await listConnectedAccounts(auth.userId);
    return NextResponse.json({ data: accounts });
  } catch (error) {
    logger.error("List connected accounts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch connected accounts" },
      { status: 500 }
    );
  }
}
