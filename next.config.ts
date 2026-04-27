import type { NextConfig } from "next";

const nextConfig = {
  allowedDevOrigins: ['actimetricstracker.asistentevirtualsas.com', 'tester.asistentevirtualsas.com'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      }
    ]
  }
}
export default nextConfig;
