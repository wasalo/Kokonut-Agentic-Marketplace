'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect } from 'react';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-3 text-default-500">Loading API documentation…</span>
    </div>
  ),
});

export default function ApiDocsPage() {
  useEffect(() => {
    document.title = 'API Docs | Kokonut Agent Economy';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-default-500">Loading API documentation…</span>
          </div>
        }
      >
        <SwaggerUI
          url="/api/swagger.json"
          deepLinking={true}
          displayOperationId={true}
          tryItOutEnabled={true}
          persistAuthorization={true}
          presets={[
            (System: { register: (plugin: unknown) => {} }) => {
              System.register([
                () => ({
                  load: () => {
                    /* no-op for preset */
                  },
                }),
              ]);
            },
          ]}
          plugins={[
            (System: { register: (plugin: unknown) => {} }) => {
              System.register([
                () => ({
                  state: {},
                  actions: {},
                  components: {},
                }),
              ]);
            },
          ]}
        />
      </Suspense>
    </div>
  );
}
