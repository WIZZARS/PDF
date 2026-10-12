import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
    resolveAlias: {
      // pdfjs-dist tries to import 'canvas' in Node environments — mock it out
      canvas: "./public/empty-module.js",
    },
  },
  webpack(config) {
    // Same alias for non-turbopack builds
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string>),
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
