/**
 * Debug configuration for Kokonut Agent Economy Stack
 * Set NEXT_PUBLIC_DEBUG_MODE=true in .env.local to enable debug logging
 */

const isDebugMode =
  process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' ||
  (typeof window !== 'undefined' && localStorage.getItem('debug') === 'kokonut:*');

/**
 * Log a debug message (only in development or when debug mode is enabled)
 */
export function debugLog(category: string, message: string, data?: unknown) {
  if (!isDebugMode) return;

  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[${timestamp}] [${category}]`;

  if (data !== undefined) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Log an error message (always logged, but with debug prefix when in debug mode)
 */
export function debugError(category: string, message: string, error?: unknown) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[${timestamp}] [${category}] [ERROR]`;

  if (error !== undefined) {
    console.error(`${prefix} ${message}`, error);
  } else {
    console.error(`${prefix} ${message}`);
  }
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return isDebugMode;
}

/**
 * Enable debug mode at runtime
 */
export function enableDebug(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('debug', 'kokonut:*');
    console.log('[DEBUG] Debug mode enabled. Refresh the page to see all logs.');
  }
}

/**
 * Disable debug mode at runtime
 */
export function disableDebug(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('debug');
    console.log('[DEBUG] Debug mode disabled.');
  }
}
