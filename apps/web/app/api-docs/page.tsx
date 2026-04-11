'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#009F4D]"></div>
      <span className="ml-3 text-default-500">Loading API documentation...</span>
    </div>
  ),
});

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#009F4D]"></div>
            <span className="ml-3 text-default-500">Loading API documentation...</span>
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
