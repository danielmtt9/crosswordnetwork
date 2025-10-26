import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  swcMinify: true,
  compiler: {
    // Remove any babel config conflicts
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    // Ensure we're using SWC
    swcMinify: true,
  },
};

export default nextConfig;
