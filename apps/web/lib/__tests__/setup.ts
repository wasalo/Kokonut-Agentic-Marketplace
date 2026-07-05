/**
 * Vitest setup: shared mocks for wagmi, RainbowKit, Next.js navigation, and
 * common browser APIs. Imported via setupFiles in vitest.config.ts.
 */
import '@testing-library/jest-dom/vitest';
import { vi, afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// react-testing-library auto-cleanup
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage.clear();
});

// Mock window.matchMedia (used by HeroUI for prefers-color-scheme)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock navigator.clipboard for BidRecoveryPanel + commit forms
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  vibrate: vi.fn(),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}
(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = MockIntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = MockResizeObserver;

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => {
    return (require('react') as typeof import('react')).createElement('a', { href, ...rest }, children);
  },
}));

// Mock wagmi at module level — consumers can override per test
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: undefined, isConnected: false, chain: undefined })),
  useConnect: vi.fn(() => ({
    connect: vi.fn(),
    connectors: [],
    isPending: false,
    error: null,
  })),
  useDisconnect: vi.fn(() => ({ disconnect: vi.fn() })),
  useSignMessage: vi.fn(() => ({
    signMessage: vi.fn(),
    signMessageAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
  useReadContract: vi.fn(() => ({ data: undefined, isLoading: false, error: null })),
  useWriteContract: vi.fn(() => ({ writeContract: vi.fn(), isPending: false, error: null })),
  useWatchContractEvent: vi.fn(),
  useBalance: vi.fn(() => ({ data: undefined, isLoading: false })),
  useBlockNumber: vi.fn(() => ({ data: 0n })),
  useChainId: vi.fn(() => 11155111),
  useConfig: vi.fn(() => ({})),
  usePublicClient: vi.fn(() => undefined),
  useClient: vi.fn(() => undefined),
  createConfig: vi.fn(),
  http: vi.fn(),
}));

// Mock sonner toasts to avoid noisy output
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}));

// Suppress noisy HeroUI warnings in jsdom
const originalError = console.error;
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? '');
    if (msg.includes('not wrapped in act(') || msg.includes('Warning: ReactDOM')) return;
    originalError(...args);
  };
});
