import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // basePath: '/baby-tracker-pro',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  devIndicators: false
};

export default nextConfig;
