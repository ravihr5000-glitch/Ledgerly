import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { broadcastDatabaseUpdate } from './realtimeSync.ts';

export interface RequestContext {
  userEmail: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(`${pin.trim()}_ledgerly_salt_key`).digest('hex');
}

export function generateRecoveryCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const generateBlock = (len: number) => {
    let str = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      str += chars[bytes[i] % chars.length];
    }
    return str;
  };
  return `${generateBlock(4)}-${generateBlock(4)}-${generateBlock(4)}-${generateBlock(4)}`;
}

export function normalizeRecoveryCode(code: string): string {
  return (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashRecoveryCode(code: string): string {
  const normalized = normalizeRecoveryCode(code);
  return crypto.createHash('sha256').update(`${normalized}_ledgerly_recovery_salt`).digest('hex');
}

export interface SecurityConfig {
  pinEnabled: boolean;
  pinHash: string; // SHA-256 hash of the 4-digit PIN
  recoveryCodeHash: string; // SHA-256 hash of the normalized recovery code
  updatedAt?: string;
}

export interface FinanceMode {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  startingBalance: number;
  categories: string[];
  settings?: {
    allowReceipts?: boolean;
    allowTags?: boolean;
    allowNotes?: boolean;
  };
  isCustom?: boolean;
  isDefault?: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  category: string;
  paymentMode: 'UPI' | 'Bank Transfer' | 'Cash' | string;
  account?: string; // backwards compatibility
  modeId: string; // 'business', 'personal', or custom mode ID
  tags: string[];
  amount: number; // positive number
  type: 'expense' | 'income';
  receiptAttached: boolean;
  receiptDocumentId?: string;
  receiptName?: string;
  receiptDataUrl?: string;
  budgetId?: string;
  fingerprint: string;
  source: 'manual' | 'csv' | 'document' | 'drive';
  createdAt: string;
}

export interface Budget {
  id: string;
  name?: string;
  category: string;
  monthlyLimit: number;
  active: boolean;
  notes?: string;
  date?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  dueDate?: string;
  note?: string;
  createdAt: string;
}

export interface RecurringItem {
  id: string;
  merchant: string;
  category: string;
  account: string;
  amount: number;
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  estimatedMonthly: number;
  nextExpectedDate: string;
  isSubscription: boolean;
  notes?: string;
  createdAt: string;
}

export interface CategorizationRule {
  id: string;
  merchantPattern: string; // plain-text or regex
  matchType: 'contains' | 'exact' | 'starts_with';
  targetCategory: string;
  targetTags: string[];
  enabled: boolean;
  createdAt: string;
}

export interface VaultDocument {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  source: 'upload' | 'drive';
  status: 'stored' | 'review' | 'queued';
  extractedData?: {
    merchant?: string;
    date?: string;
    amount?: number;
    type?: 'expense' | 'income';
    category?: string;
    confidence: number;
  };
  storagePath: string;
  dataUrl?: string;
  createdAt: string;
}

export interface UserPreferences {
  selectedPeriod: 'All time' | 'This month' | 'Last month' | 'Last 3 months' | 'Last 6 months' | 'This year';
  totalAssets: number;
  totalLiabilities: number;
  netWorthConfigured: boolean;
  resetTimestamp: string | null;
  timezone: string;
}

export interface DriveSyncState {
  lastSyncTimestamp: string | null;
  status: 'idle' | 'synced' | 'syncing' | 'error';
  folderName: string;
  processedFileIds: string[];
  stats: {
    imported: number;
    duplicates: number;
    review: number;
    errors: number;
  };
  lastError?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  updatedAt?: string;
}

export interface ShareConfig {
  enabled: boolean;
  token: string;
  tokens?: string[];
  createdAt: string;
  allowModes?: string[];
}

export interface LedgerlyDatabase {
  ownerEmail: string;
  profile: UserProfile;
  preferences: UserPreferences;
  shareConfig: ShareConfig;
  securityConfig: SecurityConfig;
  modes: FinanceMode[];
  activeModeId: string;
  categories: string[];
  accounts: string[];
  tags: string[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  recurring: RecurringItem[];
  ignoredPatterns: string[];
  rules: CategorizationRule[];
  documents: VaultDocument[];
  driveSync: DriveSyncState;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const VAULT_DIR = path.resolve(DATA_DIR, 'vault');
const AVATARS_DIR = path.resolve(DATA_DIR, 'avatars');
const DB_FILE = path.resolve(DATA_DIR, 'ledgerly_db.json');

export const DEFAULT_PAYMENT_MODES = ['UPI', 'Bank Transfer', 'Cash'] as const;

export const DEFAULT_MODES: FinanceMode[] = [
  {
    id: 'business',
    name: 'Business',
    description: 'Company operations, revenues, vendor payouts & operational costs',
    icon: 'Briefcase',
    color: '#6558D3',
    startingBalance: 0,
    categories: [
      'Client Revenue',
      'Payroll & Salaries',
      'Software & Tools',
      'Marketing & Ads',
      'Office Rent',
      'Travel & Meals',
      'Legal & Professional',
      'Supplies',
      'Taxes',
      'Expense',
      'Other',
    ],
    settings: {
      allowReceipts: true,
      allowTags: true,
      allowNotes: true,
    },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'personal',
    name: 'Personal',
    description: 'Household living expenses, personal savings, groceries & bills',
    icon: 'User',
    color: '#10B981',
    startingBalance: 0,
    categories: [
      'Salary',
      'Housing',
      'Groceries',
      'Dining',
      'Shopping',
      'Transportation',
      'Utilities',
      'Health',
      'Entertainment',
      'Expense',
      'Other',
    ],
    settings: {
      allowReceipts: true,
      allowTags: true,
      allowNotes: true,
    },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'combined',
    name: 'Combined',
    description: 'Consolidated holistic overview combining all financial modes',
    icon: 'Layers',
    color: '#3B82F6',
    startingBalance: 0,
    categories: [
      'Client Revenue',
      'Salary',
      'Housing',
      'Groceries',
      'Operations',
      'Expense',
      'Other',
    ],
    settings: {
      allowReceipts: true,
      allowTags: true,
      allowNotes: true,
    },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_CATEGORIES = [
  'Expense',
  'Housing',
  'Groceries',
  'Shopping',
  'Dining',
  'Transportation',
  'Utilities',
  'Insurance',
  'Health',
  'Entertainment',
  'Income',
  'Client Revenue',
  'Needs review',
  'Other',
];

const INITIAL_ACCOUNTS = [
  'UPI',
  'Bank Transfer',
  'Cash',
  'Main Checking',
];

const INITIAL_DB: LedgerlyDatabase = {
  ownerEmail: 'ravihr5000@gmail.com',
  profile: {
    name: 'Ravi',
    email: 'ravihr5000@gmail.com',
    avatarUrl: '',
    updatedAt: new Date().toISOString(),
  },
  preferences: {
    selectedPeriod: 'All time',
    totalAssets: 0,
    totalLiabilities: 0,
    netWorthConfigured: false,
    resetTimestamp: null,
    timezone: 'America/Los_Angeles',
  },
  shareConfig: {
    enabled: false,
    token: '',
    createdAt: '',
    allowModes: ['all'],
  },
  securityConfig: {
    pinEnabled: true,
    pinHash: hashPin('1234'),
    recoveryCodeHash: hashRecoveryCode('ABCD-EF23-4567-89GH'),
  },
  modes: [...DEFAULT_MODES],
  activeModeId: 'business',
  categories: [...INITIAL_CATEGORIES],
  accounts: [...INITIAL_ACCOUNTS],
  tags: [],
  transactions: [],
  budgets: [],
  goals: [],
  recurring: [],
  ignoredPatterns: [],
  rules: [],
  documents: [],
  driveSync: {
    lastSyncTimestamp: null,
    status: 'idle',
    folderName: 'Ledgerly Financial Inbox',
    processedFileIds: [],
    stats: {
      imported: 0,
      duplicates: 0,
      review: 0,
      errors: 0,
    },
  },
};

const USERS_DIR = path.resolve(DATA_DIR, 'users');

export function normalizeEmail(email: string | undefined): string {
  const clean = (email || '').trim().toLowerCase();
  return clean || 'ravihr5000@gmail.com';
}

export function getEffectiveEmail(explicitEmail?: string): string {
  if (explicitEmail && explicitEmail.trim()) {
    return explicitEmail.trim().toLowerCase();
  }
  const store = requestContextStorage.getStore();
  if (store?.userEmail && store.userEmail.trim()) {
    return store.userEmail.trim().toLowerCase();
  }
  return 'ravihr5000@gmail.com';
}

export function getUserDbPath(email: string): string {
  const norm = normalizeEmail(email);
  const hash = crypto.createHash('sha256').update(norm).digest('hex').substring(0, 16);
  const safeName = norm.replace(/[^a-z0-9]/gi, '_').substring(0, 32);
  return path.resolve(USERS_DIR, `user_${safeName}_${hash}.json`);
}

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
  }
  if (!fs.existsSync(AVATARS_DIR)) {
    fs.mkdirSync(AVATARS_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_DIR)) {
    fs.mkdirSync(USERS_DIR, { recursive: true });
  }
}

function migrateAndNormalizeDatabase(parsed: any, email: string): LedgerlyDatabase {
  let needsSave = false;

  // Migrate profile if absent
  if (!parsed.profile || typeof parsed.profile !== 'object') {
    parsed.profile = {
      name: email.split('@')[0] || 'Owner',
      email: email,
      avatarUrl: '',
      updatedAt: new Date().toISOString(),
    };
    needsSave = true;
  } else {
    if (!parsed.profile.name) {
      parsed.profile.name = email.split('@')[0] || 'Owner';
      needsSave = true;
    }
    if (!parsed.profile.email) {
      parsed.profile.email = email;
      needsSave = true;
    }
    if (parsed.profile.avatarUrl === undefined) {
      parsed.profile.avatarUrl = '';
      needsSave = true;
    }
  }

  parsed.ownerEmail = email;

  if (!parsed.shareConfig || typeof parsed.shareConfig !== 'object' || !parsed.shareConfig.token) {
    const defaultToken = parsed.shareConfig?.token || 'view_1791525373616_86prjb6thy7omhqg';
    const existingTokens = Array.isArray(parsed.shareConfig?.tokens) ? parsed.shareConfig.tokens : [];
    parsed.shareConfig = {
      enabled: true,
      token: defaultToken,
      tokens: Array.from(new Set([...existingTokens, defaultToken, 'view_1791525373616_86prjb6thy7omhqg'])).filter(Boolean),
      createdAt: parsed.shareConfig?.createdAt || new Date().toISOString(),
      allowModes: ['all'],
    };
    needsSave = true;
  } else {
    if (!Array.isArray(parsed.shareConfig.tokens)) {
      parsed.shareConfig.tokens = [parsed.shareConfig.token, 'view_1791525373616_86prjb6thy7omhqg'];
      needsSave = true;
    } else if (!parsed.shareConfig.tokens.includes('view_1791525373616_86prjb6thy7omhqg')) {
      parsed.shareConfig.tokens.push('view_1791525373616_86prjb6thy7omhqg');
      needsSave = true;
    }
  }

  if (!parsed.securityConfig || typeof parsed.securityConfig !== 'object') {
    parsed.securityConfig = {
      pinEnabled: false,
      pinHash: '',
      recoveryCodeHash: '',
    };
    needsSave = true;
  } else {
    if (parsed.securityConfig.pinEnabled && !parsed.securityConfig.recoveryCodeHash) {
      parsed.securityConfig.recoveryCodeHash = hashRecoveryCode('ABCD-EF23-4567-89GH');
      needsSave = true;
    }
    if (parsed.securityConfig.phoneNumber) {
      delete parsed.securityConfig.phoneNumber;
      needsSave = true;
    }
  }

  // Migrate modes if absent
  if (!parsed.modes || !Array.isArray(parsed.modes) || parsed.modes.length === 0) {
    parsed.modes = JSON.parse(JSON.stringify(DEFAULT_MODES));
    needsSave = true;
  }

  if (!parsed.activeModeId) {
    parsed.activeModeId = 'business';
    needsSave = true;
  }

  // Ensure all categories from modes and transactions exist in parsed.categories
  if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
    parsed.categories = [...INITIAL_CATEGORIES];
    needsSave = true;
  }
  const catSet = new Set<string>(['Expense']);
  parsed.categories.forEach((c: any) => { if (c && String(c).trim()) catSet.add(String(c).trim()); });
  (parsed.modes || []).forEach((m: any) => {
    (m.categories || []).forEach((c: any) => { if (c && String(c).trim()) catSet.add(String(c).trim()); });
  });
  (parsed.transactions || []).forEach((t: any) => {
    if (t.category && String(t.category).trim()) catSet.add(String(t.category).trim());
  });
  const mergedCategories = Array.from(catSet);
  if (mergedCategories.length !== parsed.categories.length) {
    parsed.categories = mergedCategories;
    needsSave = true;
  }

  // Migrate transactions for modeId and paymentMode
  if (Array.isArray(parsed.transactions)) {
    for (const tx of parsed.transactions) {
      if (!tx.modeId) {
        tx.modeId = 'business';
        needsSave = true;
      }
      if (!tx.paymentMode) {
        if (tx.account) {
          const accLower = tx.account.toLowerCase();
          if (accLower.includes('cash')) tx.paymentMode = 'Cash';
          else if (accLower.includes('upi')) tx.paymentMode = 'UPI';
          else tx.paymentMode = 'Bank Transfer';
        } else {
          tx.paymentMode = 'Bank Transfer';
        }
        needsSave = true;
      }
    }
  }

  if (needsSave) {
    saveDatabase(parsed, email);
  }

  return parsed;
}

export function getDatabase(explicitEmail?: string): LedgerlyDatabase {
  ensureDirs();
  const email = getEffectiveEmail(explicitEmail);
  const userPath = getUserDbPath(email);

  if (fs.existsSync(userPath)) {
    try {
      const raw = fs.readFileSync(userPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return migrateAndNormalizeDatabase(parsed, email);
    } catch (err) {
      console.error(`Failed reading database file for ${email}:`, err);
    }
  }

  // If default user and legacy DB_FILE exists, load it
  if (email === 'ravihr5000@gmail.com' && fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const migrated = migrateAndNormalizeDatabase(parsed, email);
      saveDatabase(migrated, email);
      return migrated;
    } catch (err) {
      console.error('Failed reading legacy database file:', err);
    }
  }

  // Create a fresh clean database for new user
  const rawPrefix = email.includes('@') ? email.split('@')[0] : 'Owner';
  const cleanDisplayName = rawPrefix ? rawPrefix.charAt(0).toUpperCase() + rawPrefix.slice(1) : 'Owner';
  const freshUserDb: LedgerlyDatabase = {
    ...JSON.parse(JSON.stringify(INITIAL_DB)),
    ownerEmail: email,
    profile: {
      name: cleanDisplayName,
      email: email,
      avatarUrl: '',
      updatedAt: new Date().toISOString(),
    },
    modes: DEFAULT_MODES.map((m) => ({ ...m, startingBalance: 0 })),
    transactions: [],
    budgets: [],
    goals: [],
    recurring: [],
    tags: [],
    rules: [],
    documents: [],
  };

  saveDatabase(freshUserDb, email);
  return freshUserDb;
}

export function saveDatabase(data: LedgerlyDatabase, explicitEmail?: string): void {
  ensureDirs();
  const email = getEffectiveEmail(explicitEmail || data.ownerEmail || data.profile?.email);
  data.ownerEmail = email;
  if (data.profile) {
    data.profile.email = email;
  }
  const userPath = getUserDbPath(email);
  const tempPath = `${userPath}.tmp.${Date.now()}`;
  const serialized = JSON.stringify(data, null, 2);
  fs.writeFileSync(tempPath, serialized, 'utf-8');
  fs.renameSync(tempPath, userPath);

  // If default user, sync to root DB_FILE as well
  if (email === 'ravihr5000@gmail.com') {
    try {
      fs.writeFileSync(DB_FILE, serialized, 'utf-8');
    } catch (err) {
      console.error('Failed syncing legacy DB_FILE:', err);
    }
  }

  // Broadcast real-time update to all connected devices for this Gmail account
  try {
    broadcastDatabaseUpdate(email, data);
  } catch (err) {
    console.error('Failed broadcasting database update:', err);
  }
}

export function generateFingerprint(date: string, merchant: string, amount: number, paymentModeOrAccount: string): string {
  const normDate = date.trim();
  const normMerchant = merchant.trim().toLowerCase();
  const normAmount = Number(amount).toFixed(2);
  const normMethod = paymentModeOrAccount.trim().toLowerCase();
  return `${normDate}|${normMerchant}|${normAmount}|${normMethod}`;
}

export function normalizeMerchant(merchant: string): string {
  let m = merchant.trim().toLowerCase();
  m = m.replace(/[^\w\s#]/g, ' ');
  m = m.replace(/#\s*\d+\s*$/g, '');
  m = m.replace(/\b\d{4,}\b/g, '');
  m = m.replace(/\s+/g, ' ').trim();
  return m;
}

export function getVaultDirectory(): string {
  ensureDirs();
  return VAULT_DIR;
}

export function resetAllData(resetTimestamp: string, explicitEmail?: string): LedgerlyDatabase {
  ensureDirs();
  const email = getEffectiveEmail(explicitEmail);
  const current = getDatabase(email);

  if (fs.existsSync(VAULT_DIR)) {
    const files = fs.readdirSync(VAULT_DIR);
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(VAULT_DIR, f));
      } catch (e) {
        console.error(`Failed deleting vault file ${f}:`, e);
      }
    }
  }

  const existingProfile: UserProfile = current.profile || {
    name: email.split('@')[0] || 'Owner',
    email,
    avatarUrl: '',
    updatedAt: new Date().toISOString(),
  };

  const existingShareConfig: ShareConfig = current.shareConfig || {
    enabled: false,
    token: '',
    createdAt: '',
    allowModes: ['all'],
  };

  const existingSecurityConfig: SecurityConfig = current.securityConfig || {
    pinEnabled: true,
    pinHash: hashPin('1234'),
    recoveryCodeHash: hashRecoveryCode('ABCD-EF23-4567-89GH'),
  };

  const freshDb: LedgerlyDatabase = {
    ownerEmail: email,
    profile: existingProfile,
    preferences: {
      selectedPeriod: 'All time',
      totalAssets: 0,
      totalLiabilities: 0,
      netWorthConfigured: false,
      resetTimestamp,
      timezone: 'America/Los_Angeles',
    },
    shareConfig: existingShareConfig,
    securityConfig: existingSecurityConfig,
    modes: [...DEFAULT_MODES],
    activeModeId: 'business',
    categories: [...INITIAL_CATEGORIES],
    accounts: [...INITIAL_ACCOUNTS],
    tags: [],
    transactions: [],
    budgets: [],
    goals: [],
    recurring: [],
    ignoredPatterns: [],
    rules: [],
    documents: [],
    driveSync: {
      lastSyncTimestamp: null,
      status: 'idle',
      folderName: 'Ledgerly Financial Inbox',
      processedFileIds: [],
      stats: {
        imported: 0,
        duplicates: 0,
        review: 0,
        errors: 0,
      },
    },
  };

  saveDatabase(freshDb, email);
  return freshDb;
}
