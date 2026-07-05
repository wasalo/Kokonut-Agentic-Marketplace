import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const BLOCK_FILE = path.join(DATA_DIR, 'block-tracker.json');
const LOCK_FILE = path.join(DATA_DIR, 'cron-locks.json');

export interface EventLog {
  id: string;
  eventType: string;
  txHash: string;
  blockNumber: number;
  blockHash: string;
  data: string;
  processedAt: string;
}

export interface BlockTracker {
  id: string;
  lastBlock: string;
  updatedAt: string;
}

export interface CronLock {
  id: string;
  lockedAt: string;
  expiresAt: string;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readEvents(): EventLog[] {
  ensureDataDir();
  if (!existsSync(EVENTS_FILE)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(EVENTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeEvents(events: EventLog[]): void {
  ensureDataDir();
  writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

function readBlockTracker(): BlockTracker | null {
  ensureDataDir();
  if (!existsSync(BLOCK_FILE)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(BLOCK_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function writeBlockTracker(tracker: BlockTracker): void {
  ensureDataDir();
  writeFileSync(BLOCK_FILE, JSON.stringify(tracker, null, 2));
}

function readLocks(): Record<string, CronLock> {
  ensureDataDir();
  if (!existsSync(LOCK_FILE)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(LOCK_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeLocks(locks: Record<string, CronLock>): void {
  ensureDataDir();
  writeFileSync(LOCK_FILE, JSON.stringify(locks, null, 2));
}

export async function getLastProcessedBlock(): Promise<bigint> {
  const tracker = readBlockTracker();
  if (!tracker) {
    return 0n;
  }
  return BigInt(tracker.lastBlock);
}

export async function updateLastProcessedBlock(blockNumber: bigint): Promise<void> {
  writeBlockTracker({
    id: 'singleton',
    lastBlock: blockNumber.toString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function logEvent(params: {
  eventType: string;
  txHash: string;
  blockNumber: number;
  blockHash: string;
  data: Record<string, unknown>;
}): Promise<string> {
  const events = readEvents();
  const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  events.push({
    id,
    eventType: params.eventType,
    txHash: params.txHash,
    blockNumber: params.blockNumber,
    blockHash: params.blockHash,
    data: JSON.stringify(params.data),
    processedAt: new Date().toISOString(),
  });

  if (events.length > 10000) {
    events.splice(0, events.length - 10000);
  }

  writeEvents(events);
  return id;
}

export async function hasEventBeenProcessed(txHash: string): Promise<boolean> {
  const events = readEvents();
  return events.some(e => e.txHash === txHash);
}

export async function acquireCronLock(
  cronName: string,
  lockDurationMs: number = 10 * 60 * 1000
): Promise<boolean> {
  const locks = readLocks();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + lockDurationMs);

  const existing = locks[cronName];
  if (existing) {
    if (new Date(existing.expiresAt) > now) {
      return false;
    }
  }

  locks[cronName] = {
    id: cronName,
    lockedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  writeLocks(locks);
  return true;
}

export async function releaseCronLock(cronName: string): Promise<void> {
  const locks = readLocks();
  delete locks[cronName];
  writeLocks(locks);
}
