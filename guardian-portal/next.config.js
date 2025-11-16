/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Optimize for mobile
  compress: true,
  poweredByHeader: false,
  // Generate standalone output for deployment
  output: 'standalone',
}

module.exports = nextConfig
