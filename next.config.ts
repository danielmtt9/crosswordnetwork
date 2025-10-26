import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    // Remove any babel config conflicts
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
