export function bytesToHex(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function generateSalt(): string {
  const bytes = globalThis.crypto?.getRandomValues?.(new Uint8Array(32))
    ?? new Uint8Array(32).map(() => Math.floor(Math.random() * 256));
  return bytesToHex(bytes);
}

export function copyTextToClipboard(value: string): void {
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement('input');
  input.value = value;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
}
