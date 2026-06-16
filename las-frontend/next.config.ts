import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const dest = (process.env.NEXT_PUBLIC_API_URL || '')
      .replace(/\/$/, '')
    if (!dest) return []
    return [
      {
        source: '/api/:path*',
        destination: `${dest}/api/:path*`,
      },
    ]
  },
};

export default nextConfig;
