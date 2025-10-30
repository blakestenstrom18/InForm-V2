/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Silence warning about multiple lockfiles
  outputFileTracingRoot: require('path').join(__dirname),
  webpack: (config, { isServer }) => {
    // Exclude native modules from client-side bundling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      
      // Alias argon2 packages to empty module on client side
      config.resolve.alias = {
        ...config.resolve.alias,
        '@node-rs/argon2': false,
        '@node-rs/argon2-darwin-x64': false,
        '@node-rs/argon2-darwin-arm64': false,
        '@node-rs/argon2-linux-x64-gnu': false,
        '@node-rs/argon2-win32-x64-msvc': false,
      };
      
      // Ignore binary files (native modules) on client side - must be first in rules array
      // This prevents webpack from trying to parse binary files
      config.module.rules.unshift({
        test: /\.(node|bin|wasm|dll|so|dylib)$/,
        use: {
          loader: require.resolve('./webpack-ignore-loader.js'),
        },
      });
    }

    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
