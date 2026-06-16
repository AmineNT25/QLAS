import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const raw = process.env.NEXT_PUBLIC_API_URL ?? ''
    const dest = raw
      .replace(/^﻿/, '')  // strip BOM
      .replace(/\s+/g, '')     // strip whitespace
      .replace(/\/$/, '')      // strip trailing slash

    // Only add rewrite when we have a valid absolute URL
    if (!dest.startsWith('http://') && !dest.startsWith('https://')) return []

    return [
      {
        source: '/api/:path*',
        destination: `${dest}/api/:path*`,
      },
    ]
  },
};

export default nextConfig;
