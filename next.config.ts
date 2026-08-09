import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep Next's application-scoped type checker; test files run separately via Vitest.
    useTypeScriptCli: false,
    // Avoid persistent Turbopack cache files that are incompatible with this external macOS volume.
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
