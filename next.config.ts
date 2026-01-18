import type { NextConfig } from "next";

// Force restart

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/portal',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
