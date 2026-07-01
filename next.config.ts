import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable gzip/brotli compression on responses
  compress: true,

  // Faster builds – skip type-checking during `next build` (CI can run tsc separately)
  typescript: {
    ignoreBuildErrors: false,
  },

  // Cache static assets aggressively via CDN-friendly headers
  async headers() {
    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*)\\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|otf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },

  // Image optimisation
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;
