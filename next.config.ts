import type { NextConfig } from "next";
import withPWA from "next-pwa";

const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "svfakvraghxssfpyvert.supabase.co",
      },
    ],
  },
  reactStrictMode: true,
};

// ✅ Wrap config with next-pwa
const nextConfig = withPWA({
  dest: "public",              // where service worker is generated
  register: true,              // auto-register the SW
  skipWaiting: true,           // immediately activate new SW
  disable: process.env.NODE_ENV === "development", // disable in dev
})(config);

export default nextConfig;
