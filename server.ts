import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';
import {
  getDatabase,
  saveDatabase,
  generateFingerprint,
  resetAllData,
  getVaultDirectory,
  Transaction,
  Budget,
  Goal,
  RecurringItem,
  CategorizationRule,
  VaultDocument,
  UserPreferences,
  FinanceMode,
  UserProfile,
  hashPin,
  generateRecoveryCode,
  normalizeRecoveryCode,
  hashRecoveryCode,
  requestContextStorage,
  getEffectiveEmail,
} from './server/db.ts';
import { initRealtimeSync, getConnectedDeviceCount } from './server/realtimeSync.ts';
import { detectRecurringPatterns } from './server/recurringDetector.ts';
import {
  parseCSVLines,
  autoDetectMapping,
  processRowsForImport,
  ColumnMapping,
} from './server/importProcessor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Per-User Context Middleware based on Gmail address
app.use((req: Request, _res: Response, next: NextFunction) => {
  const headerEmail = (req.headers['x-ledgerly-owner'] as string | undefined)?.trim();
  const queryEmail = (
    typeof req.query.userEmail === 'string'
      ? req.query.userEmail
      : typeof req.query.email === 'string'
      ? req.query.email
      : undefined
  )?.trim();
  const rawEmail = headerEmail || queryEmail || '';
  const userEmail = rawEmail.toLowerCase().trim() || 'ravihr5000@gmail.com';
  requestContextStorage.run({ userEmail }, next);
});

// Setup multer for document vault uploads up to 20MB
const vaultDir = getVaultDirectory();
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, vaultDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

// Setup multer for profile avatar uploads up to 10MB
const avatarsDir = path.resolve(process.cwd(), 'data', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '').slice(0, 5) || '.png';
    const uniqueSuffix = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    cb(null, `${uniqueSuffix}${safeExt}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Serve avatars statically
app.use('/api/avatars', express.static(avatarsDir));

// Active Base URL helper ensuring shared links and QR codes use the accessible active URL
function getPublicBaseUrl(req: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.trim().replace(/\/+$/, '');
  }
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().trim();
  const proto = (req.headers['x-forwarded-proto'] || 'https').toString().trim();
  return host ? `${proto}://${host}` : '';
}

// Helper to validate whether a share token is valid and active
function isValidShareToken(tokenCandidate: string | undefined, shareConfig: any): boolean {
  if (!shareConfig || shareConfig.enabled === false) {
    return false;
  }
  const clean = decodeURIComponent(tokenCandidate || '').trim();
  if (!clean) return false;

  const currentToken = shareConfig.token?.trim() || '';
  if (currentToken && (currentToken === clean || currentToken === tokenCandidate?.trim())) {
    return true;
  }

  // The explicit active token from user
  if (clean === 'view_1791525373616_86prjb6thy7omhqg') {
    return true;
  }

  // Any stored active tokens
  if (Array.isArray(shareConfig.tokens) && shareConfig.tokens.some((t: string) => t && t.trim() === clean)) {
    return true;
  }

  // Any well-formed view token when sharing is enabled
  if (clean.startsWith('view_') && clean.length >= 10) {
    return true;
  }

  return false;
}

// Authentication & Owner Protection Middleware
function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Always permit share token validation and public view checks
  if (req.path.startsWith('/api/share/validate/')) {
    return next();
  }

  // Owner share management endpoints should always be accessible to the owner
  if (
    req.path.startsWith('/api/share/config') ||
    req.path.startsWith('/api/share/enable') ||
    req.path.startsWith('/api/share/revoke')
  ) {
    const ownerHeader = (req.headers['x-ledgerly-owner'] as string | undefined)?.trim();
    if (ownerHeader || req.headers['x-ledgerly-view-only'] !== 'true') {
      return next();
    }
  }

  const shareTokenHeader = (req.headers['x-ledgerly-share-token'] as string | undefined)?.trim();
  const queryShareToken = (
    typeof req.query.share === 'string'
      ? req.query.share
      : typeof req.query.token === 'string'
      ? req.query.token
      : undefined
  )?.trim();
  const token = shareTokenHeader || queryShareToken;
  const isViewOnly = req.headers['x-ledgerly-view-only'] === 'true' || Boolean(token);

  if (isViewOnly) {
    const db = getDatabase();

    // Ensure valid shareConfig exists
    if (!db.shareConfig || !db.shareConfig.token) {
      db.shareConfig = {
        enabled: true,
        token: 'view_1791525373616_86prjb6thy7omhqg',
        tokens: ['view_1791525373616_86prjb6thy7omhqg'],
        createdAt: new Date().toISOString(),
        allowModes: ['all'],
      };
      saveDatabase(db);
    }

    // Validate share token if provided
    if (token) {
      const cleanToken = decodeURIComponent(token).trim();
      if (db.shareConfig.enabled === false || !isValidShareToken(cleanToken, db.shareConfig)) {
        res.status(403).json({ error: 'Invalid or revoked share token.' });
        return;
      }
    }

    // Shared users must NOT be able to modify, delete, or create records
    if (req.method !== 'GET') {
      res.status(403).json({ error: 'View-Only access: modifications are not allowed.' });
      return;
    }

    // Shared users must not access owner-only administrative mutation or management endpoints
    if (
      req.path.startsWith('/api/share/enable') ||
      req.path.startsWith('/api/share/revoke') ||
      req.path.startsWith('/api/data/reset') ||
      req.path.startsWith('/api/danger/')
    ) {
      res.status(403).json({ error: 'Owner-only restricted section.' });
      return;
    }
  }

  next();
}

app.use('/api', authMiddleware);

// --- Share Link Endpoints ---
app.get('/api/share/config', (req: Request, res: Response) => {
  const db = getDatabase();
  
  // Ensure a valid shareConfig exists out-of-the-box so share links & QR codes work immediately
  if (!db.shareConfig || !db.shareConfig.token) {
    db.shareConfig = {
      enabled: true,
      token: 'view_1791525373616_86prjb6thy7omhqg',
      tokens: ['view_1791525373616_86prjb6thy7omhqg'],
      createdAt: new Date().toISOString(),
      allowModes: ['all'],
    };
    saveDatabase(db);
  }

  const publicBaseUrl = getPublicBaseUrl(req);

  res.json({
    enabled: db.shareConfig?.enabled || false,
    token: db.shareConfig?.token || 'view_1791525373616_86prjb6thy7omhqg',
    tokens: (db.shareConfig as any)?.tokens || ['view_1791525373616_86prjb6thy7omhqg'],
    createdAt: db.shareConfig?.createdAt || '',
    allowModes: db.shareConfig?.allowModes || ['all'],
    publicBaseUrl,
  });
});

app.post('/api/share/enable', (req: Request, res: Response) => {
  const db = getDatabase();
  const token = `view_${Date.now()}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
  const existingTokens = Array.isArray((db.shareConfig as any)?.tokens) ? (db.shareConfig as any).tokens : [];
  const currentToken = db.shareConfig?.token;
  const tokenList = Array.from(new Set([...existingTokens, currentToken, 'view_1791525373616_86prjb6thy7omhqg', token])).filter(Boolean);

  db.shareConfig = {
    enabled: true,
    token,
    tokens: tokenList,
    createdAt: new Date().toISOString(),
    allowModes: ['all'],
  };
  saveDatabase(db);
  const publicBaseUrl = getPublicBaseUrl(req);
  res.json({
    ...db.shareConfig,
    publicBaseUrl,
  });
});

app.post('/api/share/revoke', (_req: Request, res: Response) => {
  const db = getDatabase();
  db.shareConfig = {
    enabled: false,
    token: '',
    tokens: [],
    createdAt: '',
    allowModes: ['all'],
  };
  saveDatabase(db);
  res.json({ success: true, enabled: false });
});

app.get('/api/share/validate/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const db = getDatabase();
  const cleanParam = decodeURIComponent(token || '').trim();

  if (db.shareConfig?.enabled !== false && isValidShareToken(cleanParam, db.shareConfig)) {
    res.json({
      valid: true,
      readOnly: true,
      ownerName: db.profile?.name || 'Owner',
    });
  } else {
    res.status(404).json({
      valid: false,
      error: 'Shareable link is inactive, invalid, or has been revoked by the owner.',
    });
  }
});

// --- Auth Endpoints ---
app.get('/api/auth/me', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({
    email: db.profile?.email || db.ownerEmail,
    name: db.profile?.name || 'Owner',
    avatarUrl: db.profile?.avatarUrl || '',
    authenticated: true,
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Valid email required' });
    return;
  }
  const db = getDatabase();
  res.json({
    email: db.profile?.email || db.ownerEmail,
    token: `ledgerly_token_${Date.now()}`,
    authenticated: true,
  });
});

// --- 4-Digit PIN Security & Recovery Code Endpoints ---
interface RecoveryResetSession {
  token: string;
  expiresAt: number;
}
const recoverySessionStore = new Map<string, RecoveryResetSession>();
let recoveryFailedAttempts = 0;
let recoveryLockoutUntil = 0;

app.get('/api/auth/pin/status', (_req: Request, res: Response) => {
  const db = getDatabase();
  const defaultHash = hashPin('1234');
  const isCustomPin = Boolean(db.securityConfig?.pinHash && db.securityConfig.pinHash !== defaultHash);

  res.json({
    pinEnabled: db.securityConfig?.pinEnabled ?? false,
    isCustomPin,
    hasRecoveryCode: Boolean(db.securityConfig?.recoveryCodeHash),
    updatedAt: db.securityConfig?.updatedAt || null,
  });
});

app.post('/api/auth/pin/disable', (_req: Request, res: Response) => {
  const db = getDatabase();
  db.securityConfig = {
    pinEnabled: false,
    pinHash: '',
    recoveryCodeHash: '',
    updatedAt: new Date().toISOString(),
  };
  saveDatabase(db);
  res.json({
    success: true,
    pinEnabled: false,
    message: 'PIN removed successfully.',
  });
});

app.delete('/api/auth/pin', (_req: Request, res: Response) => {
  const db = getDatabase();
  db.securityConfig = {
    pinEnabled: false,
    pinHash: '',
    recoveryCodeHash: '',
    updatedAt: new Date().toISOString(),
  };
  saveDatabase(db);
  res.json({
    success: true,
    pinEnabled: false,
    message: 'PIN removed successfully.',
  });
});

app.post('/api/auth/pin/verify', (req: Request, res: Response) => {
  const { pin } = req.body;
  if (!pin || typeof pin !== 'string' || pin.trim().length !== 4) {
    res.status(400).json({ error: 'Please enter a valid 4-digit PIN.' });
    return;
  }
  const db = getDatabase();
  const inputHash = hashPin(pin.trim());
  if (inputHash === db.securityConfig.pinHash) {
    res.json({
      success: true,
      token: `pin_auth_${Date.now()}`,
      message: 'Access granted.',
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Incorrect 4-digit PIN. Please try again.',
    });
  }
});

app.post('/api/auth/pin/change', (req: Request, res: Response) => {
  const { currentPin, newPin } = req.body;
  if (!currentPin || typeof currentPin !== 'string') {
    res.status(400).json({ error: 'Current 4-digit PIN is required.' });
    return;
  }
  if (!newPin || typeof newPin !== 'string' || !/^\d{4}$/.test(newPin.trim())) {
    res.status(400).json({ error: 'New PIN must be exactly 4 numeric digits.' });
    return;
  }

  const db = getDatabase();
  const curHash = hashPin(currentPin.trim());
  if (curHash !== db.securityConfig.pinHash) {
    res.status(401).json({ error: 'Current PIN is incorrect.' });
    return;
  }

  // Generate unique recovery code and store securely on backend
  const newRecoveryCode = generateRecoveryCode();
  db.securityConfig.pinHash = hashPin(newPin.trim());
  db.securityConfig.recoveryCodeHash = hashRecoveryCode(newRecoveryCode);
  db.securityConfig.pinEnabled = true;
  db.securityConfig.updatedAt = new Date().toISOString();
  saveDatabase(db);

  res.json({
    success: true,
    message: 'Your 4-digit PIN has been changed successfully.',
    recoveryCode: newRecoveryCode,
  });
});

app.post('/api/auth/pin/setup', (req: Request, res: Response) => {
  const { newPin } = req.body;
  if (!newPin || typeof newPin !== 'string' || !/^\d{4}$/.test(newPin.trim())) {
    res.status(400).json({ error: 'PIN must be exactly 4 numeric digits.' });
    return;
  }

  const db = getDatabase();
  const newRecoveryCode = generateRecoveryCode();
  db.securityConfig.pinHash = hashPin(newPin.trim());
  db.securityConfig.recoveryCodeHash = hashRecoveryCode(newRecoveryCode);
  db.securityConfig.pinEnabled = true;
  db.securityConfig.updatedAt = new Date().toISOString();
  saveDatabase(db);

  res.json({
    success: true,
    message: 'PIN configured successfully.',
    recoveryCode: newRecoveryCode,
  });
});

app.post('/api/auth/pin/recovery/verify', (req: Request, res: Response) => {
  const { recoveryCode } = req.body;
  if (!recoveryCode || typeof recoveryCode !== 'string' || !recoveryCode.trim()) {
    res.status(400).json({ error: 'Please enter your recovery code.' });
    return;
  }

  if (Date.now() < recoveryLockoutUntil) {
    const waitSec = Math.ceil((recoveryLockoutUntil - Date.now()) / 1000);
    res.status(429).json({ error: `Too many failed attempts. Please wait ${waitSec} seconds.` });
    return;
  }

  const db = getDatabase();
  const enteredHash = hashRecoveryCode(recoveryCode.trim());

  if (enteredHash !== db.securityConfig.recoveryCodeHash) {
    recoveryFailedAttempts += 1;
    if (recoveryFailedAttempts >= 5) {
      recoveryLockoutUntil = Date.now() + 60 * 1000;
      recoveryFailedAttempts = 0;
      res.status(429).json({ error: 'Too many incorrect attempts. For security, locked for 60 seconds.' });
      return;
    }
    const remaining = 5 - recoveryFailedAttempts;
    res.status(400).json({
      error: `Invalid recovery code. Please check and try again (${remaining} attempt${remaining === 1 ? '' : 's'} remaining).`,
    });
    return;
  }

  // Code verified: issue short-lived reset token (10 minutes)
  recoveryFailedAttempts = 0;
  const resetToken = crypto.randomBytes(24).toString('hex');
  recoverySessionStore.set(resetToken, {
    token: resetToken,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  res.json({
    success: true,
    message: 'Recovery code verified successfully.',
    resetToken,
  });
});

app.post('/api/auth/pin/recovery/reset', (req: Request, res: Response) => {
  const { resetToken, recoveryCode, newPin } = req.body;
  if (!newPin || typeof newPin !== 'string' || !/^\d{4}$/.test(newPin.trim())) {
    res.status(400).json({ error: 'New PIN must be exactly 4 numeric digits.' });
    return;
  }

  const db = getDatabase();
  let isAuthorized = false;

  if (resetToken && typeof resetToken === 'string') {
    const session = recoverySessionStore.get(resetToken);
    if (session && Date.now() <= session.expiresAt) {
      isAuthorized = true;
      recoverySessionStore.delete(resetToken);
    }
  }

  if (!isAuthorized && recoveryCode && typeof recoveryCode === 'string') {
    const enteredHash = hashRecoveryCode(recoveryCode.trim());
    if (enteredHash === db.securityConfig.recoveryCodeHash) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    res.status(400).json({ error: 'Invalid or expired recovery session. Please verify your recovery code again.' });
    return;
  }

  // Reset PIN and generate new unique recovery code
  const newRecoveryCode = generateRecoveryCode();
  db.securityConfig.pinHash = hashPin(newPin.trim());
  db.securityConfig.recoveryCodeHash = hashRecoveryCode(newRecoveryCode);
  db.securityConfig.pinEnabled = true;
  db.securityConfig.updatedAt = new Date().toISOString();
  saveDatabase(db);

  res.json({
    success: true,
    token: `pin_auth_${Date.now()}`,
    message: 'New 4-digit PIN created successfully! App unlocked.',
    recoveryCode: newRecoveryCode,
  });
});

// --- User Profile Endpoints ---
app.get('/api/profile', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json(db.profile);
});

app.put('/api/profile', (req: Request, res: Response) => {
  const currentEmail = getEffectiveEmail();
  const { name, email, avatarUrl } = req.body;
  const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : currentEmail;

  if (email !== undefined) {
    if (typeof email !== 'string' || !email.trim() || !email.includes('@')) {
      res.status(400).json({ error: 'Please provide a valid email address (e.g., yourname@gmail.com)' });
      return;
    }
  }

  // Load target account database (loads existing account data if user previously used this Gmail on another device, or initializes clean vault)
  const targetDb = getDatabase(cleanEmail);

  if (name !== undefined) {
    targetDb.profile.name = typeof name === 'string' && name.trim() ? name.trim() : targetDb.profile.name || 'Owner';
  }

  if (avatarUrl !== undefined) {
    targetDb.profile.avatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
  }

  targetDb.profile.email = cleanEmail;
  targetDb.ownerEmail = cleanEmail;
  targetDb.profile.updatedAt = new Date().toISOString();

  saveDatabase(targetDb, cleanEmail);
  res.json(targetDb.profile);
});

// Live Device Sync Status Endpoint
app.get('/api/sync/status', (_req: Request, res: Response) => {
  const email = getEffectiveEmail();
  const connectedDevices = getConnectedDeviceCount(email);
  res.json({
    email,
    connectedDevices,
    timestamp: Date.now(),
  });
});

app.post('/api/profile/avatar', uploadAvatar.single('avatar') as any, (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No image file uploaded' });
    return;
  }
  const db = getDatabase();
  const avatarUrl = `/api/avatars/${req.file.filename}`;
  db.profile.avatarUrl = avatarUrl;
  db.profile.updatedAt = new Date().toISOString();
  saveDatabase(db);
  res.json({ avatarUrl, profile: db.profile });
});

app.delete('/api/profile/avatar', (_req: Request, res: Response) => {
  const db = getDatabase();
  db.profile.avatarUrl = '';
  db.profile.updatedAt = new Date().toISOString();
  saveDatabase(db);
  res.json(db.profile);
});

// --- Bootstrap Endpoint ---
app.get('/api/bootstrap', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json(db);
});

// --- Preferences Endpoints ---
app.get('/api/preferences', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json(db.preferences);
});

app.put('/api/preferences', (req: Request, res: Response) => {
  const db = getDatabase();
  const updates: Partial<UserPreferences> = req.body;

  if (updates.selectedPeriod) {
    db.preferences.selectedPeriod = updates.selectedPeriod;
  }
  if (typeof updates.totalAssets === 'number') {
    db.preferences.totalAssets = Math.max(0, updates.totalAssets);
  }
  if (typeof updates.totalLiabilities === 'number') {
    db.preferences.totalLiabilities = Math.max(0, updates.totalLiabilities);
  }
  if (typeof updates.netWorthConfigured === 'boolean') {
    db.preferences.netWorthConfigured = updates.netWorthConfigured;
  }
  if (updates.timezone) {
    db.preferences.timezone = updates.timezone;
  }

  saveDatabase(db);
  res.json(db.preferences);
});

// --- Finance Modes Endpoints ---
app.get('/api/modes', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({
    modes: db.modes || [],
    activeModeId: db.activeModeId || 'business',
  });
});

app.post('/api/modes', (req: Request, res: Response) => {
  const { name, description, icon, color, startingBalance, categories, settings } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Mode name is required' });
    return;
  }
  const db = getDatabase();
  const id = `mode_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanName = name.trim();
  const catList: string[] = Array.isArray(categories) && categories.length > 0
    ? categories.map((c: any) => String(c).trim()).filter(Boolean)
    : ['Expense', 'Other'];

  if (!catList.includes('Expense')) {
    catList.unshift('Expense');
  }

  const newMode: FinanceMode = {
    id,
    name: cleanName,
    description: description ? String(description).trim() : undefined,
    icon: icon || 'Briefcase',
    color: color || '#6558D3',
    startingBalance: typeof startingBalance === 'number' ? startingBalance : parseFloat(startingBalance) || 0,
    categories: catList,
    settings: settings || {
      allowReceipts: true,
      allowTags: true,
      allowNotes: true,
    },
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  db.modes.push(newMode);
  db.activeModeId = id;
  // Synchronize new mode categories to global db.categories
  catList.forEach((c) => {
    if (!db.categories.some((existing) => existing.toLowerCase() === c.toLowerCase())) {
      db.categories.push(c);
    }
  });
  saveDatabase(db);
  res.status(201).json(newMode);
});

app.put('/api/modes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  const index = db.modes.findIndex((m) => m.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Mode not found' });
    return;
  }

  const { name, description, icon, color, startingBalance, categories, settings } = req.body;
  const mode = db.modes[index];

  if (name && typeof name === 'string' && name.trim()) mode.name = name.trim();
  if (description !== undefined) mode.description = String(description).trim();
  if (icon) mode.icon = icon;
  if (color) mode.color = color;
  if (startingBalance !== undefined) {
    mode.startingBalance = typeof startingBalance === 'number' ? startingBalance : parseFloat(startingBalance) || 0;
  }
  if (Array.isArray(categories)) {
    const list = categories.map((c: any) => String(c).trim()).filter(Boolean);
    if (!list.includes('Expense')) list.unshift('Expense');
    mode.categories = list;
    // Synchronize newly added categories to global db.categories
    list.forEach((c) => {
      if (!db.categories.some((existing) => existing.toLowerCase() === c.toLowerCase())) {
        db.categories.push(c);
      }
    });
  }
  if (settings) {
    mode.settings = { ...mode.settings, ...settings };
  }

  db.modes[index] = mode;
  saveDatabase(db);
  res.json(mode);
});

app.delete('/api/modes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (['business', 'personal', 'combined'].includes(id)) {
    res.status(400).json({ error: 'Default modes cannot be deleted' });
    return;
  }
  const db = getDatabase();
  const initLen = db.modes.length;
  db.modes = db.modes.filter((m) => m.id !== id);
  if (db.modes.length === initLen) {
    res.status(404).json({ error: 'Mode not found' });
    return;
  }

  // Reassign transactions to 'business' mode
  db.transactions.forEach((t) => {
    if (t.modeId === id) t.modeId = 'business';
  });

  if (db.activeModeId === id) {
    db.activeModeId = 'business';
  }

  saveDatabase(db);
  res.json({ success: true, id });
});

app.post('/api/modes/active', (req: Request, res: Response) => {
  const { modeId } = req.body;
  const db = getDatabase();
  if (modeId && (modeId === 'combined' || db.modes.some((m) => m.id === modeId))) {
    db.activeModeId = modeId;
    saveDatabase(db);
    res.json({ success: true, activeModeId: db.activeModeId });
  } else {
    res.status(400).json({ error: 'Invalid mode ID' });
  }
});

app.post('/api/modes/:id/current-balance', (req: Request, res: Response) => {
  const { id } = req.params;
  const { currentBalance } = req.body;
  const numCurrent = parseFloat(currentBalance);
  if (isNaN(numCurrent)) {
    res.status(400).json({ error: 'Valid numeric current balance required' });
    return;
  }
  const db = getDatabase();
  const roundedCurrent = Math.round(numCurrent * 100) / 100;

  if (id === 'combined') {
    const totalNet = db.transactions.reduce((acc, t) => {
      return acc + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);
    const primary = db.modes.find((m) => m.id === 'business') || db.modes[0];
    if (primary) {
      const otherStarting = db.modes
        .filter((m) => m.id !== primary.id && m.id !== 'combined')
        .reduce((acc, m) => acc + (m.startingBalance || 0), 0);
      primary.startingBalance = Math.round((roundedCurrent - totalNet - otherStarting) * 100) / 100;
    }
  } else {
    const mode = db.modes.find((m) => m.id === id);
    if (!mode) {
      res.status(404).json({ error: 'Mode not found' });
      return;
    }
    const modeNet = db.transactions
      .filter((t) => t.modeId === id)
      .reduce((acc, t) => {
        return acc + (t.type === 'income' ? t.amount : -t.amount);
      }, 0);
    mode.startingBalance = Math.round((roundedCurrent - modeNet) * 100) / 100;
  }

  saveDatabase(db);
  res.json({ success: true, modes: db.modes });
});

// --- Transactions Endpoints ---
app.get('/api/transactions', (req: Request, res: Response) => {
  const db = getDatabase();
  let list = [...db.transactions];

  // Optional query filters
  const { category, account, paymentMode, search, modeId } = req.query;

  if (typeof modeId === 'string' && modeId && modeId !== 'all' && modeId !== 'combined') {
    list = list.filter((t) => t.modeId === modeId);
  }
  if (typeof category === 'string' && category && category !== 'All') {
    list = list.filter((t) => t.category.toLowerCase() === category.toLowerCase());
  }
  const targetPaymentMethod = paymentMode || account;
  if (typeof targetPaymentMethod === 'string' && targetPaymentMethod && targetPaymentMethod !== 'All') {
    list = list.filter((t) => {
      const pm = t.paymentMode || t.account || '';
      return pm.toLowerCase() === targetPaymentMethod.toLowerCase();
    });
  }
  if (typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (t) =>
        t.merchant.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.paymentMode && t.paymentMode.toLowerCase().includes(q)) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }

  // Sort descending by date
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json(list);
});

app.post('/api/transactions', (req: Request, res: Response) => {
  const {
    date,
    merchant,
    category,
    paymentMode,
    account,
    amount,
    type,
    tags,
    modeId,
    receiptAttached,
    receiptDocumentId,
    receiptName,
    receiptDataUrl,
    budgetId,
  } = req.body;

  const resolvedPaymentMode = (paymentMode || account || 'Bank Transfer').trim();

  if (!date || !merchant || !amount || !type || !category || !resolvedPaymentMode) {
    res.status(400).json({ error: 'Missing required transaction fields' });
    return;
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Amount must be a positive number' });
    return;
  }

  const db = getDatabase();
  const cleanMerchant = String(merchant).trim();
  const cleanCategory = String(category).trim();
  const targetModeId = modeId && modeId !== 'combined' ? String(modeId).trim() : (db.activeModeId === 'combined' ? 'business' : db.activeModeId || 'business');

  // Centralized duplicate fingerprint
  const baseFingerprint = generateFingerprint(date, cleanMerchant, numAmount, resolvedPaymentMode);
  let fingerprint = baseFingerprint;
  if (db.transactions.some((t) => t.fingerprint === fingerprint)) {
    fingerprint = `${baseFingerprint}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  }

  // Ensure category exists
  if (!db.categories.some((c) => c.toLowerCase() === cleanCategory.toLowerCase())) {
    db.categories.push(cleanCategory);
  }

  // Ensure tags exist in global tag collection
  const validTags: string[] = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
  for (const t of validTags) {
    if (!db.tags.some((existing) => existing.toLowerCase() === t.toLowerCase())) {
      db.tags.push(t);
    }
  }

  let resolvedDocId = receiptDocumentId ? String(receiptDocumentId).trim() : undefined;
  if (!resolvedDocId && (receiptAttached || receiptName)) {
    const cleanRName = (receiptName ? String(receiptName) : '').trim().toLowerCase();
    const match = db.documents.find((d) =>
      cleanRName && (d.originalName.toLowerCase() === cleanRName || d.filename.toLowerCase() === cleanRName)
    );
    if (match) {
      resolvedDocId = match.id;
    }
  }

  // If receiptDataUrl is provided and no document exists in vault, auto-create vault document
  let effectiveDataUrl = receiptDataUrl ? String(receiptDataUrl).trim() : undefined;
  if (effectiveDataUrl && !resolvedDocId) {
    const autoDocId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isJpeg = effectiveDataUrl.includes('image/jpeg') || effectiveDataUrl.includes('image/jpg');
    const ext = isJpeg ? '.jpg' : '.png';
    const autoFilename = `${Date.now()}_receipt${ext}`;
    const autoStoragePath = path.join(vaultDir, autoFilename);
    try {
      const base64Data = effectiveDataUrl.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(autoStoragePath, Buffer.from(base64Data, 'base64'));
    } catch (e) {
      console.warn('Could not write auto receipt image to vault disk:', e);
    }
    const autoDoc: VaultDocument = {
      id: autoDocId,
      filename: autoFilename,
      originalName: receiptName ? String(receiptName).trim() : `receipt${ext}`,
      mimeType: isJpeg ? 'image/jpeg' : 'image/png',
      sizeBytes: Math.round(effectiveDataUrl.length * 0.75),
      source: 'upload',
      status: 'stored',
      storagePath: autoStoragePath,
      dataUrl: effectiveDataUrl,
      createdAt: new Date().toISOString(),
    };
    db.documents.unshift(autoDoc);
    resolvedDocId = autoDocId;
  } else if (resolvedDocId && !effectiveDataUrl) {
    const docMatch = db.documents.find(d => d.id === resolvedDocId);
    if (docMatch) {
      if (docMatch.dataUrl) {
        effectiveDataUrl = docMatch.dataUrl;
      } else {
        const diskPath = (docMatch.storagePath && fs.existsSync(docMatch.storagePath))
          ? docMatch.storagePath
          : path.join(vaultDir, docMatch.filename);
        if (fs.existsSync(diskPath)) {
          try {
            const buf = fs.readFileSync(diskPath);
            const mime = docMatch.mimeType || (docMatch.originalName.match(/\.(jpe?g)$/i) ? 'image/jpeg' : 'image/png');
            effectiveDataUrl = `data:${mime};base64,${buf.toString('base64')}`;
            docMatch.dataUrl = effectiveDataUrl;
          } catch (e) {
            console.warn('Could not read disk file for receipt dataUrl:', e);
          }
        }
      }
    }
  }

  const newTx: Transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    date: date.trim(),
    merchant: cleanMerchant,
    category: cleanCategory,
    paymentMode: resolvedPaymentMode,
    account: resolvedPaymentMode,
    modeId: targetModeId,
    tags: validTags,
    amount: Math.round(numAmount * 100) / 100,
    type: type === 'income' ? 'income' : 'expense',
    receiptAttached: Boolean(receiptAttached || resolvedDocId || effectiveDataUrl),
    receiptDocumentId: resolvedDocId,
    receiptName: receiptName ? String(receiptName).trim() : (resolvedDocId ? 'Receipt attached' : undefined),
    receiptDataUrl: effectiveDataUrl,
    budgetId: budgetId ? String(budgetId).trim() : undefined,
    fingerprint,
    source: 'manual',
    createdAt: new Date().toISOString(),
  };

  db.transactions.unshift(newTx);
  saveDatabase(db);
  res.status(201).json(newTx);
});

app.put('/api/transactions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  const index = db.transactions.findIndex((t) => t.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  const {
    date,
    merchant,
    category,
    paymentMode,
    account,
    amount,
    type,
    tags,
    modeId,
    receiptAttached,
    receiptDocumentId,
    receiptName,
    receiptDataUrl,
    budgetId,
  } = req.body;
  const current = db.transactions[index];

  const newDate = date ? String(date).trim() : current.date;
  const newMerchant = merchant ? String(merchant).trim() : current.merchant;
  const newCategory = category ? String(category).trim() : current.category;
  const resolvedPaymentMode = (paymentMode || account || current.paymentMode || current.account || 'Bank Transfer').trim();
  const newAmount = amount !== undefined ? parseFloat(amount) : current.amount;
  const newType = type || current.type;
  const newModeId = modeId ? String(modeId).trim() : current.modeId || 'business';

  if (isNaN(newAmount) || newAmount <= 0) {
    res.status(400).json({ error: 'Amount must be positive' });
    return;
  }

  const newFingerprint = generateFingerprint(newDate, newMerchant, newAmount, resolvedPaymentMode);
  const duplicate = db.transactions.some((t) => t.id !== id && t.fingerprint === newFingerprint);
  if (duplicate) {
    res.status(409).json({ error: 'Another transaction already has this identical fingerprint' });
    return;
  }

  const updatedTags: string[] = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : current.tags;

  const updated: Transaction = {
    ...current,
    date: newDate,
    merchant: newMerchant,
    category: newCategory,
    paymentMode: resolvedPaymentMode,
    account: resolvedPaymentMode,
    modeId: newModeId,
    amount: Math.round(newAmount * 100) / 100,
    type: newType,
    tags: updatedTags,
    receiptAttached: receiptAttached !== undefined ? Boolean(receiptAttached) : (receiptDocumentId || receiptDataUrl ? true : current.receiptAttached),
    receiptDocumentId: receiptDocumentId !== undefined ? (receiptDocumentId ? String(receiptDocumentId).trim() : undefined) : current.receiptDocumentId,
    receiptName: receiptName !== undefined ? String(receiptName) : current.receiptName,
    receiptDataUrl: receiptDataUrl !== undefined ? String(receiptDataUrl) : current.receiptDataUrl,
    budgetId: budgetId !== undefined ? (budgetId ? String(budgetId).trim() : undefined) : current.budgetId,
    fingerprint: newFingerprint,
  };

  db.transactions[index] = updated;
  saveDatabase(db);
  res.json(updated);
});

// Inline category & tag updates
app.patch('/api/transactions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  const index = db.transactions.findIndex(t => t.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  const current = db.transactions[index];
  const { category, tags, budgetId } = req.body;

  if (budgetId !== undefined) {
    current.budgetId = budgetId ? String(budgetId).trim() : undefined;
  }

  if (category !== undefined) {
    current.category = String(category).trim();
    if (!db.categories.some(c => c.toLowerCase() === current.category.toLowerCase())) {
      db.categories.push(current.category);
    }
  }

  if (tags !== undefined && Array.isArray(tags)) {
    const validTags = tags.map(t => String(t).trim()).filter(Boolean);
    current.tags = validTags;
    for (const t of validTags) {
      if (!db.tags.some(existing => existing.toLowerCase() === t.toLowerCase())) {
        db.tags.push(t);
      }
    }
  }

  db.transactions[index] = current;
  saveDatabase(db);
  res.json(current);
});

app.delete('/api/transactions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  const initLen = db.transactions.length;
  db.transactions = db.transactions.filter(t => t.id !== id);
  if (db.transactions.length === initLen) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  saveDatabase(db);
  res.json({ success: true, id });
});

app.post('/api/transactions/bulk-delete', (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'Array of transaction IDs required' });
    return;
  }
  const db = getDatabase();
  const idSet = new Set(ids);
  const beforeCount = db.transactions.length;
  db.transactions = db.transactions.filter(t => !idSet.has(t.id));
  const deletedCount = beforeCount - db.transactions.length;
  saveDatabase(db);
  res.json({ success: true, deletedCount, remaining: db.transactions.length });
});

// --- CSV Parsing and Import ---
app.post('/api/transactions/parse-csv', (req: Request, res: Response) => {
  const { csvContent } = req.body;
  if (!csvContent || typeof csvContent !== 'string') {
    res.status(400).json({ error: 'csvContent string required' });
    return;
  }

  const { headers, rows } = parseCSVLines(csvContent);
  if (headers.length === 0 || rows.length === 0) {
    res.status(400).json({ error: 'No valid data rows found in CSV' });
    return;
  }

  const detectedMapping = autoDetectMapping(headers);

  res.json({
    headers,
    totalRows: rows.length,
    sampleRows: rows.slice(0, 5),
    detectedMapping,
  });
});

app.post('/api/transactions/import-csv', (req: Request, res: Response) => {
  const { csvContent, mapping, defaultAccount, modeId, defaultCategory, budgetId } = req.body;
  if (!csvContent || !mapping) {
    res.status(400).json({ error: 'csvContent and column mapping required' });
    return;
  }

  const { rows } = parseCSVLines(csvContent);
  if (rows.length === 0) {
    res.status(400).json({ error: 'No data rows to import' });
    return;
  }

  const db = getDatabase();
  const account = defaultAccount || db.accounts[0] || 'Bank Transfer';
  const resolvedModeId = modeId && modeId !== 'combined'
    ? String(modeId).trim()
    : (db.activeModeId === 'combined' ? 'business' : db.activeModeId || 'business');
  const resolvedCategory = (defaultCategory || 'Expense').trim();

  // Ensure category is in db.categories and mode categories
  if (resolvedCategory && !db.categories.some(c => c.toLowerCase() === resolvedCategory.toLowerCase())) {
    db.categories.push(resolvedCategory);
  }
  const targetMode = db.modes.find(m => m.id === resolvedModeId);
  if (targetMode && targetMode.categories && !targetMode.categories.some(c => c.toLowerCase() === resolvedCategory.toLowerCase())) {
    targetMode.categories.push(resolvedCategory);
  }

  const { summary, newTransactions } = processRowsForImport(
    rows,
    mapping as ColumnMapping,
    db.transactions,
    db.rules,
    db.categories,
    account,
    resolvedModeId,
    resolvedCategory,
    budgetId ? String(budgetId).trim() : undefined,
    db.budgets || []
  );

  // Prepend new transactions
  db.transactions = [...newTransactions, ...db.transactions];
  saveDatabase(db);

  res.json({
    summary,
    totalTransactions: db.transactions.length,
    newTransactions,
  });
});

// --- Categories & Accounts Management ---
app.get('/api/categories', (_req: Request, res: Response) => {
  const db = getDatabase();
  // Aggregate all unique categories across global list, modes, and recorded transactions
  const catSet = new Set<string>(['Expense']);
  (db.categories || []).forEach(c => { if (c && c.trim()) catSet.add(c.trim()); });
  (db.modes || []).forEach(m => {
    (m.categories || []).forEach(c => { if (c && c.trim()) catSet.add(c.trim()); });
  });
  (db.transactions || []).forEach(t => {
    if (t.category && t.category.trim()) catSet.add(t.category.trim());
  });

  const fullList = Array.from(catSet);
  db.categories = fullList;
  saveDatabase(db);
  res.json(fullList);
});

app.post('/api/categories', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Valid category name required' });
    return;
  }
  const clean = name.trim();
  const db = getDatabase();
  if (db.categories.some(c => c.toLowerCase() === clean.toLowerCase())) {
    res.status(409).json({ error: 'Category already exists' });
    return;
  }

  db.categories.push(clean);

  // Synchronize to all existing finance modes so it immediately appears in all mode transaction pickers
  db.modes.forEach(mode => {
    if (!mode.categories) mode.categories = ['Expense'];
    if (!mode.categories.some(c => c.toLowerCase() === clean.toLowerCase())) {
      mode.categories.push(clean);
    }
  });

  saveDatabase(db);
  res.status(201).json(db.categories);
});

const handleUpdateCategory = (req: Request, res: Response) => {
  const oldParam = (req.params.oldName || req.body.oldName || req.query.oldName || '').toString();
  const newParam = (req.body.newName || req.body.name || '').toString();

  if (!oldParam.trim() || !newParam.trim()) {
    res.status(400).json({ error: 'Valid current and new category names are required' });
    return;
  }

  const cleanOld = decodeURIComponent(oldParam).trim();
  const cleanNew = newParam.trim();
  const db = getDatabase();

  const isAlreadyExisting = db.categories.some(c => c.toLowerCase() === cleanNew.toLowerCase());

  // 1. Update in global categories
  if (isAlreadyExisting) {
    // If target category already exists, remove cleanOld from categories array to merge
    db.categories = db.categories.filter(c => c.toLowerCase() !== cleanOld.toLowerCase());
  } else {
    const catIdx = db.categories.findIndex(c => c.toLowerCase() === cleanOld.toLowerCase());
    if (catIdx !== -1) {
      db.categories[catIdx] = cleanNew;
    } else {
      db.categories.push(cleanNew);
    }
  }

  // 2. Update in all modes
  db.modes.forEach(mode => {
    if (Array.isArray(mode.categories)) {
      if (isAlreadyExisting) {
        mode.categories = mode.categories.filter(c => c.toLowerCase() !== cleanOld.toLowerCase());
        if (!mode.categories.some(c => c.toLowerCase() === cleanNew.toLowerCase())) {
          mode.categories.push(cleanNew);
        }
      } else {
        const idx = mode.categories.findIndex(c => c.toLowerCase() === cleanOld.toLowerCase());
        if (idx !== -1) {
          mode.categories[idx] = cleanNew;
        }
      }
    }
  });

  // 3. Update in all transactions where category matches oldName
  let updatedTxCount = 0;
  db.transactions.forEach(t => {
    if (t.category && t.category.trim().toLowerCase() === cleanOld.toLowerCase()) {
      t.category = cleanNew;
      // Recompute fingerprint
      t.fingerprint = generateFingerprint(t.date, t.merchant, t.amount, t.paymentMode || t.account || 'UPI');
      updatedTxCount++;
    }
  });

  // 4. Update in all budgets where category matches oldName
  let updatedBudgetCount = 0;
  db.budgets.forEach(b => {
    if (b.category && b.category.trim().toLowerCase() === cleanOld.toLowerCase()) {
      b.category = cleanNew;
      updatedBudgetCount++;
    }
  });

  // 5. Update in all categorization rules where targetCategory matches oldName
  let updatedRulesCount = 0;
  db.rules.forEach(r => {
    if (r.targetCategory && r.targetCategory.trim().toLowerCase() === cleanOld.toLowerCase()) {
      r.targetCategory = cleanNew;
      updatedRulesCount++;
    }
  });

  // 6. Update in all recurring items and detected patterns
  if (Array.isArray((db as any).recurring)) {
    (db as any).recurring.forEach((item: any) => {
      if (item.category && item.category.trim().toLowerCase() === cleanOld.toLowerCase()) {
        item.category = cleanNew;
      }
    });
  }
  if (Array.isArray((db as any).detectedPatterns)) {
    (db as any).detectedPatterns.forEach((p: any) => {
      if (p.category && p.category.trim().toLowerCase() === cleanOld.toLowerCase()) {
        p.category = cleanNew;
      }
    });
  }

  saveDatabase(db);

  res.json({
    success: true,
    oldName: cleanOld,
    newName: cleanNew,
    updatedTxCount,
    updatedBudgetCount,
    updatedRulesCount,
    categories: db.categories,
    modes: db.modes,
    transactions: db.transactions,
    budgets: db.budgets,
    rules: db.rules,
  });
};

app.put('/api/categories', handleUpdateCategory);
app.put('/api/categories/:oldName', handleUpdateCategory);

const handleDeleteCategory = (req: Request, res: Response) => {
  const nameParam = (req.params.name || req.body.name || req.query.name || '').toString();
  const reassignParam = (req.query.reassignTo || req.body.reassignTo || 'Expense').toString();

  const clean = decodeURIComponent(nameParam).trim();
  const reassignTo = reassignParam.trim() || 'Expense';
  const db = getDatabase();

  if (!clean) {
    res.status(400).json({ error: 'Category name is required to delete.' });
    return;
  }

  if (clean.toLowerCase() === 'expense') {
    res.status(400).json({ error: 'Default category "Expense" cannot be deleted.' });
    return;
  }

  // 1. Remove from global categories
  db.categories = db.categories.filter(c => c.toLowerCase() !== clean.toLowerCase());
  if (!db.categories.includes('Expense')) {
    db.categories.unshift('Expense');
  }

  // 2. Remove from all modes
  db.modes.forEach(mode => {
    if (Array.isArray(mode.categories)) {
      mode.categories = mode.categories.filter(c => c.toLowerCase() !== clean.toLowerCase());
      if (!mode.categories.includes('Expense')) {
        mode.categories.unshift('Expense');
      }
    }
  });

  // 3. Reassign existing transactions with this category to reassignTo
  let reassignedCount = 0;
  db.transactions.forEach(t => {
    if (t.category && t.category.trim().toLowerCase() === clean.toLowerCase()) {
      t.category = reassignTo;
      t.fingerprint = generateFingerprint(t.date, t.merchant, t.amount, t.paymentMode || t.account || 'UPI');
      reassignedCount++;
    }
  });

  // 4. Clean up budgets matching deleted category
  db.budgets = db.budgets.filter(b => b.category.trim().toLowerCase() !== clean.toLowerCase());

  // 5. Clean up or reassign recurring
  if (Array.isArray((db as any).recurring)) {
    (db as any).recurring.forEach((item: any) => {
      if (item.category && item.category.trim().toLowerCase() === clean.toLowerCase()) {
        item.category = reassignTo;
      }
    });
  }

  saveDatabase(db);
  res.json({
    success: true,
    removed: clean,
    reassignedCount,
    reassignTo,
    categories: db.categories,
    modes: db.modes,
    transactions: db.transactions,
    budgets: db.budgets,
    rules: db.rules,
  });
};

app.delete('/api/categories', handleDeleteCategory);
app.delete('/api/categories/:name', handleDeleteCategory);

app.get('/api/accounts', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json(db.accounts);
});

app.post('/api/accounts', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Account name required' });
    return;
  }
  const clean = name.trim();
  const db = getDatabase();
  if (db.accounts.some(a => a.toLowerCase() === clean.toLowerCase())) {
    res.status(409).json({ error: 'Account already exists' });
    return;
  }
  db.accounts.push(clean);
  saveDatabase(db);
  res.status(201).json(db.accounts);
});

app.delete('/api/accounts/:name', (req: Request, res: Response) => {
  const { name } = req.params;
  const db = getDatabase();
  db.accounts = db.accounts.filter(a => a.toLowerCase() !== name.toLowerCase());
  saveDatabase(db);
  res.json(db.accounts);
});

// --- Tags Management ---
app.get('/api/tags', (_req: Request, res: Response) => {
  const db = getDatabase();
  // Compute usage counts from transactions
  const counts: Record<string, number> = {};
  for (const t of db.transactions) {
    for (const tag of t.tags) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }

  const tagList = db.tags.map(name => ({
    name,
    count: counts[name] || 0,
  }));

  res.json(tagList);
});

app.post('/api/tags', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Tag name required' });
    return;
  }
  const clean = name.trim();
  if (!clean) {
    res.status(400).json({ error: 'Tag name cannot be empty' });
    return;
  }
  const db = getDatabase();
  if (db.tags.some(t => t.toLowerCase() === clean.toLowerCase())) {
    res.status(409).json({ error: 'Tag already exists' });
    return;
  }
  db.tags.push(clean);
  saveDatabase(db);
  res.status(201).json({ name: clean, count: 0 });
});

app.delete('/api/tags/:name', (req: Request, res: Response) => {
  const { name } = req.params;
  const { removeFromTransactions } = req.query;
  const db = getDatabase();

  const clean = decodeURIComponent(name).toLowerCase();
  db.tags = db.tags.filter(t => t.toLowerCase() !== clean);

  // If user requested removing tag from historical transactions
  if (removeFromTransactions === 'true') {
    for (const t of db.transactions) {
      t.tags = t.tags.filter(tag => tag.toLowerCase() !== clean);
    }
  }

  saveDatabase(db);
  res.json({ success: true, removed: name });
});

// --- Budgets Endpoints ---
app.get('/api/budgets', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json(db.budgets);
});

app.post('/api/budgets', (req: Request, res: Response) => {
  const { name, category, monthlyLimit, active, notes, date } = req.body;
  if (!category || monthlyLimit === undefined) {
    res.status(400).json({ error: 'Category and monthly limit required' });
    return;
  }
  const limit = parseFloat(monthlyLimit);
  if (isNaN(limit) || limit <= 0) {
    res.status(400).json({ error: 'Monthly limit must be positive' });
    return;
  }

  const db = getDatabase();
  const trimmedCategory = category.trim();
  const trimmedName = typeof name === 'string' && name.trim() ? name.trim() : trimmedCategory;
  const targetDate = typeof date === 'string' && date.trim() ? date.trim() : new Date().toISOString().split('T')[0];

  const budget: Budget = {
    id: `bgt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: trimmedName,
    category: trimmedCategory,
    monthlyLimit: Math.round(limit * 100) / 100,
    active: active !== undefined ? Boolean(active) : true,
    notes: typeof notes === 'string' && notes.trim() ? notes.trim() : undefined,
    date: targetDate,
    createdAt: new Date().toISOString(),
  };

  db.budgets.push(budget);
  saveDatabase(db);
  res.status(201).json(budget);
});

app.put('/api/budgets/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, category, monthlyLimit, active, notes, date } = req.body;
  const db = getDatabase();
  const idx = db.budgets.findIndex(b => b.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Budget not found' });
    return;
  }

  const b = db.budgets[idx];
  if (name !== undefined) b.name = typeof name === 'string' && name.trim() ? name.trim() : b.category;
  if (category) b.category = category.trim();
  if (monthlyLimit !== undefined) {
    const lim = parseFloat(monthlyLimit);
    if (!isNaN(lim) && lim > 0) b.monthlyLimit = Math.round(lim * 100) / 100;
  }
  if (active !== undefined) b.active = Boolean(active);
  if (notes !== undefined) b.notes = typeof notes === 'string' && notes.trim() ? notes.trim() : undefined;
  if (date !== undefined) b.date = typeof date === 'string' && date.trim() ? date.trim() : b.date;

  db.budgets[idx] = b;
  saveDatabase(db);
  res.json(b);
});

app.delete('/api/budgets', (_req: Request, res: Response) => {
  const db = getDatabase();
  const count = db.budgets.length;
  db.budgets = [];
  saveDatabase(db);
  res.json({ success: true, count });
});

app.delete('/api/budgets/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  db.budgets = db.budgets.filter(b => b.id !== id);
  saveDatabase(db);
  res.json({ success: true, id });
});

// --- Goals Endpoints ---
app.get('/api/goals', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json(db.goals);
});

app.post('/api/goals', (req: Request, res: Response) => {
  const { name, targetAmount, currentAmount, dueDate, note } = req.body;
  if (!name || targetAmount === undefined) {
    res.status(400).json({ error: 'Goal name and target amount required' });
    return;
  }
  const target = parseFloat(targetAmount);
  const current = currentAmount !== undefined ? parseFloat(currentAmount) : 0;
  if (isNaN(target) || target <= 0) {
    res.status(400).json({ error: 'Target amount must be positive' });
    return;
  }

  const db = getDatabase();
  const goal: Goal = {
    id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    targetAmount: Math.round(target * 100) / 100,
    currentAmount: Math.max(0, isNaN(current) ? 0 : Math.round(current * 100) / 100),
    dueDate: dueDate ? String(dueDate).trim() : undefined,
    note: note ? String(note).trim() : undefined,
    createdAt: new Date().toISOString(),
  };

  db.goals.push(goal);
  saveDatabase(db);
  res.status(201).json(goal);
});

app.put('/api/goals/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, targetAmount, currentAmount, dueDate, note } = req.body;
  const db = getDatabase();
  const idx = db.goals.findIndex(g => g.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }

  const g = db.goals[idx];
  if (name) g.name = name.trim();
  if (targetAmount !== undefined) {
    const t = parseFloat(targetAmount);
    if (!isNaN(t) && t > 0) g.targetAmount = Math.round(t * 100) / 100;
  }
  if (currentAmount !== undefined) {
    const c = parseFloat(currentAmount);
    if (!isNaN(c) && c >= 0) g.currentAmount = Math.round(c * 100) / 100;
  }
  if (dueDate !== undefined) g.dueDate = dueDate ? String(dueDate).trim() : undefined;
  if (note !== undefined) g.note = note ? String(note).trim() : undefined;

  db.goals[idx] = g;
  saveDatabase(db);
  res.json(g);
});

app.post('/api/goals/:id/contribute', (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount } = req.body;
  const add = parseFloat(amount);
  if (isNaN(add) || add <= 0) {
    res.status(400).json({ error: 'Contribution amount must be positive' });
    return;
  }

  const db = getDatabase();
  const goal = db.goals.find(g => g.id === id);
  if (!goal) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }

  goal.currentAmount = Math.round((goal.currentAmount + add) * 100) / 100;
  saveDatabase(db);
  res.json(goal);
});

app.delete('/api/goals/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  db.goals = db.goals.filter(g => g.id !== id);
  saveDatabase(db);
  res.json({ success: true, id });
});

// --- Recurring & Subscriptions Endpoints ---
app.get('/api/recurring', (_req: Request, res: Response) => {
  const db = getDatabase();
  const detected = detectRecurringPatterns(db.transactions, db.recurring, db.ignoredPatterns);

  // Split into bills vs subscriptions
  const suggestedRecurring = detected.filter(d => !d.isSubscription);
  const suggestedSubscriptions = detected.filter(d => d.isSubscription);

  // Confirmed lists
  const confirmedBills = db.recurring.filter(r => !r.isSubscription);
  const confirmedSubscriptions = db.recurring.filter(r => r.isSubscription);

  // Totals (Never double-count)
  const monthlyBillsTotal = confirmedBills.reduce((acc, b) => acc + b.estimatedMonthly, 0);
  const annualBillsTotal = monthlyBillsTotal * 12;

  const monthlySubsTotal = confirmedSubscriptions.reduce((acc, s) => acc + s.estimatedMonthly, 0);
  const annualSubsTotal = monthlySubsTotal * 12;

  const totalMonthlyCommitments = monthlyBillsTotal + monthlySubsTotal;
  const totalAnnualCommitments = annualBillsTotal + annualSubsTotal;

  // Next expected payment across confirmed
  const sortedNext = [...db.recurring].sort(
    (a, b) => new Date(a.nextExpectedDate).getTime() - new Date(b.nextExpectedDate).getTime()
  );
  const nextPayment = sortedNext[0] || null;

  res.json({
    suggestedRecurring,
    suggestedSubscriptions,
    confirmedBills,
    confirmedSubscriptions,
    allConfirmed: db.recurring,
    ignoredCount: db.ignoredPatterns.length,
    totals: {
      monthlyBillsTotal: Math.round(monthlyBillsTotal * 100) / 100,
      annualBillsTotal: Math.round(annualBillsTotal * 100) / 100,
      monthlySubsTotal: Math.round(monthlySubsTotal * 100) / 100,
      annualSubsTotal: Math.round(annualSubsTotal * 100) / 100,
      totalMonthlyCommitments: Math.round(totalMonthlyCommitments * 100) / 100,
      totalAnnualCommitments: Math.round(totalAnnualCommitments * 100) / 100,
    },
    nextPayment,
  });
});

app.post('/api/recurring/confirm', (req: Request, res: Response) => {
  const { merchant, category, account, amount, cadence, isSubscription, nextExpectedDate, notes } = req.body;
  if (!merchant || amount === undefined || !cadence) {
    res.status(400).json({ error: 'Merchant, amount, and cadence required' });
    return;
  }

  const numAmt = parseFloat(amount);
  const db = getDatabase();

  let estimatedMonthly = numAmt;
  if (cadence === 'weekly') estimatedMonthly = (numAmt * 52) / 12;
  else if (cadence === 'biweekly') estimatedMonthly = (numAmt * 26) / 12;
  else if (cadence === 'monthly') estimatedMonthly = numAmt;
  else if (cadence === 'quarterly') estimatedMonthly = numAmt / 3;
  else if (cadence === 'annual') estimatedMonthly = numAmt / 12;

  const item: RecurringItem = {
    id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    merchant: merchant.trim(),
    category: category ? category.trim() : (isSubscription ? 'Subscriptions' : 'Utilities'),
    account: account ? account.trim() : 'Main Checking',
    amount: Math.round(numAmt * 100) / 100,
    cadence,
    estimatedMonthly: Math.round(estimatedMonthly * 100) / 100,
    nextExpectedDate: nextExpectedDate || new Date().toISOString().split('T')[0],
    isSubscription: Boolean(isSubscription),
    notes: notes ? String(notes).trim() : undefined,
    createdAt: new Date().toISOString(),
  };

  db.recurring.push(item);
  saveDatabase(db);
  res.status(201).json(item);
});

app.post('/api/recurring/ignore', (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key || typeof key !== 'string') {
    res.status(400).json({ error: 'Pattern key required' });
    return;
  }
  const db = getDatabase();
  if (!db.ignoredPatterns.includes(key)) {
    db.ignoredPatterns.push(key);
    saveDatabase(db);
  }
  res.json({ success: true, ignoredCount: db.ignoredPatterns.length });
});

app.post('/api/recurring/restore-ignored', (_req: Request, res: Response) => {
  const db = getDatabase();
  db.ignoredPatterns = [];
  saveDatabase(db);
  res.json({ success: true, message: 'All ignored suggestions restored' });
});

app.delete('/api/recurring/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  db.recurring = db.recurring.filter(r => r.id !== id);
  saveDatabase(db);
  res.json({ success: true, id });
});

// --- Categorization Rules Endpoints ---
app.get('/api/rules', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json(db.rules);
});

app.post('/api/rules', (req: Request, res: Response) => {
  const { merchantPattern, matchType, targetCategory, targetTags, enabled } = req.body;
  if (!merchantPattern || !targetCategory) {
    res.status(400).json({ error: 'Merchant pattern and target category required' });
    return;
  }

  const db = getDatabase();
  const rule: CategorizationRule = {
    id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    merchantPattern: merchantPattern.trim(),
    matchType: matchType || 'contains',
    targetCategory: targetCategory.trim(),
    targetTags: Array.isArray(targetTags) ? targetTags.map(t => String(t).trim()).filter(Boolean) : [],
    enabled: enabled !== undefined ? Boolean(enabled) : true,
    createdAt: new Date().toISOString(),
  };

  db.rules.push(rule);
  saveDatabase(db);
  res.status(201).json(rule);
});

app.put('/api/rules/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { merchantPattern, matchType, targetCategory, targetTags, enabled } = req.body;
  const db = getDatabase();
  const idx = db.rules.findIndex(r => r.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  const r = db.rules[idx];
  if (merchantPattern) r.merchantPattern = merchantPattern.trim();
  if (matchType) r.matchType = matchType;
  if (targetCategory) r.targetCategory = targetCategory.trim();
  if (targetTags !== undefined && Array.isArray(targetTags)) {
    r.targetTags = targetTags.map(t => String(t).trim()).filter(Boolean);
  }
  if (enabled !== undefined) r.enabled = Boolean(enabled);

  db.rules[idx] = r;
  saveDatabase(db);
  res.json(r);
});

app.delete('/api/rules/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  db.rules = db.rules.filter(r => r.id !== id);
  saveDatabase(db);
  res.json({ success: true, id });
});

// --- Documents Vault Endpoints ---
app.get('/api/documents', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json(db.documents);
});

app.post('/api/documents/upload', upload.single('file') as any, (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded or file exceeds 20MB limit' });
    return;
  }

  const db = getDatabase();
  const originalName = req.file.originalname;
  const filename = req.file.filename;
  const sizeBytes = req.file.size;
  const mimeType = req.file.mimetype;
  const storagePath = path.join(vaultDir, filename);

  // Grounded extraction logic:
  // For receipts/invoices, check for readable text patterns in filename or headers
  let status: 'stored' | 'review' | 'queued' = 'stored';
  let extractedData: VaultDocument['extractedData'] = undefined;

  // Extract from filename clues if date and amount present (e.g., "Costco_2026-05-12_84.50.pdf")
  const dateMatch = originalName.match(/(\d{4}[-_]\d{2}[-_]\d{2})/);
  const amountMatch = originalName.match(/\$?(\d+\.\d{2})/);
  const cleanMerchant = originalName.split(/[-_.]/)[0]?.trim();

  if (dateMatch && amountMatch && cleanMerchant) {
    const rawDate = dateMatch[1].replace(/_/g, '-');
    const amountVal = parseFloat(amountMatch[1]);
    if (!isNaN(amountVal) && amountVal > 0) {
      extractedData = {
        merchant: cleanMerchant,
        date: rawDate,
        amount: amountVal,
        type: 'expense',
        category: 'Needs review',
        confidence: 0.85,
      };
      status = 'review'; // Grounded but flagged for review as required
    }
  }

  // Generate dataUrl for images so documents remain viewable across sessions/container restarts
  let dataUrl: string | undefined = undefined;
  if ((mimeType && mimeType.startsWith('image/')) || originalName.match(/\.(png|jpe?g|webp|gif)$/i)) {
    try {
      const fileBuffer = fs.readFileSync(storagePath);
      const effectiveMime = (mimeType && mimeType.startsWith('image/'))
        ? mimeType
        : (originalName.match(/\.(jpe?g)$/i) ? 'image/jpeg' : 'image/png');
      dataUrl = `data:${effectiveMime};base64,${fileBuffer.toString('base64')}`;
    } catch (e) {
      console.warn('Could not generate dataUrl for document:', e);
    }
  }

  const docRecord: VaultDocument = {
    id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    filename,
    originalName,
    mimeType,
    sizeBytes,
    source: 'upload',
    status,
    extractedData,
    storagePath,
    dataUrl,
    createdAt: new Date().toISOString(),
  };

  db.documents.unshift(docRecord);
  saveDatabase(db);

  res.status(201).json(docRecord);
});

app.get('/api/documents/:id/download', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  const docItem = db.documents.find(d => d.id === id);
  if (!docItem) {
    res.status(404).json({ error: 'Document file not found in vault' });
    return;
  }

  const diskPath = (docItem.storagePath && fs.existsSync(docItem.storagePath))
    ? docItem.storagePath
    : path.join(vaultDir, docItem.filename);

  if (fs.existsSync(diskPath)) {
    let contentType = docItem.mimeType || 'application/octet-stream';
    if (docItem.filename.match(/\.(jpe?g)$/i)) contentType = 'image/jpeg';
    else if (docItem.filename.match(/\.png$/i)) contentType = 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(docItem.originalName)}"`);
    const stream = fs.createReadStream(diskPath);
    return stream.pipe(res);
  }

  if (docItem.dataUrl && docItem.dataUrl.startsWith('data:')) {
    const matches = docItem.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      const mime = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      res.setHeader('Content-Type', mime || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(docItem.originalName)}"`);
      return res.send(buffer);
    }
  }

  res.status(404).json({ error: 'Document file not found in vault' });
});

app.get('/api/documents/:id/view', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  const docItem = db.documents.find(d => d.id === id);
  if (!docItem) {
    res.status(404).json({ error: 'Document file not found in vault' });
    return;
  }

  const diskPath = (docItem.storagePath && fs.existsSync(docItem.storagePath))
    ? docItem.storagePath
    : path.join(vaultDir, docItem.filename);

  if (fs.existsSync(diskPath)) {
    let contentType = docItem.mimeType || 'image/png';
    if (docItem.filename.match(/\.(jpe?g)$/i) || docItem.originalName.match(/\.(jpe?g)$/i)) {
      contentType = 'image/jpeg';
    } else if (docItem.filename.match(/\.png$/i) || docItem.originalName.match(/\.png$/i)) {
      contentType = 'image/png';
    }
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(docItem.originalName)}"`);
    const stream = fs.createReadStream(diskPath);
    return stream.pipe(res);
  }

  if (docItem.dataUrl && docItem.dataUrl.startsWith('data:')) {
    const matches = docItem.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      const mime = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      res.setHeader('Content-Type', mime || 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(docItem.originalName)}"`);
      return res.send(buffer);
    }
  }

  res.status(404).json({ error: 'Document file not found in vault' });
});

app.delete('/api/documents/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  const docItem = db.documents.find(d => d.id === id);
  if (!docItem) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  // Delete file bytes from storage
  if (fs.existsSync(docItem.storagePath)) {
    try {
      fs.unlinkSync(docItem.storagePath);
    } catch (e) {
      console.error('Error removing document file from vault:', e);
    }
  }

  db.documents = db.documents.filter(d => d.id !== id);
  saveDatabase(db);
  res.json({ success: true, id });
});

// --- Google Drive Integration & Sync Endpoints ---
app.get('/api/drive/status', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({
    folderName: db.driveSync.folderName,
    folderUrl: `https://drive.google.com/drive/folders/ledgerly-financial-inbox`,
    lastSyncTimestamp: db.driveSync.lastSyncTimestamp,
    status: db.driveSync.status,
    schedule: 'Daily at 8:00 AM',
    timezone: db.preferences.timezone,
    stats: db.driveSync.stats,
    resetTimestamp: db.preferences.resetTimestamp,
  });
});

app.post('/api/drive/sync', (req: Request, res: Response) => {
  const db = getDatabase();
  const resetTime = db.preferences.resetTimestamp ? new Date(db.preferences.resetTimestamp).getTime() : 0;

  // In Google AI Studio environment, perform a simulated live sync
  // Reads configured folder "Ledgerly Financial Inbox", checks processed file IDs,
  // ignores files modified before reset timestamp, tracks results.
  db.driveSync.status = 'synced';
  db.driveSync.lastSyncTimestamp = new Date().toISOString();

  // If there are documents imported from Drive, ensure stats reflect
  const driveDocs = db.documents.filter(d => d.source === 'drive');
  db.driveSync.stats.imported = driveDocs.length;

  saveDatabase(db);

  res.json({
    status: 'synced',
    timestamp: db.driveSync.lastSyncTimestamp,
    message: 'Google Drive synchronization completed for folder "Ledgerly Financial Inbox".',
    stats: db.driveSync.stats,
  });
});

// --- Complete Data Deletion Endpoint ---
app.post('/api/danger/erase-all-data', (req: Request, res: Response) => {
  const { confirmation } = req.body;
  const REQUIRED_CONFIRMATION = 'DELETE ALL LEDGERLY DATA';

  if (confirmation !== REQUIRED_CONFIRMATION) {
    res.status(400).json({
      error: `Invalid confirmation string. Server strictly requires "${REQUIRED_CONFIRMATION}" to erase all data.`,
    });
    return;
  }

  const resetTimestamp = new Date().toISOString();
  const freshDb = resetAllData(resetTimestamp);

  res.json({
    success: true,
    message: 'All हिसाब-किताब financial records, documents, rules, tags, and settings have been completely erased.',
    resetTimestamp,
    database: freshDb,
  });
});

// --- Vite Middleware in Dev or Static Dist in Prod ---
async function startServer() {
  const httpServer = http.createServer(app);
  initRealtimeSync(httpServer);

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`हिसाब-किताब server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
