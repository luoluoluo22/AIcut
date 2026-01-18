import type { NextConfig } from "next";
import path from "path";

import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  const isStaticExport = process.env.STATIC_EXPORT === 'true' && !isDev;

  return {
    compiler: {
      removeConsole: false,
    },
    reactStrictMode: true,
    productionBrowserSourceMaps: true,
    ...(isStaticExport && { output: "export" }),
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    images: {
      unoptimized: true, // Required for output: "export" (Electron compatibility)
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
          // poll: 1000, // Removed to improve performance on Windows (uses native events)
          // aggregateTimeout: 300,
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
    /* rewrites are not supported in export mode */
  };
};

export default nextConfig;
