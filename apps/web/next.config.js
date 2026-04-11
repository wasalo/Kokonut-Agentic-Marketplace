/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow dev server to be accessed from any network origin
  allowedDevOrigins: ['*'],

  // Fix lockfile warning for monorepo with multiple lockfiles
  outputFileTracingRoot: __dirname,

  // OpenAPI/Swagger documentation
  ...(process.env.NODE_ENV !== 'production' && {
    swaggerDocGenerator: async lib => ({
      openapi: '3.0.0',
      info: {
        title: 'Kokonut Agent Economy API',
        description:
          'API for the Kokonut Agent Economy Stack - Webhooks, Push Notifications, and Email',
        version: '1.0.0',
        contact: {
          name: 'Kokonut Support',
          url: 'https://kokonut.network',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local development server',
        },
        {
          url: 'https://market.kokonut.network',
          description: 'Production server',
        },
      ],
      components: {
        schemas: {
          Webhook: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              url: { type: 'string', format: 'uri' },
              events: { type: 'array', items: { type: 'string' } },
              secret: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          WebhookWithDeliveries: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              url: { type: 'string', format: 'uri' },
              events: { type: 'array', items: { type: 'string' } },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              recentDeliveries: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    event: { type: 'string' },
                    status: { type: 'string', enum: ['pending', 'success', 'failed'] },
                    statusCode: { type: 'integer' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          PushSubscription: {
            type: 'object',
            properties: {
              endpoint: { type: 'string' },
              keys: {
                type: 'object',
                properties: {
                  p256dh: { type: 'string' },
                  auth: { type: 'string' },
                },
              },
            },
          },
          EmailPreferences: {
            type: 'object',
            properties: {
              address: { type: 'string', format: 'email' },
              notifications: {
                type: 'object',
                properties: {
                  paymentReceived: { type: 'boolean' },
                  jobCreated: { type: 'boolean' },
                  weeklyDigest: { type: 'boolean' },
                },
              },
            },
          },
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
        securitySchemes: {
          OwnerAddress: {
            type: 'apiKey',
            in: 'header',
            name: 'x-owner-address',
            description: 'Ethereum address of the webhook owner',
          },
        },
      },
      security: [{ OwnerAddress: [] }],
    }),
  }),

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
          "'self'",
          ...devHttpSources,
          'https://ethereum-sepolia-rpc.publicnode.com',
          'https://ethereum-sepolia.publicnode.com',
          'https://ethereum.publicnode.com',
          'https://eth.llamarpc.com',
          'https://8004scan.io',
          'wss://*.walletconnect.com',
          'https://*.rpc.walletconnect.com',
          ...devWsSources,
        ].join(' ')
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
