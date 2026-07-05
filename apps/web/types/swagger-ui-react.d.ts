declare module 'swagger-ui-react' {
  import { ComponentType } from 'react';

  interface SwaggerUIProps {
    url?: string;
    spec?: object;
    deepLinking?: boolean;
    displayOperationId?: boolean;
    tryItOutEnabled?: boolean;
    persistAuthorization?: boolean;
    presets?: unknown[];
    plugins?: unknown[];
    layout?: string;
    onComplete?: () => void;
    requestInterceptor?: (req: Request) => Request | Promise<Request>;
    responseInterceptor?: (res: Response) => Response | Promise<Response>;
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}
