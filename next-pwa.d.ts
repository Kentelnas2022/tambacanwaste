// next-pwa.d.ts
declare module "next-pwa" {
  import type { NextConfig } from "next";
  import type { Configuration } from "webpack";

  interface PWAOptions {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    buildExcludes?: string[];
    runtimeCaching?: any[];
  }

  // The module exports a function that takes PWA options and returns a config enhancer
  export default function withPWA(options?: PWAOptions): (config: NextConfig) => NextConfig;
}
