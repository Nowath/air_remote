import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without it, Next.js walks up and
  // finds the lockfile in the parent Documents folder and infers the wrong root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
