import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

export async function getUserInstance(userId: string) {
  const [instance] = await db
    .select()
    .from(instances)
    .where(eq(instances.userId, userId))
    .limit(1);
  return instance ?? null;
}

export function noInstanceResponse() {
  return NextResponse.json({ error: "No instance found" }, { status: 404 });
}

export function validateBody<T>(schema: ZodSchema<T>, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      data: null as never,
      error: NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      ),
    };
  }
  return { data: result.data, error: null };
}
