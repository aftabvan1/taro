/**
 * Centralized environment variable validation.
 * Import `env` from this module instead of using `process.env.X!` directly.
 * Required vars throw on access — fail fast on misconfiguration.
 */

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const env = {
  get HETZNER_SERVER_IP() { return required("HETZNER_SERVER_IP"); },
  get HETZNER_SSH_PRIVATE_KEY() {
    // Vercel env vars may store newlines as literal \n — restore them
    return required("HETZNER_SSH_PRIVATE_KEY").replace(/\\n/g, "\n");
  },
  get INSTANCE_DOMAIN() { return process.env.INSTANCE_DOMAIN || "instances.taroagent.com"; },
  get APP_URL() { return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"; },
  get COMPOSIO_CONSUMER_KEY() { return process.env.COMPOSIO_CONSUMER_KEY || ""; },
};
