import { Composio } from "@composio/core";
import type {
  ComposioToolkit,
  ComposioConnectedAccount,
} from "./types";

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: Composio | null = null;

function getClient(): Composio {
  if (!instance) {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error("COMPOSIO_API_KEY is not set");
    }
    instance = new Composio({ apiKey });
  }
  return instance;
}

// ---------------------------------------------------------------------------
// Toolkit cache (5 min TTL)
// ---------------------------------------------------------------------------

let toolkitCache: ComposioToolkit[] | null = null;
let toolkitCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function listToolkits(): Promise<ComposioToolkit[]> {
  const now = Date.now();
  if (toolkitCache && now - toolkitCacheTime < CACHE_TTL) {
    return toolkitCache;
  }

  const client = getClient();
  const raw = await client.toolkits.get();

  const toolkits: ComposioToolkit[] = raw.map(
    (t: Record<string, unknown>) => ({
      name: (t.name as string) || "",
      slug: (t.slug as string) || "",
      description: (t.meta as Record<string, unknown>)?.description as string || "",
      logo: (t.meta as Record<string, unknown>)?.logo as string || "",
      category:
        ((t.meta as Record<string, unknown>)?.categories as Array<Record<string, string>>)?.[0]
          ?.name || "Other",
      toolsCount:
        ((t.meta as Record<string, unknown>)?.toolsCount as number) || 0,
      noAuth: (t.noAuth as boolean) || false,
      authSchemes: (t.authSchemes as string[]) || [],
    })
  );

  toolkitCache = toolkits;
  toolkitCacheTime = now;
  return toolkits;
}

// ---------------------------------------------------------------------------
// Connected accounts
// ---------------------------------------------------------------------------

export async function listConnectedAccounts(
  userId: string
): Promise<ComposioConnectedAccount[]> {
  const client = getClient();
  const result = await client.connectedAccounts.list({ userIds: [userId] });

  return (
    result.items?.map(
      (a: Record<string, unknown>) =>
        ({
          id: a.id as string,
          toolkitSlug: a.toolkitSlug as string,
          status: a.status as string,
          createdAt: a.createdAt as string,
        }) satisfies ComposioConnectedAccount
    ) || []
  );
}

