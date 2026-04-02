/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  // Allow dev server to be accessed from any network origin
  allowedDevOrigins: ['*'],

  // Use webpack for now (Turbopack migration can be done later)
  turbopack: {},

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
    const isProd = process.env.NODE_ENV === 'production';
    const isDev = !isProd;

    // Development CSP: Allow HTTP, include network IPs, report-only mode
    // Production CSP: Enforce HTTPS, upgrade-insecure-requests, enforce mode
    const connectSrc = isDev
      ? "'self' http://localhost:* http://10.108.1.215:* http://127.0.0.1:* http://0.0.0.0:* https://ethereum-sepolia-rpc.publicnode.com https://ethereum-sepolia.publicnode.com https://ethereum.publicnode.com https://eth.llamarpc.com https://8004scan.io wss://*.walletconnect.com https://*.rpc.walletconnect.com ws://localhost:* ws://10.108.1.215:* ws://127.0.0.1:* ws://0.0.0.0:*"
      : "'self' https://ethereum-sepolia-rpc.publicnode.com https://ethereum-sepolia.publicnode.com https://ethereum.publicnode.com https://eth.llamarpc.com https://8004scan.io wss://*.walletconnect.com https://*.rpc.walletconnect.com";

    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.walletconnect.com https://*.rainbow.me",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      `connect-src ${connectSrc}`,
      "font-src 'self'",
      "frame-src 'self' https://*.walletconnect.com",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(isProd ? ['upgrade-insecure-requests'] : []),
      'report-uri /api/csp-report',
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy - Report Only in dev, Enforce in prod
          {
            key: isDev ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
            value: cspDirectives,
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
