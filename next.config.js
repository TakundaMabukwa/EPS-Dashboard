/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  experimental: {
    workerThreads: false,
    cpus: 1
  },
  compress: true,
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      maxSize: 200000
    }
    return config
  }
}

module.exports = nextConfig