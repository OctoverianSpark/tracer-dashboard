import type { NextConfig } from "next";

const nextConfig = {

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
    ],
    dangerouslyAllowSVG: false,
  },
  experimental: {
    allowedDevOrigins: ['localhost'],
  },
}
export default nextConfig;
