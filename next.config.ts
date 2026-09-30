import type { NextConfig } from "next";

// This branch runs a Node server for the private shop desk.
// The public site on main still static-exports for GitHub Pages.
// Do not copy this config onto main: Pages cannot run the database or uploads.
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    proxyClientMaxBodySize: "48mb",
    serverActions: {
      bodySizeLimit: "48mb",
    },
  },
  ...(basePath
    ? {
        basePath,
        assetPrefix: basePath,
      }
    : {}),
};

export default nextConfig;
