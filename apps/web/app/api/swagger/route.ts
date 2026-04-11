import { NextResponse } from 'next/server';

export async function GET() {
  const swaggerDoc = {
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
    paths: {
      '/api/webhooks': {
        post: {
          summary: 'Register a new webhook',
          description: 'Register an HTTP endpoint to receive blockchain event notifications',
          tags: ['Webhooks'],
          operationId: 'registerWebhook',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url', 'events'],
                  properties: {
                    url: {
                      type: 'string',
                      format: 'uri',
                      description: 'HTTPS URL to receive webhook notifications',
                    },
                    events: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [
                          'job.created',
                          'job.funded',
                          'job.submitted',
                          'job.completed',
                          'job.rejected',
                          'job.expired',
                          'service.created',
                          'service.updated',
                          'service.deactivated',
                          'proposal.created',
                          'proposal.evaluation_submitted',
                          'proposal.decided',
                          'payment.received',
                          'payment.sent',
                        ],
                      },
                    },
                    metadata: {
                      type: 'object',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Webhook created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      webhook: { $ref: '#/components/schemas/Webhook' },
                    },
                  },
                },
              },
            },
            '400': { description: 'Invalid request body' },
            '401': { description: 'Missing owner address header' },
            '429': { description: 'Rate limit exceeded' },
          },
        },
        get: {
          summary: 'List webhooks',
          description: 'Get all webhooks registered by the authenticated owner',
          tags: ['Webhooks'],
          operationId: 'listWebhooks',
          parameters: [
            {
              in: 'header',
              name: 'x-owner-address',
              required: true,
              schema: { type: 'string' },
              description: "The owner's Ethereum address",
            },
          ],
          responses: {
            '200': {
              description: 'List of webhooks',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      webhooks: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/WebhookWithDeliveries' },
                      },
                    },
                  },
                },
              },
            },
            '401': { description: 'Missing owner address header' },
          },
        },
      },
      '/api/push/subscribe': {
        post: {
          summary: 'Subscribe to push notifications',
          description: 'Subscribe a browser to receive push notifications',
          tags: ['Push Notifications'],
          operationId: 'subscribePush',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PushSubscription' },
              },
            },
          },
          responses: {
            '201': { description: 'Subscription created' },
            '400': { description: 'Invalid subscription' },
            '429': { description: 'Rate limit exceeded' },
          },
        },
      },
      '/api/push/unsubscribe': {
        post: {
          summary: 'Unsubscribe from push notifications',
          description: 'Remove a browser push subscription',
          tags: ['Push Notifications'],
          operationId: 'unsubscribePush',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    endpoint: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Unsubscribed successfully' },
            '404': { description: 'Subscription not found' },
          },
        },
      },
      '/api/push/keys': {
        get: {
          summary: 'Get VAPID public key',
          description: 'Get the VAPID public key for push subscriptions',
          tags: ['Push Notifications'],
          operationId: 'getVapidKeys',
          responses: {
            '200': {
              description: 'VAPID public key',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      publicKey: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/emails/preferences': {
        get: {
          summary: 'Get email preferences',
          description: 'Get email notification preferences for an address',
          tags: ['Email'],
          operationId: 'getEmailPreferences',
          parameters: [
            {
              in: 'header',
              name: 'x-owner-address',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Email preferences',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/EmailPreferences' },
                },
              },
            },
            '401': { description: 'Missing owner address' },
          },
        },
        put: {
          summary: 'Update email preferences',
          description: 'Update email notification preferences',
          tags: ['Email'],
          operationId: 'updateEmailPreferences',
          parameters: [
            {
              in: 'header',
              name: 'x-owner-address',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EmailPreferences' },
              },
            },
          },
          responses: {
            '200': { description: 'Preferences updated' },
            '400': { description: 'Invalid preferences' },
          },
        },
      },
      '/api/health': {
        get: {
          summary: 'Health check',
          description: 'Check if the API is running',
          tags: ['System'],
          operationId: 'healthCheck',
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', enum: ['ok', 'degraded', 'down'] },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
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
  };

  return NextResponse.json(swaggerDoc, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
