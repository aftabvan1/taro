const HETZNER_API_URL = "https://api.hetzner.cloud/v1";

const getHeaders = () => ({
  Authorization: `Bearer ${process.env.HETZNER_API_TOKEN}`,
  "Content-Type": "application/json",
});

interface HetznerServer {
  id: number;
  name: string;
  status: string;
  public_net: {
    ipv4: { ip: string };
    ipv6: { ip: string };
  };
  server_type: { name: string };
  datacenter: { name: string };
}

interface CreateServerOptions {
  name: string;
  serverType?: string;
  image?: string;
  location?: string;
  sshKeys?: string[];
  userData?: string;
}

export const createServer = async (
  options: CreateServerOptions
): Promise<HetznerServer> => {
  const res = await fetch(`${HETZNER_API_URL}/servers`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      name: options.name,
      server_type: options.serverType || "cx21",
      image: options.image || "ubuntu-24.04",
      location: options.location || "nbg1",
      start_after_create: true,
      ssh_keys: options.sshKeys || [],
      user_data: options.userData,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Hetzner API error: ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  return data.server;
};

export const deleteServer = async (serverId: number): Promise<void> => {
  const res = await fetch(`${HETZNER_API_URL}/servers/${serverId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Hetzner API error: ${JSON.stringify(error)}`);
  }
};

export const getServer = async (
  serverId: number
): Promise<HetznerServer> => {
  const res = await fetch(`${HETZNER_API_URL}/servers/${serverId}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Hetzner API error: ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  return data.server;
};

export const listServers = async (): Promise<HetznerServer[]> => {
  const res = await fetch(`${HETZNER_API_URL}/servers`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Hetzner API error: ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  return data.servers;
};
