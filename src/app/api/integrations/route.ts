import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { listToolkits } from "@/lib/composio/client";

// GET /api/integrations — list available Composio toolkits
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  try {
    const toolkits = await listToolkits();
    return NextResponse.json({ data: toolkits });
  } catch (error) {
    logger.error("List integrations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}
