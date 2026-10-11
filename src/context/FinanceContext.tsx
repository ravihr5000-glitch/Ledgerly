import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Transaction,
  Budget,
  Goal,
  RecurringItem,
  DetectedPattern,
  CategorizationRule,
  VaultDocument,
  UserPreferences,
  PeriodType,
  TagInfo,
  FinanceMode,
  DEFAULT_PAYMENT_MODES,
  UserProfile,
  ShareConfig,
  PinStatus,
  PinChangeResponse,
  PinRecoveryVerifyResponse,
  PinRecoveryResetResponse,
} from '../types/finance';
import {
  resolvePeriodRange,
  ResolvedPeriod,
  isInternalTransfer,
  isDateInPeriodString,
  normalizeDateString,
} from '../utils/dateFilter';
import {
  api,
  setApiViewOnlySession,
  extractShareTokenFromUrl,
  clearShareTokenStorage,
  getApiOwnerEmail,
  setApiOwnerEmail,
} from '../services/api';
import { realtimeSync } from '../services/realtimeSync';
import { useTheme } from './ThemeContext';

interface FinanceContextType {
  preferences: UserPreferences;
  modes: FinanceMode[];
  activeModeId: string;
  activeMode: FinanceMode;
  transactions: Transaction[];
  filteredTransactions: Transaction[]; // global filtered
  modeTransactions: Transaction[]; // active mode filtered
  categories: string[];
  modeCategories: string[];
  accounts: string[];
  paymentModes: string[];
  tags: TagInfo[];
  budgets: Budget[];
  selectedBudgetIds: string[];
  setSelectedBudgetIds: (ids: string[]) => void;
  toggleSelectBudget: (id: string) => void;
  selectAllBudgets: () => void;
  deselectAllBudgets: () => void;
  isBudgetSelected: (id: string) => boolean;
  selectedBudgetsTotalLimit: number;
  isAllBudgetsSelected: boolean;
  selectedBudgets: Budget[];
  selectedBudgetTransactions: Transaction[];
  dayBudgets: Budget[];
  goals: Goal[];
  rules: CategorizationRule[];
  documents: VaultDocument[];
  recurringData: {
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
  } | null;
  driveStatus: any;
  loading: boolean;
  error: string | null;

  // Period calculations for active mode
  selectedPeriod: PeriodType;
  setSelectedPeriod: (period: PeriodType) => Promise<void>;
  resolvedPeriod: ResolvedPeriod;
  periodIncome: number;
  periodSpending: number;
  moneySaved: number;
  netCashFlow: number;
  savingsRate: number;
  currentBalance: number;
  modeStartingBalance: number;
  updateCurrentBalance: (newBalance: number) => Promise<void>;
  netWorthDisplay: { configured: boolean; value: number; formatted: string };

  // Theme state
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Modals
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (tx: Transaction | null) => void;
  openEditTransactionModal: (tx: Transaction) => void;
  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;
  isTagModalOpen: boolean;
  setIsTagModalOpen: (open: boolean) => void;
  isCreateModeModalOpen: boolean;
  setIsCreateModeModalOpen: (open: boolean) => void;
  editingMode: FinanceMode | null;
  setEditingMode: (mode: FinanceMode | null) => void;

  // Mode Actions
  switchMode: (modeId: string) => Promise<void>;
  createMode: (modeData: Partial<FinanceMode>) => Promise<FinanceMode>;
  updateMode: (id: string, updates: Partial<FinanceMode>) => Promise<FinanceMode>;
  deleteMode: (id: string) => Promise<void>;
  openCreateModeModal: () => void;
  openEditModeModal: (mode: FinanceMode) => void;
  closeModeModal: () => void;

  appName: string;
  updateAppName: (name: string) => void;

  // User Profile
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  uploadAvatar: (file: File) => Promise<string>;
  removeAvatar: () => Promise<void>;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;

  // Real-Time Multi-Device Sync
  realtimeStatus: 'connected' | 'connecting' | 'disconnected';
  connectedDevices: number;

  // Share — View-Only Mode
  isViewOnly: boolean;
  shareConfig: ShareConfig | null;
  enableShareLink: () => Promise<ShareConfig>;
  revokeShareLink: () => Promise<void>;
  refreshShareConfig: () => Promise<ShareConfig | null>;
  exitViewOnly: () => void;

  // Actions
  refreshAll: () => Promise<void>;
  createTransaction: (data: any) => Promise<Transaction>;
  updateTransaction: (id: string, data: any) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteTransactionsBulk: (ids: string[]) => Promise<void>;
  inlineCategoryChange: (id: string, category: string) => Promise<void>;
  inlinePaymentModeChange: (id: string, paymentMode: string) => Promise<void>;
  inlineTagsChange: (id: string, tags: string[]) => Promise<void>;
  saveNetWorth: (assets: number, liabilities: number) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  updateCategory: (oldName: string, newName: string) => Promise<void>;
  deleteCategory: (name: string, reassignTo?: string) => Promise<void>;
  addAccount: (name: string) => Promise<void>;
  deleteAccount: (name: string) => Promise<void>;
  createTag: (name: string) => Promise<void>;
  deleteTag: (name: string, removeHistorical: boolean) => Promise<void>;
  createBudget: (b: any) => Promise<void>;
  updateBudget: (id: string, b: any) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  deleteAllBudgets: () => Promise<void>;
  createGoal: (g: any) => Promise<void>;
  updateGoal: (id: string, g: any) => Promise<void>;
  contributeGoal: (id: string, amount: number) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  confirmRecurring: (data: any) => Promise<void>;
  ignoreRecurringPattern: (key: string) => Promise<void>;
  restoreIgnoredPatterns: () => Promise<void>;
  deleteRecurringItem: (id: string) => Promise<void>;
  createRule: (r: any) => Promise<void>;
  updateRule: (id: string, r: any) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  uploadDocument: (file: File) => Promise<VaultDocument>;
  deleteDocument: (id: string) => Promise<void>;
  syncDrive: () => Promise<void>;
  eraseAllData: (confirmation: string) => Promise<void>;

  // PIN Security & Recovery Code Protection
  isPinLocked: boolean;
  pinStatus: PinStatus | null;
  verifyOwnerPin: (pin: string) => Promise<{ success: boolean; message?: string }>;
  setupOwnerPin: (newPin: string) => Promise<PinChangeResponse>;
  changeOwnerPin: (currentPin: string, newPin: string) => Promise<PinChangeResponse>;
  removeOwnerPin: () => Promise<any>;
  verifyRecoveryCode: (code: string) => Promise<PinRecoveryVerifyResponse>;
  resetPinWithRecovery: (newPin: string, code?: string, resetToken?: string) => Promise<PinRecoveryResetResponse>;
  lockApp: () => void;
  unlockApp: () => void;
  refreshPinStatus: () => Promise<PinStatus | null>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function isDateInPeriod(dateStr: string, period: PeriodType): boolean {
  return isDateInPeriodString(dateStr, period);
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    let initialPeriod: PeriodType = 'All time';
    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('ledgerly_selected_period');
        if (stored) {
          initialPeriod = stored as PeriodType;
        }
      }
    } catch (e) {}
    return {
      selectedPeriod: initialPeriod,
      totalAssets: 0,
      totalLiabilities: 0,
      netWorthConfigured: false,
      resetTimestamp: null,
      timezone: 'America/Los_Angeles',
    };
  });
  const [modes, setModes] = useState<FinanceMode[]>([]);
  const [activeModeId, setActiveModeId] = useState<string>('business');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<string[]>([...DEFAULT_PAYMENT_MODES]);
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudgetIds, setSelectedBudgetIdsState] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('ledgerly_selected_budget_ids');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {}
    return [];
  });
  const [hasCustomBudgetSelection, setHasCustomBudgetSelection] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('ledgerly_has_budget_selection') === 'true';
      }
    } catch (e) {}
    return false;
  });

  const setSelectedBudgetIds = (ids: string[]) => {
    setSelectedBudgetIdsState(ids);
    setHasCustomBudgetSelection(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ledgerly_selected_budget_ids', JSON.stringify(ids));
        localStorage.setItem('ledgerly_has_budget_selection', 'true');
      }
    } catch (e) {}
  };

  const toggleSelectBudget = (id: string) => {
    setSelectedBudgetIdsState((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('ledgerly_selected_budget_ids', JSON.stringify(next));
          localStorage.setItem('ledgerly_has_budget_selection', 'true');
        }
      } catch (e) {}
      return next;
    });
    setHasCustomBudgetSelection(true);
  };

  const selectAllBudgets = () => {
    const allIds = budgets.map((b) => b.id);
    setSelectedBudgetIds(allIds);
  };

  const deselectAllBudgets = () => {
    setSelectedBudgetIds([]);
  };

  const isBudgetSelected = (id: string) => {
    return selectedBudgetIds.includes(id);
  };

  // Keep selectedBudgetIds initialized to all budgets if user hasn't customized yet
  useEffect(() => {
    if (budgets.length > 0 && !hasCustomBudgetSelection) {
      const allIds = budgets.map((b) => b.id);
      setSelectedBudgetIdsState(allIds);
    }
  }, [budgets, hasCustomBudgetSelection]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [recurringData, setRecurringData] = useState<FinanceContextType['recurringData']>(null);
  const [driveStatus, setDriveStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isCreateModeModalOpen, setIsCreateModeModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingMode, setEditingMode] = useState<FinanceMode | null>(null);

  const openEditTransactionModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsAddModalOpen(true);
  };

  const [profile, setProfile] = useState<UserProfile>(() => {
    let initialEmail = getApiOwnerEmail() || 'ravihr5000@gmail.com';
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('ledgerly_user_email');
        if (saved && saved.trim()) initialEmail = saved.trim().toLowerCase();
      }
    } catch {}
    const defaultName = initialEmail.includes('@') ? initialEmail.split('@')[0] : 'Owner';
    const cleanName = defaultName ? defaultName.charAt(0).toUpperCase() + defaultName.slice(1) : 'Owner';
    return {
      name: cleanName,
      email: initialEmail,
      avatarUrl: '',
    };
  });

  // Real-Time Multi-Device Sync State
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [connectedDevices, setConnectedDevices] = useState<number>(1);

  // Subscribe to real-time synchronization updates across devices
  useEffect(() => {
    const activeEmail = profile.email || getApiOwnerEmail() || 'ravihr5000@gmail.com';
    realtimeSync.connect(activeEmail);

    const unsubscribe = realtimeSync.subscribe((event) => {
      if (event.status) {
        setRealtimeStatus(event.status);
      }
      if (typeof event.connectedDevices === 'number') {
        setConnectedDevices(event.connectedDevices);
      }
      if (event.type === 'SYNC_UPDATE' && event.database) {
        const db = event.database;
        if (db.profile) {
          setProfile(db.profile);
        }
        if (db.preferences) {
          setPreferences((prev) => ({ ...prev, ...db.preferences }));
        }
        if (Array.isArray(db.modes)) {
          setModes(db.modes);
        }
        if (db.activeModeId) {
          setActiveModeId(db.activeModeId);
        }
        if (Array.isArray(db.categories)) {
          setCategories(db.categories);
        }
        if (Array.isArray(db.accounts)) {
          setAccounts(db.accounts);
        }
        if (Array.isArray(db.transactions)) {
          setTransactions(db.transactions);
        }
        if (Array.isArray(db.budgets)) {
          setBudgets(db.budgets);
        }
        if (Array.isArray(db.goals)) {
          setGoals(db.goals);
        }
        if (Array.isArray(db.rules)) {
          setRules(db.rules);
        }
        if (Array.isArray(db.documents)) {
          setDocuments(db.documents);
        }
        if (db.driveSync) {
          setDriveStatus(db.driveSync);
        }
        if (db.securityConfig) {
          setPinStatus({
            pinEnabled: db.securityConfig.pinEnabled,
            isCustomPin: Boolean(db.securityConfig.pinHash),
            hasRecoveryCode: Boolean(db.securityConfig.recoveryCodeHash),
            updatedAt: db.securityConfig.updatedAt || null,
          });
        }
        // Seamlessly update recurring analysis & tag counts
        api.getRecurring().then(setRecurringData).catch(() => null);
        api.getTags().then(setTags).catch(() => []);
      }
    });

    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshAll().catch(() => {});
      }
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [profile.email]);

  // Use unified ThemeContext as the single master controller for dark mode
  const { isDarkMode, toggleTheme } = useTheme();

  // Share & View-Only Mode State
  const [isViewOnly, setIsViewOnly] = useState<boolean>(() => {
    try {
      const token = extractShareTokenFromUrl();
      return Boolean(token);
    } catch {
      return false;
    }
  });
  const [shareConfig, setShareConfig] = useState<ShareConfig | null>(null);

  useEffect(() => {
    try {
      const token = extractShareTokenFromUrl();
      if (token) {
        setIsViewOnly(true);
        setApiViewOnlySession(true, token);
        api
          .validateShareToken(token)
          .then((res) => {
            if (res.ownerName) {
              setProfile((prev) => ({ ...prev, name: res.ownerName || prev.name || 'Owner' }));
            }
          })
          .catch(() => {
            clearShareTokenStorage();
            setError('This shared view-only link is inactive or has been revoked by the owner.');
          });
      } else {
        api.getShareConfig().then(setShareConfig).catch(() => null);
        api.getPinStatus().then(setPinStatus).catch(() => null);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const [appName, setAppNameState] = useState<string>(() => {
    try {
      return localStorage.getItem('ledgerly_app_name') || 'हिसाब-किताब';
    } catch {
      return 'हिसाब-किताब';
    }
  });

  const updateAppName = (name: string) => {
    const trimmed = name.trim();
    const finalName = trimmed || 'हिसाब-किताब';
    setAppNameState(finalName);
    try {
      localStorage.setItem('ledgerly_app_name', finalName);
    } catch (e) {
      console.error(e);
    }
  };

  // -------------------------------------------------------------
  // Automatic Security PIN Auto-Lock System (Mobile & Desktop)
  // - Locks automatically after leaving app for 5 seconds or more
  // - Locks when switching to another app or file
  // - Locks when removed from Recent Apps (cold start / relaunch)
  // - Immediately locks in the background so no sensitive data leaks
  // -------------------------------------------------------------
  const autoLockTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFileInputClickRef = React.useRef<number>(0);

  // Background state: immediately true if tab is hidden/backgrounded
  const [isBackgroundHidden, setIsBackgroundHidden] = useState<boolean>(() => {
    try {
      return typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false;
    } catch {
      return false;
    }
  });

  const [isPinAuthenticated, setIsPinAuthenticated] = useState<boolean>(() => {
    try {
      const isAuth = sessionStorage.getItem('ledgerly_pin_authenticated') === 'true';
      if (!isAuth) return false;

      // Check if the app was left/closed for 5 seconds or more before this load
      const leftAt = Number(
        sessionStorage.getItem('ledgerly_pin_left_at') ||
        localStorage.getItem('ledgerly_pin_left_at') ||
        0
      );
      if (leftAt > 0 && Date.now() - leftAt >= 5000) {
        sessionStorage.removeItem('ledgerly_pin_authenticated');
        return false;
      }

      // Check if session instance is still valid
      const sessionActive = sessionStorage.getItem('ledgerly_session_active');
      if (!sessionActive) {
        // Brand new launch or relaunched after process termination / recent apps kill
        sessionStorage.setItem('ledgerly_session_active', 'true');
        sessionStorage.removeItem('ledgerly_pin_authenticated');
        return false;
      }

      return true;
    } catch {
      return false;
    }
  });

  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null);

  // Critical requirement: "Do not ask shared view-only users to enter the owner's PIN."
  // If isViewOnly is true, isPinLocked is ALWAYS false!
  // "Ensure it never stays unlocked in the background it Should be Locked..."
  const isPinLocked = useMemo(() => {
    if (isViewOnly) return false;
    if (!pinStatus?.pinEnabled) return false;
    // 1. If not authenticated, always locked
    if (!isPinAuthenticated) return true;
    // 2. If app is in background or hidden, immediately locked so OS snapshots and background state are protected
    if (isBackgroundHidden) return true;
    return false;
  }, [isViewOnly, pinStatus, isPinAuthenticated, isBackgroundHidden]);

  // Auto-lock event listeners for backgrounding, switching apps/files, and removal from recent apps
  useEffect(() => {
    if (isViewOnly) return;

    // Detect click on file upload inputs to avoid lock when native file picker dialog opens
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        (target?.tagName === 'INPUT' && (target as HTMLInputElement).type === 'file') ||
        target?.closest?.('input[type="file"]') ||
        target?.closest?.('label:has(input[type="file"])')
      ) {
        lastFileInputClickRef.current = Date.now();
      }
    };

    const recordAppLeft = () => {
      const now = Date.now();
      try {
        sessionStorage.setItem('ledgerly_pin_left_at', String(now));
        localStorage.setItem('ledgerly_pin_left_at', String(now));
      } catch (e) {}
    };

    const scheduleAutoLock = () => {
      if (autoLockTimerRef.current) {
        clearTimeout(autoLockTimerRef.current);
      }
      autoLockTimerRef.current = setTimeout(() => {
        try {
          sessionStorage.removeItem('ledgerly_pin_authenticated');
          localStorage.setItem('ledgerly_pin_lock_event', String(Date.now()));
        } catch (e) {}
        setIsPinAuthenticated(false);
      }, 5000);
    };

    const cancelAutoLockTimer = () => {
      if (autoLockTimerRef.current) {
        clearTimeout(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }
    };

    const checkAndApplyElapsedLock = () => {
      const leftAt = Number(
        sessionStorage.getItem('ledgerly_pin_left_at') ||
        localStorage.getItem('ledgerly_pin_left_at') ||
        0
      );
      if (leftAt > 0) {
        const elapsed = Date.now() - leftAt;
        if (elapsed >= 5000) {
          try {
            sessionStorage.removeItem('ledgerly_pin_authenticated');
            localStorage.setItem('ledgerly_pin_lock_event', String(Date.now()));
          } catch (e) {}
          setIsPinAuthenticated(false);
        }
      }
      try {
        sessionStorage.removeItem('ledgerly_pin_left_at');
        localStorage.removeItem('ledgerly_pin_left_at');
      } catch (e) {}
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // App went to the background (switched app, home screen, tab switch)
        // Immediately lock so background screenshot / preview in Recent Apps is shielded!
        setIsBackgroundHidden(true);
        recordAppLeft();
        scheduleAutoLock();
      } else if (document.visibilityState === 'visible') {
        // App returned to foreground
        cancelAutoLockTimer();
        checkAndApplyElapsedLock();
        setIsBackgroundHidden(false);
        refreshAll().catch(() => {});
      }
    };

    const handleWindowBlur = () => {
      // Don't trigger if user just clicked an input type="file" to pick a file
      if (Date.now() - lastFileInputClickRef.current < 20000) {
        return;
      }
      // User switched focus to another app, window, or file
      recordAppLeft();
      scheduleAutoLock();
      if (document.visibilityState === 'hidden') {
        setIsBackgroundHidden(true);
      }
    };

    const handleWindowFocus = () => {
      cancelAutoLockTimer();
      checkAndApplyElapsedLock();
      setIsBackgroundHidden(false);
      refreshAll().catch(() => {});
    };

    const handlePageHide = (e: PageTransitionEvent) => {
      recordAppLeft();
      setIsBackgroundHidden(true);
      // If page is discarded / removed from Recent Apps
      if (!e.persisted) {
        try {
          sessionStorage.removeItem('ledgerly_pin_authenticated');
          sessionStorage.removeItem('ledgerly_session_active');
        } catch (e) {}
      }
    };

    const handleBeforeUnload = () => {
      recordAppLeft();
      try {
        sessionStorage.removeItem('ledgerly_pin_authenticated');
        sessionStorage.removeItem('ledgerly_session_active');
      } catch (e) {}
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ledgerly_pin_lock_event') {
        setIsPinAuthenticated(false);
      }
    };

    window.addEventListener('click', handleGlobalClick, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handleWindowFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('click', handleGlobalClick, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handleWindowFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('storage', handleStorageChange);
      if (autoLockTimerRef.current) {
        clearTimeout(autoLockTimerRef.current);
      }
    };
  }, [isViewOnly]);

  const refreshPinStatus = async (): Promise<PinStatus | null> => {
    try {
      const res = await api.getPinStatus();
      setPinStatus(res);
      return res;
    } catch (e) {
      return null;
    }
  };

  const verifyOwnerPin = async (pin: string) => {
    try {
      const res = await api.verifyPin(pin);
      if (res.success) {
        try {
          sessionStorage.setItem('ledgerly_pin_authenticated', 'true');
          sessionStorage.setItem('ledgerly_session_active', 'true');
          sessionStorage.removeItem('ledgerly_pin_left_at');
          localStorage.removeItem('ledgerly_pin_left_at');
        } catch (e) {}
        setIsBackgroundHidden(false);
        setIsPinAuthenticated(true);
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message || 'Incorrect PIN.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Incorrect PIN.' };
    }
  };

  const setupOwnerPin = async (newPin: string) => {
    const res = await api.setupPin(newPin);
    if (res.success) {
      try {
        sessionStorage.setItem('ledgerly_pin_authenticated', 'true');
        sessionStorage.setItem('ledgerly_session_active', 'true');
        sessionStorage.removeItem('ledgerly_pin_left_at');
        localStorage.removeItem('ledgerly_pin_left_at');
      } catch (e) {}
      setIsBackgroundHidden(false);
      setIsPinAuthenticated(true);
      await refreshPinStatus();
    }
    return res;
  };

  const changeOwnerPin = async (currentPin: string, newPin: string) => {
    const res = await api.changePin(currentPin, newPin);
    if (res.success) {
      await refreshPinStatus();
    }
    return res;
  };

  const removeOwnerPin = async () => {
    const res = await api.removePin();
    if (res.success) {
      try {
        sessionStorage.removeItem('ledgerly_pin_authenticated');
        sessionStorage.removeItem('ledgerly_pin_left_at');
        localStorage.removeItem('ledgerly_pin_left_at');
      } catch (e) {}
      setIsBackgroundHidden(false);
      setIsPinAuthenticated(true);
      await refreshPinStatus();
    }
    return res;
  };

  const verifyRecoveryCode = async (code: string) => {
    return await api.verifyRecoveryCode(code);
  };

  const resetPinWithRecovery = async (newPin: string, code?: string, resetToken?: string) => {
    const res = await api.resetPinWithRecovery(newPin, code, resetToken);
    if (res.success) {
      try {
        sessionStorage.setItem('ledgerly_pin_authenticated', 'true');
        sessionStorage.setItem('ledgerly_session_active', 'true');
        sessionStorage.removeItem('ledgerly_pin_left_at');
        localStorage.removeItem('ledgerly_pin_left_at');
      } catch (e) {}
      setIsBackgroundHidden(false);
      setIsPinAuthenticated(true);
      await refreshPinStatus();
    }
    return res;
  };

  const lockApp = () => {
    try {
      sessionStorage.removeItem('ledgerly_pin_authenticated');
      sessionStorage.setItem('ledgerly_pin_left_at', String(Date.now()));
      localStorage.setItem('ledgerly_pin_left_at', String(Date.now()));
      localStorage.setItem('ledgerly_pin_lock_event', String(Date.now()));
    } catch (e) {}
    setIsPinAuthenticated(false);
  };

  const unlockApp = () => {
    try {
      sessionStorage.setItem('ledgerly_pin_authenticated', 'true');
      sessionStorage.setItem('ledgerly_session_active', 'true');
      sessionStorage.removeItem('ledgerly_pin_left_at');
      localStorage.removeItem('ledgerly_pin_left_at');
    } catch (e) {}
    setIsBackgroundHidden(false);
    setIsPinAuthenticated(true);
  };

  const refreshAll = async () => {
    try {
      const data = await api.getBootstrap();
      if (data.profile) {
        setProfile(data.profile);
      } else if (data.ownerEmail) {
        setProfile((prev) => ({ ...prev, email: data.ownerEmail }));
      }
      const activeEmail = data.profile?.email || data.ownerEmail;
      if (activeEmail) {
        setApiOwnerEmail(activeEmail);
      }
      let effectivePeriod = data.preferences.selectedPeriod;
      try {
        if (typeof window !== 'undefined') {
          const stored = sessionStorage.getItem('ledgerly_selected_period');
          if (stored) {
            effectivePeriod = stored as PeriodType;
          }
        }
      } catch (e) {}
      setPreferences({
        ...data.preferences,
        selectedPeriod: effectivePeriod,
      });
      setModes(data.modes || []);
      if (data.activeModeId) {
        setActiveModeId(data.activeModeId);
      }
      setCategories(data.categories || []);
      setAccounts(data.accounts || [...DEFAULT_PAYMENT_MODES]);
      setTransactions(data.transactions || []);
      setBudgets(data.budgets || []);
      setGoals(data.goals || []);
      setRules(data.rules || []);
      setDocuments(data.documents || []);
      setDriveStatus(data.driveSync);

      // Fetch recurring analysis & tags
      const [rec, tagList] = await Promise.all([
        api.getRecurring().catch(() => null),
        api.getTags().catch(() => []),
      ]);
      setRecurringData(rec);
      setTags(tagList);

      if (!isViewOnly) {
        await refreshPinStatus();
      }

      setError(null);
    } catch (err: any) {
      console.error('Error refreshing finance data:', err);
      setError(err.message || 'Failed to load application data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // Active mode object
  const activeMode: FinanceMode = useMemo(() => {
    const found = modes.find((m) => m.id === activeModeId);
    if (found) return found;
    if (activeModeId === 'combined') {
      return {
        id: 'combined',
        name: 'Combined',
        description: 'Consolidated overview of all financial modes',
        icon: 'Layers',
        color: '#3B82F6',
        startingBalance: modes.filter((m) => m.id !== 'combined').reduce((acc, m) => acc + (m.startingBalance || 0), 0),
        categories: categories,
        isDefault: true,
        createdAt: new Date().toISOString(),
      };
    }
    return (
      modes[0] || {
        id: 'business',
        name: 'Business',
        description: 'Company operations & business finances',
        icon: 'Briefcase',
        color: '#6558D3',
        startingBalance: 0,
        categories: ['Client Revenue', 'Payroll', 'Expense', 'Other'],
        isDefault: true,
        createdAt: new Date().toISOString(),
      }
    );
  }, [modes, activeModeId, categories]);

  // Mode categories - unified set containing Expense, mode-specific categories, and global categories
  const modeCategories = useMemo(() => {
    const set = new Set<string>(['Expense']);
    if (activeMode?.categories && Array.isArray(activeMode.categories)) {
      activeMode.categories.forEach((c) => { if (c && c.trim()) set.add(c.trim()); });
    }
    if (Array.isArray(categories)) {
      categories.forEach((c) => { if (c && c.trim()) set.add(c.trim()); });
    }
    if (activeModeId === 'combined') {
      modes.forEach((m) => m.categories?.forEach((c) => { if (c && c.trim()) set.add(c.trim()); }));
    }
    return Array.from(set);
  }, [activeMode, activeModeId, categories, modes]);

  // Resolved period object (with startDate, endDate, label, filterKey, isSingleDay)
  const resolvedPeriod = useMemo(() => {
    return resolvePeriodRange(preferences.selectedPeriod);
  }, [preferences.selectedPeriod]);

  // Mode-specific transactions ALL TIME (for running balance calculations)
  const modeTransactionsAllTime = useMemo(() => {
    if (activeModeId === 'combined') {
      return transactions;
    }
    return transactions.filter((t) => t.modeId === activeModeId);
  }, [transactions, activeModeId]);

  // Global filtered transactions by period
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => isDateInPeriod(t.date, preferences.selectedPeriod));
  }, [transactions, preferences.selectedPeriod]);

  // Mode-specific transactions within the selected period:
  // If activeModeId === 'combined', show all period transactions.
  // Otherwise, show only transactions belonging to the active mode!
  const modeTransactions = useMemo(() => {
    if (activeModeId === 'combined') {
      return filteredTransactions;
    }
    return filteredTransactions.filter((t) => t.modeId === activeModeId);
  }, [filteredTransactions, activeModeId]);

  // Starting balance for the active mode
  const modeStartingBalance = useMemo(() => {
    if (activeModeId === 'combined') {
      return modes.filter((m) => m.id !== 'combined').reduce((sum, m) => sum + (m.startingBalance || 0), 0);
    }
    return activeMode?.startingBalance || 0;
  }, [modes, activeModeId, activeMode]);

  // Selected budgets list
  const selectedBudgets = useMemo(() => {
    return budgets.filter((b) => selectedBudgetIds.includes(b.id));
  }, [budgets, selectedBudgetIds]);

  // Combined allocated limit of selected budgets
  const selectedBudgetsTotalLimit = useMemo(() => {
    if (selectedBudgets.length > 0) {
      return selectedBudgets.reduce((sum, b) => sum + (b.active ? b.monthlyLimit : 0), 0);
    }
    return budgets.reduce((sum, b) => sum + (b.active ? b.monthlyLimit : 0), 0);
  }, [selectedBudgets, budgets]);

  // Whether all budgets are currently selected
  const isAllBudgetsSelected = useMemo(() => {
    return budgets.length > 0 && (selectedBudgetIds.length === 0 || selectedBudgetIds.length === budgets.length);
  }, [budgets.length, selectedBudgetIds.length]);

  // Budgets created on the selected single day (e.g. date marked with yellow dot in the calendar)
  const dayBudgets = useMemo(() => {
    if (!resolvedPeriod?.isSingleDay) return [];
    return budgets.filter((b) => {
      const raw = b.date ? String(b.date) : (b.createdAt ? String(b.createdAt) : '');
      const key = normalizeDateString(raw);
      return key === resolvedPeriod.startDate;
    });
  }, [budgets, resolvedPeriod]);

  // Transactions within selected budgets for the period.
  // CRITICAL REQUIREMENT: Avoid double-counting transactions when multiple budgets are selected!
  // By filtering filteredTransactions, each transaction is included AT MOST ONCE.
  // If specific budget(s) are selected: includes transactions associated with those budget(s).
  // If no explicit selection or all budgets: includes transactions associated with ANY budget.
  const selectedBudgetTransactions = useMemo(() => {
    if (budgets.length === 0 || isAllBudgetsSelected) return modeTransactions;

    const allBudgetIds = new Set(budgets.map((b) => b.id));
    const activeSelectedIds = selectedBudgetIds.length > 0 ? new Set(selectedBudgetIds) : allBudgetIds;

    const activeSelectedBudgets = budgets.filter((b) => activeSelectedIds.has(b.id));
    const activeCategories = new Set(
      activeSelectedBudgets.map((b) => (b.category || '').toLowerCase().trim()).filter(Boolean)
    );

    const sourceTxs = activeModeId === 'combined' ? filteredTransactions : modeTransactions;
    return sourceTxs.filter((t) => {
      if (isInternalTransfer(t)) return false;
      // 1. Direct budget assignment: match if assigned to active budget or any user budget
      if (t.budgetId) {
        return activeSelectedIds.has(t.budgetId) || allBudgetIds.has(t.budgetId);
      }
      // 2. Categorical association
      const cleanCat = (t.category || '').toLowerCase().trim();
      return cleanCat ? activeCategories.has(cleanCat) : false;
    });
  }, [activeModeId, filteredTransactions, modeTransactions, budgets, selectedBudgetIds, isAllBudgetsSelected]);

  // Income sum in period for active mode / selected budgets (excluding internal transfers)
  const periodIncome = useMemo(() => {
    const txs = budgets.length > 0 ? selectedBudgetTransactions : modeTransactions;
    return txs
      .filter((t) => t.type === 'income' && !isInternalTransfer(t))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [budgets.length, selectedBudgetTransactions, modeTransactions]);

  // Spending sum in period for active mode / selected budgets (excluding internal transfers)
  const periodSpending = useMemo(() => {
    const txs = budgets.length > 0 ? selectedBudgetTransactions : modeTransactions;
    return txs
      .filter((t) => t.type === 'expense' && !isInternalTransfer(t))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [budgets.length, selectedBudgetTransactions, modeTransactions]);

  // Money Saved: Money In minus Money Out during the selected period
  const moneySaved = useMemo(() => {
    return periodIncome - periodSpending;
  }, [periodIncome, periodSpending]);

  // Net Cash Flow for active mode
  const netCashFlow = useMemo(() => {
    return periodIncome - periodSpending;
  }, [periodIncome, periodSpending]);

  // Current Balance:
  // When budgets exist, shows the financial balance across the selected budgets:
  // (Total Allocated Monthly Limit - Spending in period + Income in period).
  // If no budgets have been created at all: account balance using opening balance + net transactions.
  const currentBalance = useMemo(() => {
    if (budgets.length > 0) {
      const allBudgetsLimit = budgets.reduce((sum, b) => sum + (b.active ? b.monthlyLimit : 0), 0);
      const effectiveLimit =
        resolvedPeriod?.isSingleDay && dayBudgets.length > 0
          ? dayBudgets.reduce((sum, b) => sum + (b.active ? b.monthlyLimit : 0), 0)
          : (selectedBudgetsTotalLimit > 0 ? selectedBudgetsTotalLimit : allBudgetsLimit);

      const bal = effectiveLimit - periodSpending + periodIncome;
      return Math.round(bal * 100) / 100;
    }

    const targetEndDate = resolvedPeriod.endDate;
    const txUpToEndDate = modeTransactionsAllTime.filter((t) => {
      const cleanDate = (t.date || '').trim().slice(0, 10);
      return cleanDate <= targetEndDate;
    });

    const netFromTransactions = txUpToEndDate.reduce((sum, t) => {
      if (isInternalTransfer(t)) return sum;
      return sum + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);

    return Math.round((modeStartingBalance + netFromTransactions) * 100) / 100;
  }, [
    budgets.length,
    selectedBudgetIds.length,
    selectedBudgetsTotalLimit,
    dayBudgets,
    periodSpending,
    periodIncome,
    resolvedPeriod.endDate,
    resolvedPeriod.isSingleDay,
    modeTransactionsAllTime,
    modeStartingBalance,
  ]);

  // Savings rate: ((Income - Spending) / Income) * 100, or 0% when income is 0
  const savingsRate = useMemo(() => {
    if (periodIncome <= 0) return 0;
    const rate = ((periodIncome - periodSpending) / periodIncome) * 100;
    return Math.max(0, Math.round(rate * 10) / 10);
  }, [periodIncome, periodSpending]);

  // Net worth display for settings
  const netWorthDisplay = useMemo(() => {
    if (!preferences.netWorthConfigured) {
      return { configured: false, value: 0, formatted: 'Not set' };
    }
    const val = preferences.totalAssets - preferences.totalLiabilities;
    return {
      configured: true,
      value: val,
      formatted: new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(val),
    };
  }, [preferences]);

  // Mode operations
  const switchMode = async (modeId: string) => {
    setActiveModeId(modeId);
    if (!isViewOnly) {
      try {
        await api.setActiveMode(modeId);
      } catch (err: any) {
        console.warn('Could not persist active mode on server:', err);
      }
    }
  };

  const createMode = async (modeData: Partial<FinanceMode>) => {
    if (isViewOnly) throw new Error('Action prohibited: Session is in View-Only mode.');
    const created = await api.createMode(modeData);
    setModes((prev) => [...prev, created]);
    setActiveModeId(created.id);
    setIsCreateModeModalOpen(false);
    setEditingMode(null);
    return created;
  };

  const updateMode = async (id: string, updates: Partial<FinanceMode>) => {
    if (isViewOnly) throw new Error('Action prohibited: Session is in View-Only mode.');
    const updated = await api.updateMode(id, updates);
    setModes((prev) => prev.map((m) => (m.id === id ? updated : m)));
    setIsCreateModeModalOpen(false);
    setEditingMode(null);
    await refreshAll();
    return updated;
  };

  const deleteMode = async (id: string) => {
    if (isViewOnly) throw new Error('Action prohibited: Session is in View-Only mode.');
    await api.deleteMode(id);
    setModes((prev) => prev.filter((m) => m.id !== id));
    if (activeModeId === id) {
      setActiveModeId('business');
    }
    await refreshAll();
  };

  const openCreateModeModal = () => {
    if (isViewOnly) return;
    setEditingMode(null);
    setIsCreateModeModalOpen(true);
  };

  const openEditModeModal = (mode: FinanceMode) => {
    if (isViewOnly) return;
    setEditingMode(mode);
    setIsCreateModeModalOpen(true);
  };

  const closeModeModal = () => {
    setEditingMode(null);
    setIsCreateModeModalOpen(false);
  };

  const updateCurrentBalance = async (newBalance: number) => {
    if (isViewOnly) throw new Error('Action prohibited: Session is in View-Only mode.');
    const num = Math.round(Number(newBalance) * 100) / 100;

    // If exactly 1 budget is selected, update that budget's monthly limit
    if (budgets.length > 0 && selectedBudgetIds.length === 1) {
      const singleBudget = budgets.find((b) => b.id === selectedBudgetIds[0]);
      if (singleBudget) {
        const targetLimit = Math.max(1, Math.round((num + periodSpending - periodIncome) * 100) / 100);
        await api.updateBudget(singleBudget.id, { monthlyLimit: targetLimit });
        const updated = await api.getBudgets();
        setBudgets(updated);
        return;
      }
    }

    try {
      await api.setCurrentBalance(activeModeId, num);
      await refreshAll();
    } catch (err: any) {
      console.error('Error updating current balance via dedicated API:', err);
      // Fallback: calculate delta and adjust starting balance
      const net = periodIncome - periodSpending;
      const targetStarting = Math.round((num - net) * 100) / 100;
      const targetId = activeModeId === 'combined' ? 'business' : activeModeId;
      await api.updateMode(targetId, { startingBalance: targetStarting });
      await refreshAll();
    }
  };

  // Change period with instant reactivity; does not send mutations in View-Only mode
  const setSelectedPeriod = async (period: PeriodType) => {
    setPreferences((p) => ({ ...p, selectedPeriod: period }));
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('ledgerly_selected_period', period);
      }
    } catch (e) {}

    // Only persist to server for owner session; shared viewers operate in strict read-only mode without 403 errors
    if (!isViewOnly) {
      const prev = preferences.selectedPeriod;
      try {
        await api.updatePreferences({ selectedPeriod: period });
      } catch (err: any) {
        setPreferences((p) => ({ ...p, selectedPeriod: prev }));
        setError(`Failed to save period selection: ${err.message}`);
      }
    }
  };

  const createTransaction = async (data: any) => {
    if (isViewOnly) throw new Error('Action prohibited: Session is in View-Only mode.');
    const payload = {
      ...data,
      modeId: data.modeId || (activeModeId === 'combined' ? 'business' : activeModeId),
      paymentMode: data.paymentMode || data.account || 'Bank Transfer',
    };
    const created = await api.createTransaction(payload);
    // Immediately update transactions in memory for instant reactivity on mobile and desktop
    setTransactions((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
    if (created && created.budgetId) {
      setSelectedBudgetIdsState((prev) => {
        if (!prev.includes(created.budgetId!)) {
          const next = [...prev, created.budgetId!];
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('ledgerly_selected_budget_ids', JSON.stringify(next));
            }
          } catch (e) {}
          return next;
        }
        return prev;
      });
    }
    await refreshAll();
    return created;
  };

  const updateTransaction = async (id: string, data: any) => {
    if (isViewOnly) throw new Error('Action prohibited: Session is in View-Only mode.');
    const updated = await api.updateTransaction(id, data);
    setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
    await refreshAll();
    return updated;
  };

  const deleteTransaction = async (id: string) => {
    if (isViewOnly) throw new Error('Action prohibited: Session is in View-Only mode.');
    await api.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    await refreshAll();
  };

  const deleteTransactionsBulk = async (ids: string[]) => {
    if (isViewOnly) throw new Error('Action prohibited: Session is in View-Only mode.');
    await api.deleteTransactionsBulk(ids);
    const idSet = new Set(ids);
    setTransactions((prev) => prev.filter((t) => !idSet.has(t.id)));
    await refreshAll();
  };

  const inlineCategoryChange = async (id: string, category: string) => {
    if (isViewOnly) return;
    await api.patchTransaction(id, { category });
    await refreshAll();
  };

  const inlinePaymentModeChange = async (id: string, paymentMode: string) => {
    if (isViewOnly) return;
    await api.updateTransaction(id, { paymentMode, account: paymentMode });
    await refreshAll();
  };

  const inlineTagsChange = async (id: string, updatedTags: string[]) => {
    if (isViewOnly) return;
    await api.patchTransaction(id, { tags: updatedTags });
    await refreshAll();
  };

  const saveNetWorth = async (assets: number, liabilities: number) => {
    const updated = await api.updatePreferences({
      totalAssets: assets,
      totalLiabilities: liabilities,
      netWorthConfigured: true,
    });
    setPreferences(updated);
  };

  const addCategory = async (name: string) => {
    const catList = await api.addCategory(name);
    if (Array.isArray(catList) && catList.length > 0) {
      setCategories(catList);
    }
    await refreshAll().catch(() => {});
  };

  const updateCategory = async (oldName: string, newName: string) => {
    const cleanOld = oldName.trim();
    const cleanNew = newName.trim();
    const res = await api.updateCategory(cleanOld, cleanNew);
    if (res.categories) {
      setCategories(res.categories);
    }
    if (res.modes) {
      setModes(res.modes);
    }
    // Update transactions state
    if (res.transactions) {
      setTransactions(res.transactions);
    } else {
      setTransactions((prev) =>
        prev.map((t) =>
          t.category && t.category.trim().toLowerCase() === cleanOld.toLowerCase()
            ? { ...t, category: cleanNew }
            : t
        )
      );
    }
    // Update budgets state
    if (res.budgets) {
      setBudgets(res.budgets);
    } else {
      setBudgets((prev) =>
        prev.map((b) =>
          b.category && b.category.trim().toLowerCase() === cleanOld.toLowerCase()
            ? { ...b, category: cleanNew }
            : b
        )
      );
    }
    // Update rules state
    if (res.rules) {
      setRules(res.rules);
    } else {
      setRules((prev) =>
        prev.map((r) =>
          r.targetCategory && r.targetCategory.trim().toLowerCase() === cleanOld.toLowerCase()
            ? { ...r, targetCategory: cleanNew }
            : r
        )
      );
    }
    // Update recurring data state in memory
    setRecurringData((prev) => {
      if (!prev) return prev;
      const updateRec = (it: any) =>
        it.category && it.category.trim().toLowerCase() === cleanOld.toLowerCase()
          ? { ...it, category: cleanNew }
          : it;
      const updatePat = (p: any) =>
        p.category && p.category.trim().toLowerCase() === cleanOld.toLowerCase()
          ? { ...p, category: cleanNew }
          : p;
      return {
        ...prev,
        confirmedBills: (prev.confirmedBills || []).map(updateRec),
        confirmedSubscriptions: (prev.confirmedSubscriptions || []).map(updateRec),
        allConfirmed: (prev.allConfirmed || []).map(updateRec),
        suggestedRecurring: (prev.suggestedRecurring || []).map(updatePat),
        suggestedSubscriptions: (prev.suggestedSubscriptions || []).map(updatePat),
        nextPayment: prev.nextPayment ? updateRec(prev.nextPayment) : null,
      };
    });
    // Trigger full background sync to guarantee consistency everywhere
    await refreshAll().catch(() => {});
  };

  const deleteCategory = async (name: string, reassignTo: string = 'Expense') => {
    const clean = name.trim();
    const res = await api.deleteCategory(clean, reassignTo);
    if (res.categories) {
      setCategories(res.categories);
    }
    if (res.modes) {
      setModes(res.modes);
    }
    // Reassign transactions that used this deleted category to Expense / reassignTo
    if (res.transactions) {
      setTransactions(res.transactions);
    } else {
      setTransactions((prev) =>
        prev.map((t) =>
          t.category && t.category.trim().toLowerCase() === clean.toLowerCase()
            ? { ...t, category: reassignTo }
            : t
        )
      );
    }
    // Remove budgets targeting deleted category
    if (res.budgets) {
      setBudgets(res.budgets);
    } else {
      setBudgets((prev) =>
        prev.filter((b) => b.category.trim().toLowerCase() !== clean.toLowerCase())
      );
    }
    await refreshAll().catch(() => {});
  };

  const addAccount = async (name: string) => {
    const accList = await api.addAccount(name);
    setAccounts(accList);
  };

  const deleteAccount = async (name: string) => {
    const accList = await api.deleteAccount(name);
    setAccounts(accList);
  };

  const createTag = async (name: string) => {
    await api.addTag(name);
    const updated = await api.getTags();
    setTags(updated);
  };

  const deleteTag = async (name: string, removeHistorical: boolean) => {
    await api.deleteTag(name, removeHistorical);
    await refreshAll();
  };

  const createBudget = async (b: any) => {
    const created = await api.createBudget(b);
    const updated = await api.getBudgets();
    setBudgets(updated);
    if (created && created.id) {
      setSelectedBudgetIdsState((prev) => {
        const next = [...prev, created.id];
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('ledgerly_selected_budget_ids', JSON.stringify(next));
          }
        } catch (e) {}
        return next;
      });
    }
  };

  const updateBudget = async (id: string, b: any) => {
    await api.updateBudget(id, b);
    const updated = await api.getBudgets();
    setBudgets(updated);
  };

  const deleteBudget = async (id: string) => {
    await api.deleteBudget(id);
    const updated = await api.getBudgets();
    setBudgets(updated);
    setSelectedBudgetIdsState((prev) => {
      const next = prev.filter((x) => x !== id);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('ledgerly_selected_budget_ids', JSON.stringify(next));
        }
      } catch (e) {}
      return next;
    });
  };

  const deleteAllBudgets = async () => {
    await api.deleteAllBudgets();
    setBudgets([]);
    setSelectedBudgetIdsState([]);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ledgerly_selected_budget_ids', JSON.stringify([]));
      }
    } catch (e) {}
  };

  const createGoal = async (g: any) => {
    await api.createGoal(g);
    const updated = await api.getGoals();
    setGoals(updated);
  };

  const updateGoal = async (id: string, g: any) => {
    await api.updateGoal(id, g);
    const updated = await api.getGoals();
    setGoals(updated);
  };

  const contributeGoal = async (id: string, amount: number) => {
    await api.contributeGoal(id, amount);
    const updated = await api.getGoals();
    setGoals(updated);
  };

  const deleteGoal = async (id: string) => {
    await api.deleteGoal(id);
    const updated = await api.getGoals();
    setGoals(updated);
  };

  const confirmRecurring = async (data: any) => {
    await api.confirmRecurring(data);
    const [rec] = await Promise.all([api.getRecurring()]);
    setRecurringData(rec);
  };

  const ignoreRecurringPattern = async (key: string) => {
    await api.ignorePattern(key);
    const [rec] = await Promise.all([api.getRecurring()]);
    setRecurringData(rec);
  };

  const restoreIgnoredPatterns = async () => {
    await api.restoreIgnored();
    const [rec] = await Promise.all([api.getRecurring()]);
    setRecurringData(rec);
  };

  const deleteRecurringItem = async (id: string) => {
    await api.deleteRecurring(id);
    const [rec] = await Promise.all([api.getRecurring()]);
    setRecurringData(rec);
  };

  const createRule = async (r: any) => {
    await api.createRule(r);
    const updated = await api.getRules();
    setRules(updated);
  };

  const updateRule = async (id: string, r: any) => {
    await api.updateRule(id, r);
    const updated = await api.getRules();
    setRules(updated);
  };

  const deleteRule = async (id: string) => {
    await api.deleteRule(id);
    const updated = await api.getRules();
    setRules(updated);
  };

  const uploadDocument = async (file: File) => {
    const doc = await api.uploadDocument(file);
    const updated = await api.getDocuments();
    setDocuments(updated);
    return doc;
  };

  const deleteDocument = async (id: string) => {
    await api.deleteDocument(id);
    const updated = await api.getDocuments();
    setDocuments(updated);
  };

  const syncDrive = async () => {
    const res = await api.syncDrive();
    await refreshAll();
    return res;
  };

  const eraseAllData = async (confirmation: string) => {
    await api.eraseAllData(confirmation);
    await refreshAll();
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    try {
      const emailChanged = updates.email && updates.email.trim().toLowerCase() !== (profile.email || '').toLowerCase();
      const updated = await api.updateProfile(updates);
      setProfile(updated);
      if (updated.email) {
        setApiOwnerEmail(updated.email);
        realtimeSync.connect(updated.email);
        if (emailChanged) {
          // Switched to another Gmail account: refresh all datasets immediately
          await refreshAll();
        }
      }
      setError(null);
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      throw err;
    }
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    try {
      const res = await api.uploadAvatar(file);
      if (res.profile) {
        setProfile(res.profile);
        if (res.profile.email) {
          setApiOwnerEmail(res.profile.email);
          realtimeSync.connect(res.profile.email);
        }
      } else {
        setProfile((prev) => ({ ...prev, avatarUrl: res.avatarUrl }));
      }
      setError(null);
      return res.avatarUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile picture');
      throw err;
    }
  };

  const removeAvatar = async (): Promise<void> => {
    try {
      const updated = await api.removeAvatar();
      setProfile(updated);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to remove profile picture');
      throw err;
    }
  };

  const refreshShareConfig = async (): Promise<ShareConfig | null> => {
    try {
      const conf = await api.getShareConfig();
      setShareConfig(conf);
      return conf;
    } catch {
      return null;
    }
  };

  const exitViewOnly = () => {
    clearShareTokenStorage();
    setIsViewOnly(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('share');
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
      window.location.reload();
    }
  };

  const enableShareLink = async (): Promise<ShareConfig> => {
    try {
      const conf = await api.enableShare();
      setShareConfig(conf);
      setError(null);
      return conf;
    } catch (err: any) {
      setError(err.message || 'Failed to generate share link');
      throw err;
    }
  };

  const revokeShareLink = async (): Promise<void> => {
    try {
      await api.revokeShare();
      setShareConfig((prev) => (prev ? { ...prev, enabled: false, token: '' } : null));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke share link');
      throw err;
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        preferences,
        modes,
        activeModeId,
        activeMode,
        transactions,
        filteredTransactions,
        modeTransactions,
        categories,
        modeCategories,
        accounts,
        paymentModes: [...DEFAULT_PAYMENT_MODES],
        tags,
        budgets,
        selectedBudgetIds,
        setSelectedBudgetIds,
        toggleSelectBudget,
        selectAllBudgets,
        deselectAllBudgets,
        isBudgetSelected,
        selectedBudgetsTotalLimit,
        isAllBudgetsSelected,
        selectedBudgets,
        selectedBudgetTransactions,
        dayBudgets,
        goals,
        rules,
        documents,
        recurringData,
        driveStatus,
        loading,
        error,
        selectedPeriod: preferences.selectedPeriod,
        setSelectedPeriod,
        resolvedPeriod,
        periodIncome,
        periodSpending,
        moneySaved,
        netCashFlow,
        savingsRate,
        currentBalance,
        modeStartingBalance,
        updateCurrentBalance,
        netWorthDisplay,
        isDarkMode,
        toggleDarkMode: toggleTheme,
        isViewOnly,
        shareConfig,
        enableShareLink,
        revokeShareLink,
        refreshShareConfig,
        exitViewOnly,
        isAddModalOpen,
        setIsAddModalOpen,
        editingTransaction,
        setEditingTransaction,
        openEditTransactionModal,
        isImportModalOpen,
        setIsImportModalOpen,
        isTagModalOpen,
        setIsTagModalOpen,
        isCreateModeModalOpen,
        setIsCreateModeModalOpen,
        isProfileModalOpen,
        setIsProfileModalOpen,
        profile,
        updateProfile,
        uploadAvatar,
        removeAvatar,
        realtimeStatus,
        connectedDevices,
        editingMode,
        setEditingMode,
        switchMode,
        createMode,
        updateMode,
        deleteMode,
        openCreateModeModal,
        openEditModeModal,
        closeModeModal,
        appName,
        updateAppName,
        refreshAll,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        deleteTransactionsBulk,
        inlineCategoryChange,
        inlinePaymentModeChange,
        inlineTagsChange,
        saveNetWorth,
        addCategory,
        updateCategory,
        deleteCategory,
        addAccount,
        deleteAccount,
        createTag,
        deleteTag,
        createBudget,
        updateBudget,
        deleteBudget,
        deleteAllBudgets,
        createGoal,
        updateGoal,
        contributeGoal,
        deleteGoal,
        confirmRecurring,
        ignoreRecurringPattern,
        restoreIgnoredPatterns,
        deleteRecurringItem,
        createRule,
        updateRule,
        deleteRule,
        uploadDocument,
        deleteDocument,
        syncDrive,
        eraseAllData,
        isPinLocked,
        pinStatus,
        verifyOwnerPin,
        setupOwnerPin,
        changeOwnerPin,
        removeOwnerPin,
        verifyRecoveryCode,
        resetPinWithRecovery,
        lockApp,
        unlockApp,
        refreshPinStatus,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
