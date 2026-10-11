export type PeriodType =
  | 'Today'
  | 'This Month'
  | 'Last Month'
  | 'Last 3 Months'
  | 'Last 6 Months'
  | 'This Year'
  | 'Last Year'
  | 'This month'
  | 'Last month'
  | 'Last 3 months'
  | 'Last 6 months'
  | 'This year'
  | 'Last year'
  | 'All time'
  | string;

export interface PinStatus {
  pinEnabled: boolean;
  isCustomPin?: boolean;
  hasRecoveryCode?: boolean;
  updatedAt?: string | null;
}

export interface PinChangeResponse {
  success: boolean;
  message: string;
  recoveryCode?: string;
}

export interface PinRecoveryVerifyResponse {
  success: boolean;
  message: string;
  resetToken?: string;
}

export interface PinRecoveryResetResponse {
  success: boolean;
  token?: string;
  message: string;
  recoveryCode?: string;
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
  createdAt: string;
  allowModes?: string[];
  publicBaseUrl?: string;
}

export interface FinanceMode {
  id: string; // 'business' | 'personal' | 'combined' | custom id
  name: string; // e.g., 'Business', 'Personal', 'Combined', 'Freelance Income', 'Rental Property', 'Travel Budget'
  description?: string;
  icon: string; // lucide icon name (Briefcase, User, Layers, Home, Plane, Landmark, Wallet, etc.)
  color: string; // hex color or tailwind accent
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

export const DEFAULT_PAYMENT_MODES = ['UPI', 'Bank Transfer', 'Cash'] as const;
export type PaymentMode = typeof DEFAULT_PAYMENT_MODES[number] | string;

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  category: string;
  paymentMode: PaymentMode;
  account?: string; // backwards compatibility
  modeId: string; // 'business', 'personal', or custom mode ID
  tags: string[];
  amount: number;
  type: 'expense' | 'income';
  receiptAttached: boolean;
  receiptDocumentId?: string;
  receiptName?: string;
  receiptDataUrl?: string;
  fingerprint: string;
  source: 'manual' | 'csv' | 'document' | 'drive';
  budgetId?: string; // Optional direct association to a specific Budget
  createdAt: string;
}

export interface Budget {
  id: string;
  name?: string; // Optional custom name (e.g. 'Weekly Groceries', 'Office Lunches')
  category: string;
  monthlyLimit: number;
  active: boolean;
  notes?: string;
  date?: string; // Specific date (YYYY-MM-DD) on which the budget is created/assigned
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

export interface DetectedPattern {
  key: string;
  merchant: string;
  normalizedMerchant: string;
  category: string;
  account: string;
  averageAmount: number;
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  estimatedMonthly: number;
  nextExpectedDate: string;
  occurrences: number;
  confidence: 'High' | 'Likely';
  isSubscription: boolean;
  dates: string[];
}

export interface CategorizationRule {
  id: string;
  merchantPattern: string;
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
  selectedPeriod: PeriodType;
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

export interface TagInfo {
  name: string;
  count: number;
}

export interface ImportSummary {
  transactionsInserted: number;
  duplicatesSkipped: number;
  rowsSkipped: number;
  itemsNeedingReview: number;
  insertedIds: string[];
  assignedBudget?: string;
}

export interface ColumnMapping {
  dateCol: string;
  merchantCol: string;
  amountCol?: string;
  debitCol?: string;
  creditCol?: string;
  categoryCol?: string;
  accountCol?: string;
  budgetCol?: string;
}
