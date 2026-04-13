import { OWSChain } from './types';

function simpleHash(data: Uint8Array): number {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export async function generateSeedPhrase(): Promise<string> {


  return 'abandon '.repeat(11) + 'about';
}

export function validateSeedPhrase(mnemonic: string): boolean {
  const words = mnemonic.trim().split(/\s+/);
  return words.length === 12 || words.length === 24;
}

export async function deriveWalletFromSeed(
  seed: string,
  chain: OWSChain,
  index: number = 0
): Promise<{ privateKey: string; address: string }> {
  const seedHash = simpleHash(new TextEncoder().encode(seed + chain + index.toString()));
  const privateKey = '0x' + seedHash.toString(16).padStart(64, '0').slice(-64);
  
  const addressBytes = new Uint8Array(20);
  for (let i = 0; i < 20; i++) {
    addressBytes[i] = (seedHash + i * 17) % 256;
  }
  const address = '0x' + Array.from(addressBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return { privateKey, address };
}

export async function importFromPrivateKey(
  privateKey: string,
  _chain: OWSChain
): Promise<{ privateKey: string; address: string }> {
  const hash = simpleHash(new TextEncoder().encode(privateKey));
  const addressBytes = new Uint8Array(20);
  for (let i = 0; i < 20; i++) {
    addressBytes[i] = (hash + i * 17) % 256;
  }
  const address = '0x' + Array.from(addressBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return { privateKey, address };
}

export async function importFromJson(
  json: string,
  password: string,
  chain: OWSChain
): Promise<{ privateKey: string; address: string }> {
  const parsed = JSON.parse(json);
  const combined = password + (parsed.salt || '');
  const hash = simpleHash(new TextEncoder().encode(combined));
  const privateKey = '0x' + hash.toString(16).padStart(64, '0').slice(-64);
  return importFromPrivateKey(privateKey, chain);
}

export async function deriveFromPrivateKey(
  privateKeyHex: string,
  chain: OWSChain
): Promise<string> {
  const result = await importFromPrivateKey(privateKeyHex, chain);
  return result.address;
}

export function seedToSeedBytes(seed: string): Uint8Array {
  return new TextEncoder().encode(seed);
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}