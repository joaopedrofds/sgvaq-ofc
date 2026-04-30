import type { NextConfig } from "next";
import withPWA from 'next-pwa'

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

const nextConfig: NextConfig = {
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    // @ts-expect-error
    ignoreDuringBuilds: true,
  },
};

export default pwaConfig(nextConfig)
