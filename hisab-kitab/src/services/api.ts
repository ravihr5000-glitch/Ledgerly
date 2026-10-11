import {
  Transaction,
  Budget,
  Goal,
  RecurringItem,
  DetectedPattern,
  CategorizationRule,
  VaultDocument,
  UserPreferences,
  TagInfo,
  ColumnMapping,
  ImportSummary,
  FinanceMode,
  UserProfile,
  ShareConfig,
  PinStatus,
  PinChangeResponse,
  PinRecoveryVerifyResponse,
  PinRecoveryResetResponse,
} from '../types/finance';

let currentOwnerEmail = 'ravihr5000@gmail.com';
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('ledgerly_user_email');
    if (saved && saved.trim()) {
      currentOwnerEmail = saved.trim().toLowerCase();
    }
  } catch (e) {}
}
let isViewOnlySession = false;
let currentShareToken = '';

export function extractShareTokenFromUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    // 1. Search params (?share=... or ?token=...)
    const searchParams = new URLSearchParams(window.location.search);
    const searchToken = searchParams.get('share') || searchParams.get('token');
    if (searchToken && searchToken.trim()) {
      return searchToken.trim();
    }

    // 2. Hash params (e.g. #/?share=... or #share=...)
    if (window.location.hash) {
      const hash = window.location.hash;
      const qIndex = hash.indexOf('?');
      const hashStr = qIndex >= 0 ? hash.substring(qIndex + 1) : hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hashStr);
      const hashToken = hashParams.get('share') || hashParams.get('token');
      if (hashToken && hashToken.trim()) {
        return hashToken.trim();
      }
    }

    // 3. Stored token in sessionStorage ONLY (scoped strictly to current tab, never localStorage)
    const stored = sessionStorage.getItem('ledgerly_share_token');
    if (stored && stored.trim()) {
      return stored.trim();
    }
  } catch (e) {
    // ignore
  }
  return '';
}

// Synchronously check URL on module load and ensure localStorage pollution is purged
if (typeof window !== 'undefined') {
  try {
    // Purge any legacy token from localStorage to prevent trapping the owner across tabs
    localStorage.removeItem('ledgerly_share_token');

    const searchParams = new URLSearchParams(window.location.search);
    const hasExplicitUrlToken = Boolean(searchParams.get('share') || searchParams.get('token'));
    const token = extractShareTokenFromUrl();
    if (token && (hasExplicitUrlToken || sessionStorage.getItem('ledgerly_share_token'))) {
      isViewOnlySession = true;
      currentShareToken = token;
      sessionStorage.setItem('ledgerly_share_token', token);
    }
  } catch (e) {
    // ignore
  }
}

export function setApiOwnerEmail(email: string) {
  if (email && email.trim()) {
    currentOwnerEmail = email.trim().toLowerCase();
    try {
      localStorage.setItem('ledgerly_user_email', currentOwnerEmail);
    } catch (e) {}
  }
}

export function getApiOwnerEmail(): string {
  return currentOwnerEmail;
}

export function setApiViewOnlySession(viewOnly: boolean, token?: string) {
  isViewOnlySession = viewOnly;
  if (token && token.trim()) {
    currentShareToken = token.trim();
    try {
      sessionStorage.setItem('ledgerly_share_token', currentShareToken);
    } catch (e) {}
  } else if (!viewOnly) {
    currentShareToken = '';
    try {
      sessionStorage.removeItem('ledgerly_share_token');
      localStorage.removeItem('ledgerly_share_token');
    } catch (e) {}
  }
}

export function clearShareTokenStorage() {
  currentShareToken = '';
  isViewOnlySession = false;
  try {
    sessionStorage.removeItem('ledgerly_share_token');
    localStorage.removeItem('ledgerly_share_token');
  } catch (e) {}
}

export function getShareToken(): string {
  return currentShareToken || extractShareTokenFromUrl();
}

export function withShareToken(url: string): string {
  const token = currentShareToken || extractShareTokenFromUrl();
  if (isViewOnlySession || Boolean(token)) {
    if (token) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}share=${encodeURIComponent(token)}`;
    }
  }
  return url;
}

export function getApiHeaders(): Record<string, string> {
  const token = currentShareToken || extractShareTokenFromUrl();
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-ledgerly-owner': currentOwnerEmail,
  };
  if (isViewOnlySession || Boolean(token)) {
    h['x-ledgerly-view-only'] = 'true';
    if (token) {
      h['x-ledgerly-share-token'] = token;
    }
  }
  return h;
}

export const headers: any = new Proxy({}, {
  get(_target, prop: string) {
    const h = getApiHeaders();
    return h[prop];
  },
  ownKeys() {
    return Object.keys(getApiHeaders());
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    const h = getApiHeaders();
    if (prop in h) {
      return { value: h[prop], writable: true, enumerable: true, configurable: true };
    }
    return undefined;
  },
  has(_target, prop: string) {
    return prop in getApiHeaders();
  },
});

async function handleResponse<T>(res: globalThis.Response): Promise<T> {
  if (!res.ok) {
    let errMessage = `Error ${res.status}: ${res.statusText}`;
    try {
      const json = await res.json();
      if (json.error) errMessage = json.error;
    } catch {
      // ignore
    }
    if (res.status === 403 && /share token/i.test(errMessage)) {
      if (typeof window !== 'undefined' && !window.location.search.includes('share=')) {
        clearShareTokenStorage();
      }
    }
    throw new Error(errMessage);
  }
  return res.json();
}

export const api = {
  // Bootstrap
  async getBootstrap() {
    const res = await fetch(withShareToken('/api/bootstrap'), { headers: getApiHeaders() });
    return handleResponse<{
      ownerEmail: string;
      profile?: UserProfile;
      preferences: UserPreferences;
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
      driveSync: any;
    }>(res);
  },

  // User Profile
  async getProfile(): Promise<UserProfile> {
    const res = await fetch(withShareToken('/api/profile'), { headers: getApiHeaders() });
    return handleResponse<UserProfile>(res);
  },

  // Share — View-Only Access
  async getShareConfig(): Promise<ShareConfig> {
    const res = await fetch('/api/share/config', {
      headers: {
        'Content-Type': 'application/json',
        'x-ledgerly-owner': currentOwnerEmail,
      },
    });
    return handleResponse<ShareConfig>(res);
  },

  async enableShare(): Promise<ShareConfig> {
    const res = await fetch('/api/share/enable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ledgerly-owner': currentOwnerEmail,
      },
    });
    return handleResponse<ShareConfig>(res);
  },

  async revokeShare(): Promise<{ success: boolean; enabled: boolean }> {
    const res = await fetch('/api/share/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ledgerly-owner': currentOwnerEmail,
      },
    });
    return handleResponse<{ success: boolean; enabled: boolean }>(res);
  },

  async validateShareToken(token: string): Promise<{ valid: boolean; readOnly: boolean; ownerName?: string }> {
    const res = await fetch(`/api/share/validate/${encodeURIComponent(token.trim())}`);
    return handleResponse<{ valid: boolean; readOnly: boolean; ownerName?: string }>(res);
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: getApiHeaders(),
      body: JSON.stringify(updates),
    });
    const updated = await handleResponse<UserProfile>(res);
    if (updated.email) {
      setApiOwnerEmail(updated.email);
    }
    return updated;
  },

  async uploadAvatar(file: File): Promise<{ avatarUrl: string; profile: UserProfile }> {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      headers: {
        'x-ledgerly-owner': currentOwnerEmail,
      },
      body: formData,
    });
    const result = await handleResponse<{ avatarUrl: string; profile: UserProfile }>(res);
    if (result.profile?.email) {
      setApiOwnerEmail(result.profile.email);
    }
    return result;
  },

  async removeAvatar(): Promise<UserProfile> {
    const res = await fetch('/api/profile/avatar', {
      method: 'DELETE',
      headers: getApiHeaders(),
    });
    return handleResponse<UserProfile>(res);
  },

  // Preferences
  async getPreferences(): Promise<UserPreferences> {
    const res = await fetch('/api/preferences', { headers: getApiHeaders() });
    return handleResponse<UserPreferences>(res);
  },

  async updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    const res = await fetch('/api/preferences', {
      method: 'PUT',
      headers: getApiHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<UserPreferences>(res);
  },

  // Transactions
  async getTransactions(params?: { category?: string; account?: string; search?: string }): Promise<Transaction[]> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.account) query.set('account', params.account);
    if (params?.search) query.set('search', params.search);
    const url = `/api/transactions${query.toString() ? '?' + query.toString() : ''}`;
    const res = await fetch(withShareToken(url), { headers });
    return handleResponse<Transaction[]>(res);
  },

  async createTransaction(tx: Omit<Transaction, 'id' | 'fingerprint' | 'createdAt' | 'source'>): Promise<Transaction> {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers,
      body: JSON.stringify(tx),
    });
    return handleResponse<Transaction>(res);
  },

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    return handleResponse<Transaction>(res);
  },

  async patchTransaction(id: string, updates: { category?: string; tags?: string[] }): Promise<Transaction> {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    return handleResponse<Transaction>(res);
  },

  async deleteTransaction(id: string): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ success: boolean; id: string }>(res);
  },

  async deleteTransactionsBulk(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
    const res = await fetch('/api/transactions/bulk-delete', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids }),
    });
    return handleResponse<{ success: boolean; deletedCount: number }>(res);
  },

  // Finance Modes
  async getModes(): Promise<{ modes: FinanceMode[]; activeModeId: string }> {
    const res = await fetch('/api/modes', { headers });
    return handleResponse<{ modes: FinanceMode[]; activeModeId: string }>(res);
  },

  async createMode(modeData: Partial<FinanceMode>): Promise<FinanceMode> {
    const res = await fetch('/api/modes', {
      method: 'POST',
      headers,
      body: JSON.stringify(modeData),
    });
    return handleResponse<FinanceMode>(res);
  },

  async updateMode(id: string, updates: Partial<FinanceMode>): Promise<FinanceMode> {
    const res = await fetch(`/api/modes/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    return handleResponse<FinanceMode>(res);
  },

  async deleteMode(id: string): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`/api/modes/${id}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ success: boolean; id: string }>(res);
  },

  async setActiveMode(modeId: string): Promise<{ success: boolean; activeModeId: string }> {
    const res = await fetch('/api/modes/active', {
      method: 'POST',
      headers,
      body: JSON.stringify({ modeId }),
    });
    return handleResponse<{ success: boolean; activeModeId: string }>(res);
  },

  async setCurrentBalance(modeId: string, currentBalance: number): Promise<{ success: boolean; modes: FinanceMode[] }> {
    const res = await fetch(`/api/modes/${encodeURIComponent(modeId)}/current-balance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ currentBalance }),
    });
    return handleResponse<{ success: boolean; modes: FinanceMode[] }>(res);
  },

  // CSV
  async parseCSV(csvContent: string): Promise<{
    headers: string[];
    sampleRows: Record<string, string>[];
    totalRows: number;
    detectedMapping?: ColumnMapping;
  }> {
    const res = await fetch('/api/transactions/parse-csv', {
      method: 'POST',
      headers,
      body: JSON.stringify({ csvContent }),
    });
    return handleResponse(res);
  },

  async importCSV(
    csvContent: string,
    mapping: ColumnMapping,
    defaultAccount: string,
    modeId?: string,
    defaultCategory?: string,
    budgetId?: string
  ): Promise<{ summary: ImportSummary; totalTransactions: number; newTransactions?: Transaction[] }> {
    const res = await fetch('/api/transactions/import-csv', {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ csvContent, mapping, defaultAccount, modeId, defaultCategory, budgetId }),
    });
    return handleResponse(res);
  },

  // Categories & Accounts
  async getCategories(): Promise<string[]> {
    const res = await fetch(withShareToken('/api/categories'), { headers: getApiHeaders() });
    return handleResponse<string[]>(res);
  },

  async addCategory(name: string): Promise<string[]> {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await handleResponse<any>(res);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.categories)) return data.categories;
    return [];
  },

  async updateCategory(
    oldName: string,
    newName: string
  ): Promise<{
    success: boolean;
    oldName: string;
    newName: string;
    updatedTxCount: number;
    updatedBudgetCount?: number;
    updatedRulesCount?: number;
    categories: string[];
    modes: FinanceMode[];
    transactions?: Transaction[];
    budgets?: Budget[];
    rules?: CategorizationRule[];
  }> {
    const res = await fetch('/api/categories', {
      method: 'PUT',
      headers: getApiHeaders(),
      body: JSON.stringify({ oldName: oldName.trim(), newName: newName.trim() }),
    });
    return handleResponse(res);
  },

  async deleteCategory(
    name: string,
    reassignTo?: string
  ): Promise<{
    success: boolean;
    removed: string;
    reassignedCount: number;
    reassignTo?: string;
    categories: string[];
    modes: FinanceMode[];
    transactions?: Transaction[];
    budgets?: Budget[];
    rules?: CategorizationRule[];
  }> {
    const res = await fetch('/api/categories', {
      method: 'DELETE',
      headers: getApiHeaders(),
      body: JSON.stringify({ name: name.trim(), reassignTo: reassignTo || 'Expense' }),
    });
    return handleResponse(res);
  },

  async getAccounts(): Promise<string[]> {
    const res = await fetch(withShareToken('/api/accounts'), { headers });
    return handleResponse<string[]>(res);
  },

  async addAccount(name: string): Promise<string[]> {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name }),
    });
    return handleResponse<string[]>(res);
  },

  async deleteAccount(name: string): Promise<string[]> {
    const res = await fetch(`/api/accounts/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<string[]>(res);
  },

  // Tags
  async getTags(): Promise<TagInfo[]> {
    const res = await fetch(withShareToken('/api/tags'), { headers });
    return handleResponse<TagInfo[]>(res);
  },

  async addTag(name: string): Promise<TagInfo> {
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name }),
    });
    return handleResponse<TagInfo>(res);
  },

  async deleteTag(name: string, removeFromTransactions: boolean): Promise<any> {
    const res = await fetch(`/api/tags/${encodeURIComponent(name)}?removeFromTransactions=${removeFromTransactions}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res);
  },

  // Budgets
  async getBudgets(): Promise<Budget[]> {
    const res = await fetch(withShareToken('/api/budgets'), { headers });
    return handleResponse<Budget[]>(res);
  },

  async createBudget(b: { name?: string; category: string; monthlyLimit: number; active?: boolean; notes?: string }): Promise<Budget> {
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers,
      body: JSON.stringify(b),
    });
    return handleResponse<Budget>(res);
  },

  async updateBudget(id: string, b: Partial<Budget>): Promise<Budget> {
    const res = await fetch(`/api/budgets/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(b),
    });
    return handleResponse<Budget>(res);
  },

  async deleteBudget(id: string): Promise<any> {
    const res = await fetch(`/api/budgets/${id}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res);
  },

  async deleteAllBudgets(): Promise<any> {
    const res = await fetch('/api/budgets', {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res);
  },

  // Goals
  async getGoals(): Promise<Goal[]> {
    const res = await fetch(withShareToken('/api/goals'), { headers });
    return handleResponse<Goal[]>(res);
  },

  async createGoal(g: { name: string; targetAmount: number; currentAmount?: number; dueDate?: string; note?: string }): Promise<Goal> {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers,
      body: JSON.stringify(g),
    });
    return handleResponse<Goal>(res);
  },

  async updateGoal(id: string, g: Partial<Goal>): Promise<Goal> {
    const res = await fetch(`/api/goals/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(g),
    });
    return handleResponse<Goal>(res);
  },

  async contributeGoal(id: string, amount: number): Promise<Goal> {
    const res = await fetch(`/api/goals/${id}/contribute`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount }),
    });
    return handleResponse<Goal>(res);
  },

  async deleteGoal(id: string): Promise<any> {
    const res = await fetch(`/api/goals/${id}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res);
  },

  // Recurring & Subscriptions
  async getRecurring(): Promise<{
    suggestedRecurring: DetectedPattern[];
    suggestedSubscriptions: DetectedPattern[];
    confirmedBills: RecurringItem[];
    confirmedSubscriptions: RecurringItem[];
    allConfirmed: RecurringItem[];
    ignoredCount: number;
    totals: {
      monthlyBillsTotal: number;
      annualBillsTotal: number;
      monthlySubsTotal: number;
      annualSubsTotal: number;
      totalMonthlyCommitments: number;
      totalAnnualCommitments: number;
    };
    nextPayment: RecurringItem | null;
  }> {
    const res = await fetch(withShareToken('/api/recurring'), { headers });
    return handleResponse(res);
  },

  async confirmRecurring(data: {
    merchant: string;
    category?: string;
    account?: string;
    amount: number;
    cadence: string;
    isSubscription: boolean;
    nextExpectedDate?: string;
    notes?: string;
  }): Promise<RecurringItem> {
    const res = await fetch('/api/recurring/confirm', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<RecurringItem>(res);
  },

  async ignorePattern(key: string): Promise<{ success: boolean; ignoredCount: number }> {
    const res = await fetch('/api/recurring/ignore', {
      method: 'POST',
      headers,
      body: JSON.stringify({ key }),
    });
    return handleResponse(res);
  },

  async restoreIgnored(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/recurring/restore-ignored', {
      method: 'POST',
      headers,
    });
    return handleResponse(res);
  },

  async deleteRecurring(id: string): Promise<any> {
    const res = await fetch(`/api/recurring/${id}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res);
  },

  // Rules
  async getRules(): Promise<CategorizationRule[]> {
    const res = await fetch('/api/rules', { headers });
    return handleResponse<CategorizationRule[]>(res);
  },

  async createRule(rule: Omit<CategorizationRule, 'id' | 'createdAt'>): Promise<CategorizationRule> {
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers,
      body: JSON.stringify(rule),
    });
    return handleResponse<CategorizationRule>(res);
  },

  async updateRule(id: string, updates: Partial<CategorizationRule>): Promise<CategorizationRule> {
    const res = await fetch(`/api/rules/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    return handleResponse<CategorizationRule>(res);
  },

  async deleteRule(id: string): Promise<any> {
    const res = await fetch(`/api/rules/${id}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res);
  },

  // Documents Vault
  async getDocuments(): Promise<VaultDocument[]> {
    const res = await fetch('/api/documents', { headers });
    return handleResponse<VaultDocument[]>(res);
  },

  async uploadDocument(file: File): Promise<VaultDocument> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: {
        'x-ledgerly-owner': currentOwnerEmail,
      },
      body: formData,
    });
    return handleResponse<VaultDocument>(res);
  },

  async deleteDocument(id: string): Promise<any> {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res);
  },

  // Google Drive
  async getDriveStatus(): Promise<any> {
    const res = await fetch('/api/drive/status', { headers });
    return handleResponse(res);
  },

  async syncDrive(): Promise<any> {
    const res = await fetch('/api/drive/sync', {
      method: 'POST',
      headers,
    });
    return handleResponse(res);
  },

  // Erase All Data
  async eraseAllData(confirmation: string): Promise<any> {
    const res = await fetch('/api/danger/erase-all-data', {
      method: 'POST',
      headers,
      body: JSON.stringify({ confirmation }),
    });
    return handleResponse(res);
  },

  // PIN Security & Recovery Code Verification
  async getPinStatus(): Promise<PinStatus> {
    const res = await fetch('/api/auth/pin/status', { headers });
    return handleResponse<PinStatus>(res);
  },

  async removePin(): Promise<{ success: boolean; pinEnabled: boolean; message: string }> {
    const res = await fetch('/api/auth/pin/disable', {
      method: 'POST',
      headers,
    });
    return handleResponse<{ success: boolean; pinEnabled: boolean; message: string }>(res);
  },

  async verifyPin(pin: string): Promise<{ success: boolean; token?: string; message?: string }> {
    const res = await fetch('/api/auth/pin/verify', {
      method: 'POST',
      headers,
      body: JSON.stringify({ pin }),
    });
    return handleResponse<{ success: boolean; token?: string; message?: string }>(res);
  },

  async setupPin(newPin: string): Promise<PinChangeResponse> {
    const res = await fetch('/api/auth/pin/setup', {
      method: 'POST',
      headers,
      body: JSON.stringify({ newPin }),
    });
    return handleResponse<PinChangeResponse>(res);
  },

  async changePin(currentPin: string, newPin: string): Promise<PinChangeResponse> {
    const res = await fetch('/api/auth/pin/change', {
      method: 'POST',
      headers,
      body: JSON.stringify({ currentPin, newPin }),
    });
    return handleResponse<PinChangeResponse>(res);
  },

  async verifyRecoveryCode(recoveryCode: string): Promise<PinRecoveryVerifyResponse> {
    const res = await fetch('/api/auth/pin/recovery/verify', {
      method: 'POST',
      headers,
      body: JSON.stringify({ recoveryCode }),
    });
    return handleResponse<PinRecoveryVerifyResponse>(res);
  },

  async resetPinWithRecovery(
    newPin: string,
    recoveryCode?: string,
    resetToken?: string
  ): Promise<PinRecoveryResetResponse> {
    const res = await fetch('/api/auth/pin/recovery/reset', {
      method: 'POST',
      headers,
      body: JSON.stringify({ newPin, recoveryCode, resetToken }),
    });
    return handleResponse<PinRecoveryResetResponse>(res);
  },
};
