import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface WalletMetadata {
  id: string;
  name: string;
  address: `0x${string}`;
  createdAt: string;
  updatedAt: string;
}

export interface EncryptedWallet {
  version: number;
  id: string;
  metadata: WalletMetadata;
  ciphertext: string;
  iv: string;
  salt: string;
}

export class OWSStorage {
  private storagePath: string;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;

  constructor(customPath?: string) {
    this.storagePath = customPath || join(process.cwd(), '.kokonut-wallets.json');
  }

  private deriveKey(passphrase: string, salt: string): Buffer {
    return scryptSync(passphrase, Buffer.from(salt, 'hex'), this.keyLength);
  }

  public saveWallet(id: string, name: string, address: `0x${string}`, privateKey: string, passphrase: string): void {
    const salt = randomBytes(16).toString('hex');
    const iv = randomBytes(12);
    const key = this.deriveKey(passphrase, salt);
    
    const cipher = createCipheriv(this.algorithm, key, iv);
    let ciphertext = cipher.update(privateKey, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    const metadata: WalletMetadata = {
      id,
      name,
      address,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const encrypted: EncryptedWallet = {
      version: 1,
      id,
      metadata,
      ciphertext: ciphertext + authTag,
      iv: iv.toString('hex'),
      salt
    };

    const wallets = this.loadAllEncrypted();
    wallets[id] = encrypted;
    this.saveAll(wallets);
  }

  public getPrivateKey(id: string, passphrase: string): string {
    const wallets = this.loadAllEncrypted();
    const wallet = wallets[id];
    
    if (!wallet) throw new Error(`Wallet with ID ${id} not found`);

    const key = this.deriveKey(passphrase, wallet.salt);
    const iv = Buffer.from(wallet.iv, 'hex');
    
    // Last 16 bytes are the auth tag
    const ciphertext = wallet.ciphertext.slice(0, -32);
    const authTag = wallet.ciphertext.slice(-32);

    const decipher = createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  public getWallet(id: string): WalletMetadata | undefined {
    const wallets = this.loadAllEncrypted();
    return wallets[id] ? wallets[id].metadata : undefined;
  }

  public listWallets(): WalletMetadata[] {
    const wallets = this.loadAllEncrypted();
    return Object.values(wallets).map(w => w.metadata);
  }

  public deleteWallet(id: string): boolean {
    const wallets = this.loadAllEncrypted();
    if (wallets[id]) {
      delete wallets[id];
      this.saveAll(wallets);
      return true;
    }
    return false;
  }

  private loadAllEncrypted(): Record<string, EncryptedWallet> {
    if (!existsSync(this.storagePath)) {
      return {};
    }
    try {
      const data = readFileSync(this.storagePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Error loading wallet storage:', e);
      return {};
    }
  }

  private saveAll(wallets: Record<string, EncryptedWallet>): void {
    writeFileSync(this.storagePath, JSON.stringify(wallets, null, 2), 'utf8');
  }
}
