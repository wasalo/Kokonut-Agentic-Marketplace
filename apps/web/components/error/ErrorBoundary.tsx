'use client';

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log contract-specific errors for debugging
    if (error.message?.includes('call') || error.message?.includes('contract')) {
      console.error('Contract call error detected:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-danger-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-danger" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-default-500 mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface AsyncBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function AsyncBoundary({
  children,
  fallback,
  isLoading,
  error,
  onRetry,
}: AsyncBoundaryProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-danger-100 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-danger" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Failed to load data</h3>
        <p className="text-default-500 mb-4 text-sm">{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
