/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    return [
      // Proxy all /api/* calls to the backend (used by apiFetch in lib/api.ts)
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      // Legacy /user/* proxy (kept for backwards compatibility)
      {
        source: '/user/:path*',
        destination: `${backendUrl}/user/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
