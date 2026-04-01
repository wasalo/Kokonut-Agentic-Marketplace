/** @type {import('next').NextConfig} */
const nextConfig = {
  // Phase 3: Security - Temporarily ignoring during testnet build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  webpack: config => {
    config.ignoreWarnings = [
      // @metamask/sdk bundles require() for a React Native-only dep in a try/catch
      { module: /@metamask\/sdk/ },
      // pino (used by @walletconnect) tries to require pino-pretty in a try/catch
      { message: /Can't resolve 'pino-pretty'/ },
    ];
    return config;
  },

  // Phase 3: Security Headers
  // CSP is in report-only mode for testing phase
  async headers() {
    // Force report-only mode for testing - change to false when ready for production
    const isReportOnly = true;

    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy - Report Only Mode (testing phase)
          {
            key: 'Content-Security-Policy-Report-Only',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.walletconnect.com https://*.rainbow.me",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://ethereum-sepolia-rpc.publicnode.com https://ethereum-sepolia.publicnode.com https://ethereum.publicnode.com https://eth.llamarpc.com https://8004scan.io wss://*.walletconnect.com https://*.rpc.walletconnect.com",
              "font-src 'self'",
              "frame-src 'self' https://*.walletconnect.com",
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              'upgrade-insecure-requests',
              'report-uri /api/csp-report',
            ].join('; '),
          },

          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },

          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },

          // XSS protection
          { key: 'X-XSS-Protection', value: '1; mode=block' },

          // Referrer policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          // Feature policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },

          // DNS prefetch control
          { key: 'X-DNS-Prefetch-Control', value: 'on' },

          // HSTS (only in production)
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
    ];
  },
};

module.exports = nextConfig;
