import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
