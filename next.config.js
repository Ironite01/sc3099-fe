/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    return [
      {
        source: '/user/:path*',
        destination: `${backendUrl}/user/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
