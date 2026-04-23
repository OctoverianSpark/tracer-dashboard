import type { NextConfig } from "next";

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // dominio de fotos de Google
      }
    ]
  }
}
export default nextConfig;
