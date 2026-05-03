const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // EIK package needs transpilation for ESM compatibility
  transpilePackages: ['ethereum-identity-kit'],
  // ethereum-identity-kit imports wagmi/experimental (wagmi v2) which is
  // removed in wagmi v3. This alias redirects to a compat shim.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'wagmi/experimental': path.resolve(__dirname, 'lib/efp/wagmi-experimental-shim.ts'),
    };
    return config;
  },

  // Allow dev server to be accessed from any network origin
  // For allowedDevOrigins, we need to extract base IP without wildcard
  // e.g., '10.108.1.*' -> '10.108.1' (will match 10.108.1.0 - 10.108.1.255)
  allowedDevOrigins: (process.env.NEXT_PUBLIC_DEV_HOST || 'localhost').split(',').map(h => {
    const trimmed = h.trim();
    // Remove trailing * but keep the base (e.g., '10.108.1.*' -> '10.108.1')
    return trimmed.endsWith('*') ? trimmed.slice(0, -1).replace(/\.$/, '') : trimmed;
  }),

  // Fix lockfile warning for monorepo with multiple lockfiles
  outputFileTracingRoot: __dirname,

  // Phase 3: Security Headers
  // CSP is in report-only mode for testing phase
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    const isDev = !isProd;
    const devHostEnv = process.env.NEXT_PUBLIC_DEV_HOST || '';

    const parseDevHosts = hosts =>
      hosts
        .split(',')
        .map(host => host.trim())
        .filter(Boolean)
        .map(host =>
          host
            .replace(/^https?:\/\//, '')
            .replace(/^wss?:\/\//, '')
            .replace(/\/$/, '')
        )
        .filter(Boolean);

    // CSP supports wildcards natively, so '10.108.1.*' works directly
    const devHosts = parseDevHosts(devHostEnv);

    const devHttpSources = [
      'http://localhost:*',
      'http://127.0.0.1:*',
      'http://0.0.0.0:*',
      ...devHosts.map(host => `http://${host}`),
    ];
    const devWsSources = [
      'ws://localhost:*',
      'ws://127.0.0.1:*',
      'ws://0.0.0.0:*',
      ...devHosts.map(host => `ws://${host}`),
    ];

    // Development CSP: Allow HTTP, include localhost + explicitly configured LAN/dev hosts, report-only mode
    // Production CSP: Enforce HTTPS, upgrade-insecure-requests, enforce mode
    // Note: localhost is always allowed in dev for local tooling; LAN hosts must be opt-in via NEXT_PUBLIC_DEV_HOST.
const connectSrc = isDev
    ? [
          'http://localhost:*',
          'http://127.0.0.1:*',
          'http://0.0.0.0:*',
          'http://10.108.1.45',
          'https://ethereum-sepolia-rpc.publicnode.com',
          'https://ethereum-sepolia.publicnode.com',
          'https://ethereum.publicnode.com',
          'https://eth.llamarpc.com',
          'https://8004scan.io',
          'https://rpc.ankr.com',
          'https://eth.public-rpc.com',
          'https://eth-sepolia.g.alchemy.com',
          'wss://*.walletconnect.com',
          'https://*.rpc.walletconnect.com',
          ...devWsSources,
        ].join(' ')
    : "'self' https://ethereum-sepolia-rpc.publicnode.com https://ethereum-sepolia.publicnode.com https://ethereum.publicnode.com https://eth-sepolia-public.unifra.io https://sepolia.gateway.tenderly.co https://api.zan.top/eth-sepolia https://1rpc.io/sepolia https://eth-sepolia.api.onfinality.io/public https://api.web3modal.org https://pulse.walletconnect.org https://eth-mainnet.g.alchemy.com/v2/demo https://eth.llamarpc.com https://8004scan.io https://rpc.ankr.com https://eth.public-rpc.com https://eth-sepolia.g.alchemy.com wss://*.walletconnect.com https://*.rpc.walletconnect.com";

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