import { createSwaggerSpec } from 'next-swagger-doc';

export async function getApiDocs() {
  const spec = createSwaggerSpec({
    apiFolder: 'app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Kokonut Agent Economy API',
        description:
          'API for the Kokonut Agent Economy Stack - Webhooks, Push Notifications, Email, and Cron Jobs',
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
    },
  });
  return spec;
}