import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["node-ssh", "ssh2"],
};

export default nextConfig;
