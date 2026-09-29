import type { NextConfig } from "next";

// GitHub Pages serves the custom domain from /. Leave PAGES_BASE_PATH unset for that.
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  ...(basePath
    ? {
        basePath,
        assetPrefix: basePath,
      }
    : {}),
};

export default nextConfig;
