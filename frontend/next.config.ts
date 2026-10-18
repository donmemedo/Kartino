import type { NextConfig } from "next";

const backend = process.env.BACKEND_URL ?? "http://localhost:8470";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  rewrites: async () => [{ source: "/api/:path*", destination: `${backend}/api/:path*` }],
};

export default config;
