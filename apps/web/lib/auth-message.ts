export const KOKONUT_AUTH_WINDOW_MS = 5 * 60 * 1000;

export function buildKokonutAuthMessage(address: string, timestamp: string): string {
  return [
    'Kokonut API Authentication',
    `Address: ${address.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
  ].join('\n');
}
