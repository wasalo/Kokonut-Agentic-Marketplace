import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const EMAIL_FILE = path.join(DATA_DIR, 'email-preferences.json');

export interface EmailPreferenceData {
  id: string;
  userAddress: string;
  email: string;
  enabled: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
  paymentEnabled: boolean;
  jobEnabled: boolean;
  proposalEnabled: boolean;
  digestEnabled: boolean;
  marketingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readPreferences(): EmailPreferenceData[] {
  ensureDataDir();
  if (!existsSync(EMAIL_FILE)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(EMAIL_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writePreferences(prefs: EmailPreferenceData[]): void {
  ensureDataDir();
  writeFileSync(EMAIL_FILE, JSON.stringify(prefs, null, 2));
}

export async function getEmailPreference(userAddress: string) {
  const prefs = readPreferences();
  const pref = prefs.find(p => p.userAddress === userAddress.toLowerCase());
  return pref || null;
}

export async function upsertEmailPreference(
  data: Omit<EmailPreferenceData, 'id' | 'createdAt' | 'updatedAt'>
) {
  const prefs = readPreferences();
  const index = prefs.findIndex(p => p.userAddress === data.userAddress.toLowerCase());
  const now = new Date().toISOString();

  if (index >= 0) {
    prefs[index] = {
      ...prefs[index],
      ...data,
      updatedAt: now,
    };
    writePreferences(prefs);
    return prefs[index];
  }

  const newPref: EmailPreferenceData = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  prefs.push(newPref);
  writePreferences(prefs);
  return newPref;
}

export async function getUsersWithDigestEnabled() {
  const prefs = readPreferences();
  return prefs.filter(p => p.enabled && p.digestEnabled && p.frequency === 'weekly');
}

export async function getUsersWithEmailEnabled(eventType: string) {
  const prefs = readPreferences();
  return prefs.filter(p => {
    if (!p.enabled) return false;
    switch (eventType) {
      case 'payment':
        return p.paymentEnabled;
      case 'job':
        return p.jobEnabled;
      case 'proposal':
        return p.proposalEnabled;
      default:
        return true;
    }
  });
}
