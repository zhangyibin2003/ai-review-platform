/** @type {import('next').NextConfig} */
const nextConfig = {
  // In production, use NEXT_PUBLIC_API_URL env var to point to backend
  // In dev, proxy /api requests to localhost:8000
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
