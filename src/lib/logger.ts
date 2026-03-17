const isDev = process.env.NODE_ENV !== "production";

/**
 * Strip PEM-encoded keys, DATABASE_URL patterns, API keys, and other
 * sensitive patterns from log data to prevent credential leakage.
 */
function sanitizeForLog(data: unknown): unknown {
  if (typeof data === "string") {
    return data
      .replace(/-----BEGIN[\s\S]*?-----END[^\n]*\n?/g, "[REDACTED_KEY]")
      .replace(/postgresql:\/\/[^\s"']+/gi, "[REDACTED_DB_URL]")
      .replace(/sk_(?:live|test)_[a-zA-Z0-9]+/g, "[REDACTED_STRIPE_KEY]")
      .replace(/(?:api[_-]?key|token|secret)[=:]\s*["']?[a-zA-Z0-9_\-./]{8,}["']?/gi, "[REDACTED_CREDENTIAL]");
  }
  if (data instanceof Error) {
    const msg = sanitizeForLog(data.message) as string;
    const sanitized = new Error(msg);
    sanitized.stack = data.stack
      ? (sanitizeForLog(data.stack) as string)
      : undefined;
    return sanitized;
  }
  return data;
}

export const logger = {
  info: (msg: string, data?: unknown) => {
    if (isDev) {
      console.log(`[INFO] ${msg}`, data !== undefined ? sanitizeForLog(data) : "");
    } else {
      console.log(
        JSON.stringify({
          level: "info",
          msg,
          data: data !== undefined ? sanitizeForLog(data) : undefined,
          ts: new Date().toISOString(),
        })
      );
    }
  },
  error: (msg: string, data?: unknown) => {
    if (isDev) {
      console.error(
        `[ERROR] ${msg}`,
        data !== undefined ? sanitizeForLog(data) : ""
      );
    } else {
      console.error(
        JSON.stringify({
          level: "error",
          msg,
          data: data !== undefined ? sanitizeForLog(data) : undefined,
          ts: new Date().toISOString(),
        })
      );
    }
  },
};
