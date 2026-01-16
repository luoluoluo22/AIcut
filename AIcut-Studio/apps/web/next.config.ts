import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.marblecms.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "api.iconify.design",
      },
      {
        protocol: "https",
        hostname: "api.simplesvg.com",
      },
      {
        protocol: "https",
        hostname: "api.unisvg.com",
      },
    ],
  },
  serverExternalPackages: [
    "@ffmpeg/ffmpeg",
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/cli",
  ],
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: [
          "**/.git/**",
          "**/.next/**",
          "**/node_modules/**",
          path.resolve(__dirname, "../../.aicut"),
          path.resolve(__dirname, "../../ai_workspace"), // Ignore workspace changes
          path.resolve(__dirname, "../../tools"),
          path.resolve(__dirname, "public/materials"),
        ],
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/materials/:path*",
        destination: "/api/materials/:path*",
      },
    ];
  },
};

export default nextConfig;
