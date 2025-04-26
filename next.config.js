/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // AWS SDK requires these node polyfills
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...(config.resolve?.fallback || {}),
        fs: false,
        net: false,
        tls: false,
      }
    };
    
    return config;
  },
};

module.exports = nextConfig; 