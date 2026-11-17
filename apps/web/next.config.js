//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:3000/api/auth/:path*',
      },
      {
        source: '/api/tasks/:path*',
        destination: 'http://localhost:3000/api/tasks/:path*',
      },
      {
        source: '/health',
        destination: 'http://localhost:3000/health',
      },
    ];
  },
};

module.exports = nextConfig;
