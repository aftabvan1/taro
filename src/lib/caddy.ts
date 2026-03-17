import { NodeSSH } from "node-ssh";

const CADDYFILE_PATH = "/etc/caddy/Caddyfile";

const getSSHConnection = async () => {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: process.env.HETZNER_SERVER_IP!,
    username: "root",
    privateKey: process.env.HETZNER_SSH_PRIVATE_KEY!,
  });
  return ssh;
};

const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

function validateSubdomain(subdomain: string) {
  if (!SUBDOMAIN_REGEX.test(subdomain)) {
    throw new Error(
      "Invalid subdomain: must be lowercase alphanumeric with optional hyphens"
    );
  }
}

export const addRoute = async (
  subdomain: string,
  ports: { openclaw: number; ttyd: number; mc: number }
) => {
  validateSubdomain(subdomain);
  const conn = await getSSHConnection();
  const baseDomain = process.env.INSTANCE_DOMAIN || "instances.taro.sh";

  const block = `
# --- ${subdomain} ---
${subdomain}.${baseDomain} {
  reverse_proxy localhost:${ports.openclaw}
}

${subdomain}-terminal.${baseDomain} {
  reverse_proxy localhost:${ports.ttyd}
}

${subdomain}-mc.${baseDomain} {
  reverse_proxy localhost:${ports.mc}
}
# --- end ${subdomain} ---
`;

  await conn.execCommand(
    `cat >> ${CADDYFILE_PATH} << 'CADDYEOF'
${block}
CADDYEOF`
  );

  await conn.execCommand("systemctl reload caddy");
  conn.dispose();
};

export const removeRoute = async (subdomain: string) => {
  validateSubdomain(subdomain);
  const conn = await getSSHConnection();

  // Remove the block between the markers
  await conn.execCommand(
    `sed -i '/# --- ${subdomain} ---/,/# --- end ${subdomain} ---/d' ${CADDYFILE_PATH}`
  );

  await conn.execCommand("systemctl reload caddy");
  conn.dispose();
};
