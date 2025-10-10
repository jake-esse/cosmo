import type { NextConfig } from "next";

// Use static export for Capacitor mobile builds
const isMobileBuild = process.env.NEXT_PUBLIC_BUILD_TARGET === 'mobile';

const nextConfig: NextConfig = {
  // Static export for Capacitor mobile apps (set NEXT_PUBLIC_BUILD_TARGET=mobile)
  // API routes are temporarily moved during mobile builds via scripts/build-mobile.sh
  ...(isMobileBuild && { output: 'export' }),

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Unoptimized images required for static export
    unoptimized: isMobileBuild,
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
