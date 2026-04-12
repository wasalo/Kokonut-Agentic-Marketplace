import { OWSError, OWSErrorCode } from './types';

const SALT_LENGTH = 16;
const IV_LENGTH = 12;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function createOWSError(code: OWSErrorCode, message: string, details?: unknown): OWSError {
  return { code, message, details };
}

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptSeed(seed: string, passphrase: string): Promise<{
  encryptedSeed: string;
  salt: string;
  iv: string;
}> {
  try {
    const encoder = new TextEncoder();
    const seedBytes = encoder.encode(seed);
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const key = await deriveKey(passphrase, salt);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      seedBytes
    );

    return {
      encryptedSeed: arrayBufferToBase64(ciphertext),
      salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
      iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    };
  } catch (error) {
    throw createOWSError('ENCRYPTION_FAILED', 'Failed to encrypt seed phrase', error);
  }
}

export async function decryptSeed(
  encryptedSeed: string,
  passphrase: string,
  salt: string,
  iv: string
): Promise<string> {
  try {
    const saltBuffer = base64ToArrayBuffer(salt);
    const ivBuffer = base64ToArrayBuffer(iv);
    const ciphertext = base64ToArrayBuffer(encryptedSeed);

    const key = await deriveKey(passphrase, new Uint8Array(saltBuffer));

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) as unknown as BufferSource },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    throw createOWSError('INVALID_PASSPHRASE', 'Invalid passphrase or corrupted data', error);
  }
}

export function validatePassphrase(passphrase: string): boolean {
  return passphrase.length >= 8 && passphrase.length <= 128;
}

export function generateVaultId(): string {
  return crypto.randomUUID();
}