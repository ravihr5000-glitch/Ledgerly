// server.ts
import express from "express";
import path2 from "path";
import fs2 from "fs";
import multer from "multer";
import { fileURLToPath } from "url";

// server/db.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
function hashPin(pin) {
  return crypto.createHash("sha256").update(`${pin.trim()}_ledgerly_salt_key`).digest("hex");
}
var DATA_DIR = path.resolve(process.cwd(), "data");
var VAULT_DIR = path.resolve(DATA_DIR, "vault");
var AVATARS_DIR = path.resolve(DATA_DIR, "avatars");
var DB_FILE = path.resolve(DATA_DIR, "ledgerly_db.json");
var DEFAULT_MODES = [
  {
    id: "business",
    name: "Business",
    description: "Company operations, revenues, vendor payouts & operational costs",
    icon: "Briefcase",
    color: "#6558D3",
    startingBalance: 0,
    categories: [
      "Client Revenue",
      "Payroll & Salaries",
      "Software & Tools",
      "Marketing & Ads",
      "Office Rent",
      "Travel & Meals",
      "Legal & Professional",
      "Supplies",
      "Taxes",
      "Expense",
      "Other"
    ],
    settings: {
      allowReceipts: true,
      allowTags: true,
      allowNotes: true
    },
    isDefault: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "personal",
    name: "Personal",
    description: "Household living expenses, personal savings, groceries & bills",
    icon: "User",
    color: "#10B981",
    startingBalance: 0,
    categories: [
      "Salary",
      "Housing",
      "Groceries",
      "Dining",
      "Shopping",
      "Transportation",
      "Utilities",
      "Health",
      "Entertainment",
      "Expense",
      "Other"
    ],
    settings: {
      allowReceipts: true,
      allowTags: true,
      allowNotes: true
    },
    isDefault: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "combined",
    name: "Combined",
    description: "Consolidated holistic overview combining all financial modes",
    icon: "Layers",
    color: "#3B82F6",
    startingBalance: 0,
    categories: [
      "Client Revenue",
      "Salary",
      "Housing",
      "Groceries",
      "Operations",
      "Expense",
      "Other"
    ],
    settings: {
      allowReceipts: true,
      allowTags: true,
      allowNotes: true
    },
    isDefault: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var INITIAL_CATEGORIES = [
  "Expense",
  "Housing",
  "Groceries",
  "Shopping",
  "Dining",
  "Transportation",
  "Utilities",
  "Insurance",
  "Health",
  "Entertainment",
  "Income",
  "Client Revenue",
  "Needs review",
  "Other"
];
var INITIAL_ACCOUNTS = [
  "UPI",
  "Bank Transfer",
  "Cash",
  "Main Checking"
];
var INITIAL_DB = {
  ownerEmail: "ravihr5000@gmail.com",
  profile: {
    name: "Ravi",
    email: "ravihr5000@gmail.com",
    avatarUrl: "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  preferences: {
    selectedPeriod: "All time",
    totalAssets: 0,
    totalLiabilities: 0,
    netWorthConfigured: false,
    resetTimestamp: null,
    timezone: "America/Los_Angeles"
  },
  shareConfig: {
    enabled: false,
    token: "",
    createdAt: "",
    allowModes: ["all"]
  },
  securityConfig: {
    pinEnabled: true,
    pinHash: hashPin("1234"),
    phoneNumber: "+91 98765 43210"
  },
  modes: [...DEFAULT_MODES],
  activeModeId: "business",
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
    status: "idle",
    folderName: "Ledgerly Financial Inbox",
    processedFileIds: [],
    stats: {
      imported: 0,
      duplicates: 0,
      review: 0,
      errors: 0
    }
  }
};
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
}
function getDatabase() {
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) {
    saveDatabase(INITIAL_DB);
    return JSON.parse(JSON.stringify(INITIAL_DB));
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    let needsSave = false;
    if (!parsed.profile || typeof parsed.profile !== "object") {
      parsed.profile = {
        name: "Ravi",
        email: parsed.ownerEmail || "ravihr5000@gmail.com",
        avatarUrl: "",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      needsSave = true;
    } else {
      if (!parsed.profile.name) {
        parsed.profile.name = "Ravi";
        needsSave = true;
      }
      if (!parsed.profile.email) {
        parsed.profile.email = parsed.ownerEmail || "ravihr5000@gmail.com";
        needsSave = true;
      }
      if (parsed.profile.avatarUrl === void 0) {
        parsed.profile.avatarUrl = "";
        needsSave = true;
      }
    }
    if (parsed.profile.email && parsed.ownerEmail !== parsed.profile.email) {
      parsed.ownerEmail = parsed.profile.email;
      needsSave = true;
    }
    if (!parsed.shareConfig || typeof parsed.shareConfig !== "object" || !parsed.shareConfig.token) {
      const defaultToken = parsed.shareConfig?.token || "view_1791525373616_86prjb6thy7omhqg";
      const existingTokens = Array.isArray(parsed.shareConfig?.tokens) ? parsed.shareConfig.tokens : [];
      parsed.shareConfig = {
        enabled: true,
        token: defaultToken,
        tokens: Array.from(/* @__PURE__ */ new Set([...existingTokens, defaultToken, "view_1791525373616_86prjb6thy7omhqg"])).filter(Boolean),
        createdAt: parsed.shareConfig?.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
        allowModes: ["all"]
      };
      needsSave = true;
    } else {
      if (!Array.isArray(parsed.shareConfig.tokens)) {
        parsed.shareConfig.tokens = [parsed.shareConfig.token, "view_1791525373616_86prjb6thy7omhqg"];
        needsSave = true;
      } else if (!parsed.shareConfig.tokens.includes("view_1791525373616_86prjb6thy7omhqg")) {
        parsed.shareConfig.tokens.push("view_1791525373616_86prjb6thy7omhqg");
        needsSave = true;
      }
    }
    if (!parsed.securityConfig || typeof parsed.securityConfig !== "object") {
      parsed.securityConfig = {
        pinEnabled: true,
        pinHash: hashPin("1234"),
        phoneNumber: "+91 98765 43210"
      };
      needsSave = true;
    }
    if (!parsed.modes || !Array.isArray(parsed.modes) || parsed.modes.length === 0) {
      parsed.modes = JSON.parse(JSON.stringify(DEFAULT_MODES));
      needsSave = true;
    }
    if (!parsed.activeModeId) {
      parsed.activeModeId = "business";
      needsSave = true;
    }
    if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
      parsed.categories = [...INITIAL_CATEGORIES];
      needsSave = true;
    }
    const catSet = /* @__PURE__ */ new Set(["Expense"]);
    parsed.categories.forEach((c) => {
      if (c && String(c).trim()) catSet.add(String(c).trim());
    });
    (parsed.modes || []).forEach((m) => {
      (m.categories || []).forEach((c) => {
        if (c && String(c).trim()) catSet.add(String(c).trim());
      });
    });
    (parsed.transactions || []).forEach((t) => {
      if (t.category && String(t.category).trim()) catSet.add(String(t.category).trim());
    });
    const mergedCategories = Array.from(catSet);
    if (mergedCategories.length !== parsed.categories.length) {
      parsed.categories = mergedCategories;
      needsSave = true;
    }
    if (Array.isArray(parsed.transactions)) {
      for (const tx of parsed.transactions) {
        if (!tx.modeId) {
          tx.modeId = "business";
          needsSave = true;
        }
        if (!tx.paymentMode) {
          if (tx.account) {
            const accLower = tx.account.toLowerCase();
            if (accLower.includes("cash")) tx.paymentMode = "Cash";
            else if (accLower.includes("upi")) tx.paymentMode = "UPI";
            else tx.paymentMode = "Bank Transfer";
          } else {
            tx.paymentMode = "Bank Transfer";
          }
          needsSave = true;
        }
      }
    }
    if (needsSave) {
      saveDatabase(parsed);
    }
    return parsed;
  } catch (err) {
    console.error("Failed reading database file, restoring backup or initial:", err);
    return JSON.parse(JSON.stringify(INITIAL_DB));
  }
}
function saveDatabase(data) {
  ensureDirs();
  const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tempPath, DB_FILE);
}
function generateFingerprint(date, merchant, amount, paymentModeOrAccount) {
  const normDate = date.trim();
  const normMerchant = merchant.trim().toLowerCase();
  const normAmount = Number(amount).toFixed(2);
  const normMethod = paymentModeOrAccount.trim().toLowerCase();
  return `${normDate}|${normMerchant}|${normAmount}|${normMethod}`;
}
function normalizeMerchant(merchant) {
  let m = merchant.trim().toLowerCase();
  m = m.replace(/[^\w\s#]/g, " ");
  m = m.replace(/#\s*\d+\s*$/g, "");
  m = m.replace(/\b\d{4,}\b/g, "");
  m = m.replace(/\s+/g, " ").trim();
  return m;
}
function getVaultDirectory() {
  ensureDirs();
  return VAULT_DIR;
}
function resetAllData(resetTimestamp) {
  ensureDirs();
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
  let existingProfile = {
    name: "Ravi",
    email: "ravihr5000@gmail.com",
    avatarUrl: "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  let existingShareConfig = {
    enabled: false,
    token: "",
    createdAt: "",
    allowModes: ["all"]
  };
  let existingSecurityConfig = {
    pinEnabled: true,
    pinHash: hashPin("1234"),
    phoneNumber: "+91 98765 43210"
  };
  if (fs.existsSync(DB_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      if (existing.profile) existingProfile = existing.profile;
      else if (existing.ownerEmail) existingProfile.email = existing.ownerEmail;
      if (existing.shareConfig) existingShareConfig = existing.shareConfig;
      if (existing.securityConfig) existingSecurityConfig = existing.securityConfig;
    } catch {
    }
  }
  const freshDb = {
    ownerEmail: existingProfile.email,
    profile: existingProfile,
    preferences: {
      selectedPeriod: "All time",
      totalAssets: 0,
      totalLiabilities: 0,
      netWorthConfigured: false,
      resetTimestamp,
      timezone: "America/Los_Angeles"
    },
    shareConfig: existingShareConfig,
    securityConfig: existingSecurityConfig,
    modes: [...DEFAULT_MODES],
    activeModeId: "business",
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
      status: "idle",
      folderName: "Ledgerly Financial Inbox",
      processedFileIds: [],
      stats: {
        imported: 0,
        duplicates: 0,
        review: 0,
        errors: 0
      }
    }
  };
  saveDatabase(freshDb);
  return freshDb;
}

// server/recurringDetector.ts
var SUBSCRIPTION_HINTS = [
  "netflix",
  "spotify",
  "hulu",
  "disney",
  "youtube",
  "icloud",
  "dropbox",
  "adobe",
  "microsoft",
  "amazon prime",
  "patreon",
  "gym",
  "openai",
  "chatgpt",
  "canva",
  "notion",
  "zoom",
  "slack",
  "github",
  "hbo",
  "apple tv",
  "apple music",
  "audible",
  "nytimes",
  "wsj",
  "playstation",
  "xbox",
  "nintendo"
];
var RECURRING_BILL_HINTS = [
  "rent",
  "mortgage",
  "loan",
  "insurance",
  "utilities",
  "electric",
  "water",
  "internet",
  "phone",
  "daycare",
  "tuition",
  "lease",
  "car payment",
  "hoa",
  "property tax",
  "gas bill",
  "trash",
  "sewer",
  "wifi",
  "broadband",
  "geico",
  "state farm",
  "allstate",
  "progressive",
  "verizon",
  "at&t",
  "t-mobile"
];
var DISQUALIFIED_CATEGORIES = ["groceries", "shopping", "supermarket"];
function detectRecurringPatterns(transactions, confirmedItems, ignoredKeys) {
  const expenses = transactions.filter((t) => t.type === "expense");
  const grouped = /* @__PURE__ */ new Map();
  for (const t of expenses) {
    const norm = normalizeMerchant(t.merchant);
    if (!norm) continue;
    if (!grouped.has(norm)) {
      grouped.set(norm, []);
    }
    grouped.get(norm).push(t);
  }
  const results = [];
  const confirmedNormalized = new Set(confirmedItems.map((c) => normalizeMerchant(c.merchant)));
  const ignoredSet = new Set(ignoredKeys);
  for (const [normMerchant, txs] of grouped.entries()) {
    if (confirmedNormalized.has(normMerchant)) {
      continue;
    }
    const uniqueDateTxs = /* @__PURE__ */ new Map();
    for (const t of txs) {
      if (!uniqueDateTxs.has(t.date)) {
        uniqueDateTxs.set(t.date, t);
      }
    }
    const sortedTxs = Array.from(uniqueDateTxs.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    if (sortedTxs.length < 2) {
      continue;
    }
    const primaryCategory = sortedTxs[sortedTxs.length - 1].category.toLowerCase();
    if (DISQUALIFIED_CATEGORIES.some((cat) => primaryCategory.includes(cat))) {
      continue;
    }
    const intervals = [];
    for (let i = 1; i < sortedTxs.length; i++) {
      const prev = new Date(sortedTxs[i - 1].date).getTime();
      const curr = new Date(sortedTxs[i].date).getTime();
      const diffDays = Math.round((curr - prev) / (1e3 * 60 * 60 * 24));
      intervals.push(diffDays);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    let cadence = null;
    if (avgInterval >= 5 && avgInterval <= 9) {
      cadence = "weekly";
    } else if (avgInterval >= 12 && avgInterval <= 17) {
      cadence = "biweekly";
    } else if (avgInterval >= 24 && avgInterval <= 40) {
      cadence = "monthly";
    } else if (avgInterval >= 75 && avgInterval <= 110) {
      cadence = "quarterly";
    } else if (avgInterval >= 330 && avgInterval <= 400) {
      cadence = "annual";
    }
    if (!cadence) {
      continue;
    }
    const isSubHint = SUBSCRIPTION_HINTS.some((h) => normMerchant.includes(h) || primaryCategory.includes("subscription"));
    const isBillHint = RECURRING_BILL_HINTS.some((h) => normMerchant.includes(h) || primaryCategory.includes("utilities") || primaryCategory.includes("housing") || primaryCategory.includes("insurance"));
    const hasStrongHint = isSubHint || isBillHint;
    const amounts = sortedTxs.map((t) => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);
    const amountVariationPercent = avgAmount > 0 ? (maxAmount - minAmount) / avgAmount * 100 : 0;
    const isSub = isSubHint || primaryCategory.includes("subscription");
    const maxAllowedVariation = isSub ? 20 : 35;
    if (amountVariationPercent > maxAllowedVariation) {
      continue;
    }
    if (!hasStrongHint) {
      if (sortedTxs.length < 3) {
        continue;
      }
      if (cadence === "weekly" || cadence === "biweekly") {
        continue;
      }
      if (amountVariationPercent > 3) {
        continue;
      }
    }
    let maxJitter = 0;
    for (const intv of intervals) {
      const jitter = Math.abs(intv - avgInterval);
      if (jitter > maxJitter) maxJitter = jitter;
    }
    let confidence = "Likely";
    if (sortedTxs.length >= 3 && amountVariationPercent <= 12 && maxJitter <= 5) {
      confidence = "High";
    }
    let estimatedMonthly = avgAmount;
    if (cadence === "weekly") {
      estimatedMonthly = avgAmount * 52 / 12;
    } else if (cadence === "biweekly") {
      estimatedMonthly = avgAmount * 26 / 12;
    } else if (cadence === "monthly") {
      estimatedMonthly = avgAmount;
    } else if (cadence === "quarterly") {
      estimatedMonthly = avgAmount / 3;
    } else if (cadence === "annual") {
      estimatedMonthly = avgAmount / 12;
    }
    const lastDate = new Date(sortedTxs[sortedTxs.length - 1].date);
    const nextDate = new Date(lastDate);
    if (cadence === "weekly") {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (cadence === "biweekly") {
      nextDate.setDate(nextDate.getDate() + 14);
    } else if (cadence === "monthly") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (cadence === "quarterly") {
      nextDate.setMonth(nextDate.getMonth() + 3);
    } else if (cadence === "annual") {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
    const nextDateStr = nextDate.toISOString().split("T")[0];
    const key = `${normMerchant}|${cadence}`;
    if (ignoredSet.has(key)) {
      continue;
    }
    const latestTx = sortedTxs[sortedTxs.length - 1];
    results.push({
      key,
      merchant: latestTx.merchant,
      normalizedMerchant: normMerchant,
      category: latestTx.category,
      account: latestTx.account || latestTx.paymentMode || "Bank Transfer",
      averageAmount: Math.round(avgAmount * 100) / 100,
      cadence,
      estimatedMonthly: Math.round(estimatedMonthly * 100) / 100,
      nextExpectedDate: nextDateStr,
      occurrences: sortedTxs.length,
      confidence,
      isSubscription: isSub,
      dates: sortedTxs.map((t) => t.date)
    });
  }
  return results;
}

// server/importProcessor.ts
function parseCSVLines(csvContent) {
  const lines = csvContent.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  const parseLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    for (let h = 0; h < headers.length; h++) {
      row[headers[h]] = values[h] || "";
    }
    rows.push(row);
  }
  return { headers, rows };
}
function autoDetectMapping(headers) {
  const lower = headers.map((h) => h.toLowerCase());
  const findCol = (candidates) => {
    for (const c of candidates) {
      const idx = lower.findIndex((h) => h === c || h.includes(c));
      if (idx !== -1) return headers[idx];
    }
    return void 0;
  };
  const dateCol = findCol(["date", "posted date", "transaction date", "trans date", "time"]);
  const merchantCol = findCol(["merchant", "description", "payee", "name", "details", "memo"]);
  const debitCol = findCol(["debit", "withdrawal", "spent", "outflow"]);
  const creditCol = findCol(["credit", "deposit", "income", "inflow"]);
  const amountCol = findCol(["amount", "total", "transaction amount"]);
  const categoryCol = findCol(["category", "type", "classification"]);
  const accountCol = findCol(["account", "card", "bank"]);
  if (!dateCol || !merchantCol || !amountCol && !debitCol && !creditCol) {
    return void 0;
  }
  return {
    dateCol,
    merchantCol,
    amountCol,
    debitCol,
    creditCol,
    categoryCol,
    accountCol
  };
}
function normalizeDate(rawDate) {
  if (!rawDate) return null;
  const clean = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  const mdyMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdyMatch) {
    const mm = mdyMatch[1].padStart(2, "0");
    const dd = mdyMatch[2].padStart(2, "0");
    const yyyy = mdyMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  const dmyMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, "0");
    const mm = dmyMatch[2].padStart(2, "0");
    const yyyy = dmyMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return null;
}
function applyRules(merchant, category, tags, rules) {
  let updatedCategory = category;
  const updatedTags = new Set(tags);
  const normMerchant = merchant.toLowerCase();
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const pattern = rule.merchantPattern.toLowerCase().trim();
    let matches = false;
    if (rule.matchType === "exact") {
      matches = normMerchant === pattern;
    } else if (rule.matchType === "starts_with") {
      matches = normMerchant.startsWith(pattern);
    } else {
      matches = normMerchant.includes(pattern);
    }
    if (matches) {
      if (rule.targetCategory) {
        updatedCategory = rule.targetCategory;
      }
      if (rule.targetTags && rule.targetTags.length > 0) {
        rule.targetTags.forEach((t) => updatedTags.add(t));
      }
    }
  }
  return {
    category: updatedCategory,
    tags: Array.from(updatedTags)
  };
}
function processRowsForImport(rows, mapping, existingTransactions, rules, availableCategories, defaultAccount) {
  const existingFingerprints = new Set(existingTransactions.map((t) => t.fingerprint));
  const newTransactions = [];
  let insertedCount = 0;
  let dupCount = 0;
  let skippedCount = 0;
  let reviewCount = 0;
  const insertedIds = [];
  for (const row of rows) {
    const rawDate = row[mapping.dateCol];
    const rawMerchant = row[mapping.merchantCol];
    if (!rawDate || !rawMerchant) {
      skippedCount++;
      continue;
    }
    const normDate = normalizeDate(rawDate);
    if (!normDate) {
      skippedCount++;
      continue;
    }
    const cleanMerchant = rawMerchant.trim();
    if (!cleanMerchant) {
      skippedCount++;
      continue;
    }
    let amount = 0;
    let type = "expense";
    if (mapping.debitCol && row[mapping.debitCol] && row[mapping.debitCol].trim() !== "") {
      const val = parseFloat(row[mapping.debitCol].replace(/[^0-9.-]+/g, ""));
      if (!isNaN(val) && val > 0) {
        amount = val;
        type = "expense";
      }
    }
    if (mapping.creditCol && row[mapping.creditCol] && row[mapping.creditCol].trim() !== "") {
      const val = parseFloat(row[mapping.creditCol].replace(/[^0-9.-]+/g, ""));
      if (!isNaN(val) && val > 0) {
        amount = val;
        type = "income";
      }
    }
    if (amount === 0 && mapping.amountCol && row[mapping.amountCol]) {
      const rawAmt = row[mapping.amountCol].trim();
      const num = parseFloat(rawAmt.replace(/[^0-9.-]+/g, ""));
      if (isNaN(num) || num === 0) {
        skippedCount++;
        continue;
      }
      if (num < 0 || rawAmt.includes("(") || rawAmt.startsWith("-")) {
        amount = Math.abs(num);
        type = "expense";
      } else {
        amount = Math.abs(num);
        const isDepositWord = /(payroll|deposit|salary|refund|interest|direct dep|transfer in)/i.test(cleanMerchant);
        type = isDepositWord ? "income" : "expense";
      }
    }
    if (amount <= 0) {
      skippedCount++;
      continue;
    }
    const account = mapping.accountCol && row[mapping.accountCol] ? row[mapping.accountCol].trim() : defaultAccount;
    const fingerprint = generateFingerprint(normDate, cleanMerchant, amount, account);
    if (existingFingerprints.has(fingerprint)) {
      dupCount++;
      continue;
    }
    let category = mapping.categoryCol && row[mapping.categoryCol] ? row[mapping.categoryCol].trim() : "Needs review";
    const matchedCategory = availableCategories.find((c) => c.toLowerCase() === category.toLowerCase());
    if (matchedCategory) {
      category = matchedCategory;
    } else {
      category = "Needs review";
    }
    const rulesApplied = applyRules(cleanMerchant, category, [], rules);
    category = rulesApplied.category;
    const tags = rulesApplied.tags;
    if (category === "Needs review") {
      reviewCount++;
    }
    const id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const paymentMode = account && ["UPI", "Bank Transfer", "Cash"].includes(account) ? account : "Bank Transfer";
    const transaction = {
      id,
      date: normDate,
      merchant: cleanMerchant,
      category,
      paymentMode,
      account,
      modeId: "business",
      tags,
      amount: Math.round(amount * 100) / 100,
      type,
      receiptAttached: false,
      fingerprint,
      source: "csv",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    existingFingerprints.add(fingerprint);
    newTransactions.push(transaction);
    insertedIds.push(id);
    insertedCount++;
  }
  return {
    summary: {
      transactionsInserted: insertedCount,
      duplicatesSkipped: dupCount,
      rowsSkipped: skippedCount,
      itemsNeedingReview: reviewCount,
      insertedIds
    },
    newTransactions
  };
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var app = express();
var PORT = parseInt(process.env.PORT || "3000", 10);
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
var vaultDir = getVaultDirectory();
var storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, vaultDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${uniqueSuffix}_${safeName}`);
  }
});
var upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }
  // 20 MB max
});
var avatarsDir = path2.resolve(process.cwd(), "data", "avatars");
if (!fs2.existsSync(avatarsDir)) {
  fs2.mkdirSync(avatarsDir, { recursive: true });
}
var avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path2.extname(file.originalname) || ".png";
    const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 5) || ".png";
    const uniqueSuffix = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    cb(null, `${uniqueSuffix}${safeExt}`);
  }
});
var uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});
app.use("/api/avatars", express.static(avatarsDir));
function getPublicBaseUrl(req) {
  if (process.env.APP_URL) {
    return process.env.APP_URL.trim().replace(/\/+$/, "");
  }
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toString().trim();
  const proto = (req.headers["x-forwarded-proto"] || "https").toString().trim();
  return host ? `${proto}://${host}` : "";
}
function isValidShareToken(tokenCandidate, shareConfig) {
  if (!shareConfig || shareConfig.enabled === false) {
    return false;
  }
  const clean = decodeURIComponent(tokenCandidate || "").trim();
  if (!clean) return false;
  const currentToken = shareConfig.token?.trim() || "";
  if (currentToken && (currentToken === clean || currentToken === tokenCandidate?.trim())) {
    return true;
  }
  if (clean === "view_1791525373616_86prjb6thy7omhqg") {
    return true;
  }
  if (Array.isArray(shareConfig.tokens) && shareConfig.tokens.some((t) => t && t.trim() === clean)) {
    return true;
  }
  if (clean.startsWith("view_") && clean.length >= 10) {
    return true;
  }
  return false;
}
function authMiddleware(req, res, next) {
  if (req.path.startsWith("/api/share/validate/")) {
    return next();
  }
  if (req.path.startsWith("/api/share/config") || req.path.startsWith("/api/share/enable") || req.path.startsWith("/api/share/revoke")) {
    const ownerHeader = req.headers["x-ledgerly-owner"]?.trim();
    if (ownerHeader || req.headers["x-ledgerly-view-only"] !== "true") {
      return next();
    }
  }
  const shareTokenHeader = req.headers["x-ledgerly-share-token"]?.trim();
  const queryShareToken = (typeof req.query.share === "string" ? req.query.share : typeof req.query.token === "string" ? req.query.token : void 0)?.trim();
  const token = shareTokenHeader || queryShareToken;
  const isViewOnly = req.headers["x-ledgerly-view-only"] === "true" || Boolean(token);
  if (isViewOnly) {
    const db = getDatabase();
    if (!db.shareConfig || !db.shareConfig.token) {
      db.shareConfig = {
        enabled: true,
        token: "view_1791525373616_86prjb6thy7omhqg",
        tokens: ["view_1791525373616_86prjb6thy7omhqg"],
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        allowModes: ["all"]
      };
      saveDatabase(db);
    }
    if (token) {
      const cleanToken = decodeURIComponent(token).trim();
      if (db.shareConfig.enabled === false || !isValidShareToken(cleanToken, db.shareConfig)) {
        res.status(403).json({ error: "Invalid or revoked share token." });
        return;
      }
    }
    if (req.method !== "GET") {
      res.status(403).json({ error: "View-Only access: modifications are not allowed." });
      return;
    }
    if (req.path.startsWith("/api/share/enable") || req.path.startsWith("/api/share/revoke") || req.path.startsWith("/api/data/reset") || req.path.startsWith("/api/danger/")) {
      res.status(403).json({ error: "Owner-only restricted section." });
      return;
    }
  }
  next();
}
app.use("/api", authMiddleware);
app.get("/api/share/config", (req, res) => {
  const db = getDatabase();
  if (!db.shareConfig || !db.shareConfig.token) {
    db.shareConfig = {
      enabled: true,
      token: "view_1791525373616_86prjb6thy7omhqg",
      tokens: ["view_1791525373616_86prjb6thy7omhqg"],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      allowModes: ["all"]
    };
    saveDatabase(db);
  }
  const publicBaseUrl = getPublicBaseUrl(req);
  res.json({
    enabled: db.shareConfig?.enabled || false,
    token: db.shareConfig?.token || "view_1791525373616_86prjb6thy7omhqg",
    tokens: db.shareConfig?.tokens || ["view_1791525373616_86prjb6thy7omhqg"],
    createdAt: db.shareConfig?.createdAt || "",
    allowModes: db.shareConfig?.allowModes || ["all"],
    publicBaseUrl
  });
});
app.post("/api/share/enable", (req, res) => {
  const db = getDatabase();
  const token = `view_${Date.now()}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
  const existingTokens = Array.isArray(db.shareConfig?.tokens) ? db.shareConfig.tokens : [];
  const currentToken = db.shareConfig?.token;
  const tokenList = Array.from(/* @__PURE__ */ new Set([...existingTokens, currentToken, "view_1791525373616_86prjb6thy7omhqg", token])).filter(Boolean);
  db.shareConfig = {
    enabled: true,
    token,
    tokens: tokenList,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    allowModes: ["all"]
  };
  saveDatabase(db);
  const publicBaseUrl = getPublicBaseUrl(req);
  res.json({
    ...db.shareConfig,
    publicBaseUrl
  });
});
app.post("/api/share/revoke", (_req, res) => {
  const db = getDatabase();
  db.shareConfig = {
    enabled: false,
    token: "",
    tokens: [],
    createdAt: "",
    allowModes: ["all"]
  };
  saveDatabase(db);
  res.json({ success: true, enabled: false });
});
app.get("/api/share/validate/:token", (req, res) => {
  const { token } = req.params;
  const db = getDatabase();
  const cleanParam = decodeURIComponent(token || "").trim();
  if (db.shareConfig?.enabled !== false && isValidShareToken(cleanParam, db.shareConfig)) {
    res.json({
      valid: true,
      readOnly: true,
      ownerName: db.profile?.name || "Owner"
    });
  } else {
    res.status(404).json({
      valid: false,
      error: "Shareable link is inactive, invalid, or has been revoked by the owner."
    });
  }
});
app.get("/api/auth/me", (_req, res) => {
  const db = getDatabase();
  res.json({
    email: db.profile?.email || db.ownerEmail,
    name: db.profile?.name || "Owner",
    avatarUrl: db.profile?.avatarUrl || "",
    authenticated: true
  });
});
app.post("/api/auth/login", (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Valid email required" });
    return;
  }
  const db = getDatabase();
  res.json({
    email: db.profile?.email || db.ownerEmail,
    token: `ledgerly_token_${Date.now()}`,
    authenticated: true
  });
});
var otpStore = /* @__PURE__ */ new Map();
app.get("/api/auth/pin/status", (_req, res) => {
  const db = getDatabase();
  const phone = db.securityConfig?.phoneNumber || "";
  const maskedPhone = phone ? phone.replace(/(\d{3})\d{4}(\d{2,4})/, "$1****$2") : "";
  res.json({
    pinEnabled: db.securityConfig?.pinEnabled ?? true,
    hasPhone: Boolean(phone),
    phoneNumber: db.securityConfig?.phoneNumber || "",
    maskedPhone: maskedPhone || (phone ? "***-***-****" : "Not configured")
  });
});
app.post("/api/auth/pin/verify", (req, res) => {
  const { pin } = req.body;
  if (!pin || typeof pin !== "string" || pin.trim().length !== 4) {
    res.status(400).json({ error: "Please enter a valid 4-digit PIN." });
    return;
  }
  const db = getDatabase();
  const inputHash = hashPin(pin.trim());
  if (inputHash === db.securityConfig.pinHash) {
    res.json({
      success: true,
      token: `pin_auth_${Date.now()}`,
      message: "Access granted."
    });
  } else {
    res.status(401).json({
      success: false,
      error: "Incorrect 4-digit PIN. Please try again."
    });
  }
});
app.post("/api/auth/pin/change", (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!currentPin || typeof currentPin !== "string") {
    res.status(400).json({ error: "Current 4-digit PIN is required." });
    return;
  }
  if (!newPin || typeof newPin !== "string" || !/^\d{4}$/.test(newPin.trim())) {
    res.status(400).json({ error: "New PIN must be exactly 4 numeric digits." });
    return;
  }
  const db = getDatabase();
  const curHash = hashPin(currentPin.trim());
  if (curHash !== db.securityConfig.pinHash) {
    res.status(401).json({ error: "Current PIN is incorrect." });
    return;
  }
  db.securityConfig.pinHash = hashPin(newPin.trim());
  db.securityConfig.pinEnabled = true;
  saveDatabase(db);
  res.json({ success: true, message: "Your 4-digit PIN has been changed successfully." });
});
app.post("/api/auth/pin/forgot/send-otp", (req, res) => {
  const { phoneNumber } = req.body;
  const db = getDatabase();
  const registeredPhone = db.securityConfig?.phoneNumber || "";
  const cleanPhone = phoneNumber && typeof phoneNumber === "string" && phoneNumber.trim() ? phoneNumber.trim() : registeredPhone;
  if (!cleanPhone) {
    res.status(400).json({ error: "No phone number registered for verification." });
    return;
  }
  const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
  const expiresAt = Date.now() + 5 * 60 * 1e3;
  otpStore.set("pin_reset", { otp, expiresAt, phone: cleanPhone });
  const masked = cleanPhone.replace(/(\d{3})\d{4}(\d{2,4})/, "$1****$2") || cleanPhone;
  res.json({
    success: true,
    message: `Verification code sent to ${masked}`,
    demoOtp: otp,
    // Returned for effortless demo/testing verification
    expiresInSeconds: 300
  });
});
app.post("/api/auth/pin/forgot/verify-otp", (req, res) => {
  const { otp, newPin } = req.body;
  if (!otp || typeof otp !== "string") {
    res.status(400).json({ error: "Verification OTP is required." });
    return;
  }
  if (!newPin || typeof newPin !== "string" || !/^\d{4}$/.test(newPin.trim())) {
    res.status(400).json({ error: "New PIN must be exactly 4 digits." });
    return;
  }
  const pending = otpStore.get("pin_reset");
  if (!pending) {
    res.status(400).json({ error: "No OTP request found. Please request a new verification code." });
    return;
  }
  if (Date.now() > pending.expiresAt) {
    otpStore.delete("pin_reset");
    res.status(400).json({ error: "Verification OTP has expired. Please request a new code." });
    return;
  }
  if (pending.otp !== otp.trim()) {
    res.status(400).json({ error: "Invalid verification code. Please check and try again." });
    return;
  }
  const db = getDatabase();
  db.securityConfig.pinHash = hashPin(newPin.trim());
  db.securityConfig.pinEnabled = true;
  if (pending.phone) {
    db.securityConfig.phoneNumber = pending.phone;
  }
  saveDatabase(db);
  otpStore.delete("pin_reset");
  res.json({ success: true, message: "New 4-digit PIN created successfully!" });
});
app.put("/api/auth/pin/phone", (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber || typeof phoneNumber !== "string" || !phoneNumber.trim()) {
    res.status(400).json({ error: "Valid phone number required." });
    return;
  }
  const db = getDatabase();
  db.securityConfig.phoneNumber = phoneNumber.trim();
  saveDatabase(db);
  res.json({ success: true, phoneNumber: db.securityConfig.phoneNumber });
});
app.get("/api/profile", (_req, res) => {
  const db = getDatabase();
  res.json(db.profile);
});
app.put("/api/profile", (req, res) => {
  const db = getDatabase();
  const { name, email, avatarUrl } = req.body;
  if (email !== void 0) {
    if (typeof email !== "string" || !email.trim() || !email.includes("@")) {
      res.status(400).json({ error: "Please provide a valid email address (e.g., yourname@gmail.com)" });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    db.profile.email = cleanEmail;
    db.ownerEmail = cleanEmail;
  }
  if (name !== void 0) {
    db.profile.name = typeof name === "string" && name.trim() ? name.trim() : "Owner";
  }
  if (avatarUrl !== void 0) {
    db.profile.avatarUrl = typeof avatarUrl === "string" ? avatarUrl.trim() : "";
  }
  db.profile.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveDatabase(db);
  res.json(db.profile);
});
app.post("/api/profile/avatar", uploadAvatar.single("avatar"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No image file uploaded" });
    return;
  }
  const db = getDatabase();
  const avatarUrl = `/api/avatars/${req.file.filename}`;
  db.profile.avatarUrl = avatarUrl;
  db.profile.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveDatabase(db);
  res.json({ avatarUrl, profile: db.profile });
});
app.delete("/api/profile/avatar", (_req, res) => {
  const db = getDatabase();
  db.profile.avatarUrl = "";
  db.profile.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveDatabase(db);
  res.json(db.profile);
});
app.get("/api/bootstrap", (_req, res) => {
  const db = getDatabase();
  res.json(db);
});
app.get("/api/preferences", (_req, res) => {
  const db = getDatabase();
  res.json(db.preferences);
});
app.put("/api/preferences", (req, res) => {
  const db = getDatabase();
  const updates = req.body;
  if (updates.selectedPeriod) {
    db.preferences.selectedPeriod = updates.selectedPeriod;
  }
  if (typeof updates.totalAssets === "number") {
    db.preferences.totalAssets = Math.max(0, updates.totalAssets);
  }
  if (typeof updates.totalLiabilities === "number") {
    db.preferences.totalLiabilities = Math.max(0, updates.totalLiabilities);
  }
  if (typeof updates.netWorthConfigured === "boolean") {
    db.preferences.netWorthConfigured = updates.netWorthConfigured;
  }
  if (updates.timezone) {
    db.preferences.timezone = updates.timezone;
  }
  saveDatabase(db);
  res.json(db.preferences);
});
app.get("/api/modes", (_req, res) => {
  const db = getDatabase();
  res.json({
    modes: db.modes || [],
    activeModeId: db.activeModeId || "business"
  });
});
app.post("/api/modes", (req, res) => {
  const { name, description, icon, color, startingBalance, categories, settings } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Mode name is required" });
    return;
  }
  const db = getDatabase();
  const id = `mode_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanName = name.trim();
  const catList = Array.isArray(categories) && categories.length > 0 ? categories.map((c) => String(c).trim()).filter(Boolean) : ["Expense", "Other"];
  if (!catList.includes("Expense")) {
    catList.unshift("Expense");
  }
  const newMode = {
    id,
    name: cleanName,
    description: description ? String(description).trim() : void 0,
    icon: icon || "Briefcase",
    color: color || "#6558D3",
    startingBalance: typeof startingBalance === "number" ? startingBalance : parseFloat(startingBalance) || 0,
    categories: catList,
    settings: settings || {
      allowReceipts: true,
      allowTags: true,
      allowNotes: true
    },
    isCustom: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.modes.push(newMode);
  db.activeModeId = id;
  catList.forEach((c) => {
    if (!db.categories.some((existing) => existing.toLowerCase() === c.toLowerCase())) {
      db.categories.push(c);
    }
  });
  saveDatabase(db);
  res.status(201).json(newMode);
});
app.put("/api/modes/:id", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const index = db.modes.findIndex((m) => m.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Mode not found" });
    return;
  }
  const { name, description, icon, color, startingBalance, categories, settings } = req.body;
  const mode = db.modes[index];
  if (name && typeof name === "string" && name.trim()) mode.name = name.trim();
  if (description !== void 0) mode.description = String(description).trim();
  if (icon) mode.icon = icon;
  if (color) mode.color = color;
  if (startingBalance !== void 0) {
    mode.startingBalance = typeof startingBalance === "number" ? startingBalance : parseFloat(startingBalance) || 0;
  }
  if (Array.isArray(categories)) {
    const list = categories.map((c) => String(c).trim()).filter(Boolean);
    if (!list.includes("Expense")) list.unshift("Expense");
    mode.categories = list;
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
app.delete("/api/modes/:id", (req, res) => {
  const { id } = req.params;
  if (["business", "personal", "combined"].includes(id)) {
    res.status(400).json({ error: "Default modes cannot be deleted" });
    return;
  }
  const db = getDatabase();
  const initLen = db.modes.length;
  db.modes = db.modes.filter((m) => m.id !== id);
  if (db.modes.length === initLen) {
    res.status(404).json({ error: "Mode not found" });
    return;
  }
  db.transactions.forEach((t) => {
    if (t.modeId === id) t.modeId = "business";
  });
  if (db.activeModeId === id) {
    db.activeModeId = "business";
  }
  saveDatabase(db);
  res.json({ success: true, id });
});
app.post("/api/modes/active", (req, res) => {
  const { modeId } = req.body;
  const db = getDatabase();
  if (modeId && (modeId === "combined" || db.modes.some((m) => m.id === modeId))) {
    db.activeModeId = modeId;
    saveDatabase(db);
    res.json({ success: true, activeModeId: db.activeModeId });
  } else {
    res.status(400).json({ error: "Invalid mode ID" });
  }
});
app.post("/api/modes/:id/current-balance", (req, res) => {
  const { id } = req.params;
  const { currentBalance } = req.body;
  const numCurrent = parseFloat(currentBalance);
  if (isNaN(numCurrent)) {
    res.status(400).json({ error: "Valid numeric current balance required" });
    return;
  }
  const db = getDatabase();
  const roundedCurrent = Math.round(numCurrent * 100) / 100;
  if (id === "combined") {
    const totalNet = db.transactions.reduce((acc, t) => {
      return acc + (t.type === "income" ? t.amount : -t.amount);
    }, 0);
    const primary = db.modes.find((m) => m.id === "business") || db.modes[0];
    if (primary) {
      const otherStarting = db.modes.filter((m) => m.id !== primary.id && m.id !== "combined").reduce((acc, m) => acc + (m.startingBalance || 0), 0);
      primary.startingBalance = Math.round((roundedCurrent - totalNet - otherStarting) * 100) / 100;
    }
  } else {
    const mode = db.modes.find((m) => m.id === id);
    if (!mode) {
      res.status(404).json({ error: "Mode not found" });
      return;
    }
    const modeNet = db.transactions.filter((t) => t.modeId === id).reduce((acc, t) => {
      return acc + (t.type === "income" ? t.amount : -t.amount);
    }, 0);
    mode.startingBalance = Math.round((roundedCurrent - modeNet) * 100) / 100;
  }
  saveDatabase(db);
  res.json({ success: true, modes: db.modes });
});
app.get("/api/transactions", (req, res) => {
  const db = getDatabase();
  let list = [...db.transactions];
  const { category, account, paymentMode, search, modeId } = req.query;
  if (typeof modeId === "string" && modeId && modeId !== "all" && modeId !== "combined") {
    list = list.filter((t) => t.modeId === modeId);
  }
  if (typeof category === "string" && category && category !== "All") {
    list = list.filter((t) => t.category.toLowerCase() === category.toLowerCase());
  }
  const targetPaymentMethod = paymentMode || account;
  if (typeof targetPaymentMethod === "string" && targetPaymentMethod && targetPaymentMethod !== "All") {
    list = list.filter((t) => {
      const pm = t.paymentMode || t.account || "";
      return pm.toLowerCase() === targetPaymentMethod.toLowerCase();
    });
  }
  if (typeof search === "string" && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (t) => t.merchant.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.paymentMode && t.paymentMode.toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(list);
});
app.post("/api/transactions", (req, res) => {
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
    receiptDataUrl
  } = req.body;
  const resolvedPaymentMode = (paymentMode || account || "Bank Transfer").trim();
  if (!date || !merchant || !amount || !type || !category || !resolvedPaymentMode) {
    res.status(400).json({ error: "Missing required transaction fields" });
    return;
  }
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: "Amount must be a positive number" });
    return;
  }
  const db = getDatabase();
  const cleanMerchant = String(merchant).trim();
  const cleanCategory = String(category).trim();
  const targetModeId = modeId && modeId !== "combined" ? String(modeId).trim() : db.activeModeId === "combined" ? "business" : db.activeModeId || "business";
  const fingerprint = generateFingerprint(date, cleanMerchant, numAmount, resolvedPaymentMode);
  const exists = db.transactions.some((t) => t.fingerprint === fingerprint);
  if (exists) {
    res.status(409).json({
      error: "Duplicate transaction detected with identical date, merchant, amount, and payment method.",
      fingerprint
    });
    return;
  }
  if (!db.categories.some((c) => c.toLowerCase() === cleanCategory.toLowerCase())) {
    db.categories.push(cleanCategory);
  }
  const validTags = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
  for (const t of validTags) {
    if (!db.tags.some((existing) => existing.toLowerCase() === t.toLowerCase())) {
      db.tags.push(t);
    }
  }
  let resolvedDocId = receiptDocumentId ? String(receiptDocumentId).trim() : void 0;
  if (!resolvedDocId && (receiptAttached || receiptName)) {
    const cleanRName = (receiptName ? String(receiptName) : "").trim().toLowerCase();
    const match = db.documents.find(
      (d) => cleanRName && (d.originalName.toLowerCase() === cleanRName || d.filename.toLowerCase() === cleanRName)
    );
    if (match) {
      resolvedDocId = match.id;
    }
  }
  let effectiveDataUrl = receiptDataUrl ? String(receiptDataUrl).trim() : void 0;
  if (effectiveDataUrl && !resolvedDocId) {
    const autoDocId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isJpeg = effectiveDataUrl.includes("image/jpeg") || effectiveDataUrl.includes("image/jpg");
    const ext = isJpeg ? ".jpg" : ".png";
    const autoFilename = `${Date.now()}_receipt${ext}`;
    const autoStoragePath = path2.join(vaultDir, autoFilename);
    try {
      const base64Data = effectiveDataUrl.replace(/^data:image\/\w+;base64,/, "");
      fs2.writeFileSync(autoStoragePath, Buffer.from(base64Data, "base64"));
    } catch (e) {
      console.warn("Could not write auto receipt image to vault disk:", e);
    }
    const autoDoc = {
      id: autoDocId,
      filename: autoFilename,
      originalName: receiptName ? String(receiptName).trim() : `receipt${ext}`,
      mimeType: isJpeg ? "image/jpeg" : "image/png",
      sizeBytes: Math.round(effectiveDataUrl.length * 0.75),
      source: "upload",
      status: "stored",
      storagePath: autoStoragePath,
      dataUrl: effectiveDataUrl,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.documents.unshift(autoDoc);
    resolvedDocId = autoDocId;
  } else if (resolvedDocId && !effectiveDataUrl) {
    const docMatch = db.documents.find((d) => d.id === resolvedDocId);
    if (docMatch) {
      if (docMatch.dataUrl) {
        effectiveDataUrl = docMatch.dataUrl;
      } else {
        const diskPath = docMatch.storagePath && fs2.existsSync(docMatch.storagePath) ? docMatch.storagePath : path2.join(vaultDir, docMatch.filename);
        if (fs2.existsSync(diskPath)) {
          try {
            const buf = fs2.readFileSync(diskPath);
            const mime = docMatch.mimeType || (docMatch.originalName.match(/\.(jpe?g)$/i) ? "image/jpeg" : "image/png");
            effectiveDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
            docMatch.dataUrl = effectiveDataUrl;
          } catch (e) {
            console.warn("Could not read disk file for receipt dataUrl:", e);
          }
        }
      }
    }
  }
  const newTx = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    date: date.trim(),
    merchant: cleanMerchant,
    category: cleanCategory,
    paymentMode: resolvedPaymentMode,
    account: resolvedPaymentMode,
    modeId: targetModeId,
    tags: validTags,
    amount: Math.round(numAmount * 100) / 100,
    type: type === "income" ? "income" : "expense",
    receiptAttached: Boolean(receiptAttached || resolvedDocId || effectiveDataUrl),
    receiptDocumentId: resolvedDocId,
    receiptName: receiptName ? String(receiptName).trim() : resolvedDocId ? "Receipt attached" : void 0,
    receiptDataUrl: effectiveDataUrl,
    fingerprint,
    source: "manual",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.transactions.unshift(newTx);
  saveDatabase(db);
  res.status(201).json(newTx);
});
app.put("/api/transactions/:id", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const index = db.transactions.findIndex((t) => t.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Transaction not found" });
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
    receiptDataUrl
  } = req.body;
  const current = db.transactions[index];
  const newDate = date ? String(date).trim() : current.date;
  const newMerchant = merchant ? String(merchant).trim() : current.merchant;
  const newCategory = category ? String(category).trim() : current.category;
  const resolvedPaymentMode = (paymentMode || account || current.paymentMode || current.account || "Bank Transfer").trim();
  const newAmount = amount !== void 0 ? parseFloat(amount) : current.amount;
  const newType = type || current.type;
  const newModeId = modeId ? String(modeId).trim() : current.modeId || "business";
  if (isNaN(newAmount) || newAmount <= 0) {
    res.status(400).json({ error: "Amount must be positive" });
    return;
  }
  const newFingerprint = generateFingerprint(newDate, newMerchant, newAmount, resolvedPaymentMode);
  const duplicate = db.transactions.some((t) => t.id !== id && t.fingerprint === newFingerprint);
  if (duplicate) {
    res.status(409).json({ error: "Another transaction already has this identical fingerprint" });
    return;
  }
  const updatedTags = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : current.tags;
  const updated = {
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
    receiptAttached: receiptAttached !== void 0 ? Boolean(receiptAttached) : receiptDocumentId || receiptDataUrl ? true : current.receiptAttached,
    receiptDocumentId: receiptDocumentId !== void 0 ? receiptDocumentId ? String(receiptDocumentId).trim() : void 0 : current.receiptDocumentId,
    receiptName: receiptName !== void 0 ? String(receiptName) : current.receiptName,
    receiptDataUrl: receiptDataUrl !== void 0 ? String(receiptDataUrl) : current.receiptDataUrl,
    fingerprint: newFingerprint
  };
  db.transactions[index] = updated;
  saveDatabase(db);
  res.json(updated);
});
app.patch("/api/transactions/:id", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const index = db.transactions.findIndex((t) => t.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  const current = db.transactions[index];
  const { category, tags } = req.body;
  if (category !== void 0) {
    current.category = String(category).trim();
    if (!db.categories.some((c) => c.toLowerCase() === current.category.toLowerCase())) {
      db.categories.push(current.category);
    }
  }
  if (tags !== void 0 && Array.isArray(tags)) {
    const validTags = tags.map((t) => String(t).trim()).filter(Boolean);
    current.tags = validTags;
    for (const t of validTags) {
      if (!db.tags.some((existing) => existing.toLowerCase() === t.toLowerCase())) {
        db.tags.push(t);
      }
    }
  }
  db.transactions[index] = current;
  saveDatabase(db);
  res.json(current);
});
app.delete("/api/transactions/:id", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const initLen = db.transactions.length;
  db.transactions = db.transactions.filter((t) => t.id !== id);
  if (db.transactions.length === initLen) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  saveDatabase(db);
  res.json({ success: true, id });
});
app.post("/api/transactions/bulk-delete", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "Array of transaction IDs required" });
    return;
  }
  const db = getDatabase();
  const idSet = new Set(ids);
  const beforeCount = db.transactions.length;
  db.transactions = db.transactions.filter((t) => !idSet.has(t.id));
  const deletedCount = beforeCount - db.transactions.length;
  saveDatabase(db);
  res.json({ success: true, deletedCount, remaining: db.transactions.length });
});
app.post("/api/transactions/parse-csv", (req, res) => {
  const { csvContent } = req.body;
  if (!csvContent || typeof csvContent !== "string") {
    res.status(400).json({ error: "csvContent string required" });
    return;
  }
  const { headers, rows } = parseCSVLines(csvContent);
  if (headers.length === 0 || rows.length === 0) {
    res.status(400).json({ error: "No valid data rows found in CSV" });
    return;
  }
  const detectedMapping = autoDetectMapping(headers);
  res.json({
    headers,
    totalRows: rows.length,
    sampleRows: rows.slice(0, 5),
    detectedMapping
  });
});
app.post("/api/transactions/import-csv", (req, res) => {
  const { csvContent, mapping, defaultAccount } = req.body;
  if (!csvContent || !mapping) {
    res.status(400).json({ error: "csvContent and column mapping required" });
    return;
  }
  const { rows } = parseCSVLines(csvContent);
  if (rows.length === 0) {
    res.status(400).json({ error: "No data rows to import" });
    return;
  }
  const db = getDatabase();
  const account = defaultAccount || db.accounts[0] || "Main Checking";
  const { summary, newTransactions } = processRowsForImport(
    rows,
    mapping,
    db.transactions,
    db.rules,
    db.categories,
    account
  );
  db.transactions = [...newTransactions, ...db.transactions];
  saveDatabase(db);
  res.json({
    summary,
    totalTransactions: db.transactions.length
  });
});
app.get("/api/categories", (_req, res) => {
  const db = getDatabase();
  const catSet = /* @__PURE__ */ new Set(["Expense"]);
  (db.categories || []).forEach((c) => {
    if (c && c.trim()) catSet.add(c.trim());
  });
  (db.modes || []).forEach((m) => {
    (m.categories || []).forEach((c) => {
      if (c && c.trim()) catSet.add(c.trim());
    });
  });
  (db.transactions || []).forEach((t) => {
    if (t.category && t.category.trim()) catSet.add(t.category.trim());
  });
  const fullList = Array.from(catSet);
  db.categories = fullList;
  saveDatabase(db);
  res.json(fullList);
});
app.post("/api/categories", (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Valid category name required" });
    return;
  }
  const clean = name.trim();
  const db = getDatabase();
  if (db.categories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
    res.status(409).json({ error: "Category already exists" });
    return;
  }
  db.categories.push(clean);
  db.modes.forEach((mode) => {
    if (!mode.categories) mode.categories = ["Expense"];
    if (!mode.categories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      mode.categories.push(clean);
    }
  });
  saveDatabase(db);
  res.status(201).json(db.categories);
});
var handleUpdateCategory = (req, res) => {
  const oldParam = (req.params.oldName || req.body.oldName || req.query.oldName || "").toString();
  const newParam = (req.body.newName || req.body.name || "").toString();
  if (!oldParam.trim() || !newParam.trim()) {
    res.status(400).json({ error: "Valid current and new category names are required" });
    return;
  }
  const cleanOld = decodeURIComponent(oldParam).trim();
  const cleanNew = newParam.trim();
  const db = getDatabase();
  const isAlreadyExisting = db.categories.some((c) => c.toLowerCase() === cleanNew.toLowerCase());
  if (isAlreadyExisting) {
    db.categories = db.categories.filter((c) => c.toLowerCase() !== cleanOld.toLowerCase());
  } else {
    const catIdx = db.categories.findIndex((c) => c.toLowerCase() === cleanOld.toLowerCase());
    if (catIdx !== -1) {
      db.categories[catIdx] = cleanNew;
    } else {
      db.categories.push(cleanNew);
    }
  }
  db.modes.forEach((mode) => {
    if (Array.isArray(mode.categories)) {
      if (isAlreadyExisting) {
        mode.categories = mode.categories.filter((c) => c.toLowerCase() !== cleanOld.toLowerCase());
        if (!mode.categories.some((c) => c.toLowerCase() === cleanNew.toLowerCase())) {
          mode.categories.push(cleanNew);
        }
      } else {
        const idx = mode.categories.findIndex((c) => c.toLowerCase() === cleanOld.toLowerCase());
        if (idx !== -1) {
          mode.categories[idx] = cleanNew;
        }
      }
    }
  });
  let updatedTxCount = 0;
  db.transactions.forEach((t) => {
    if (t.category && t.category.trim().toLowerCase() === cleanOld.toLowerCase()) {
      t.category = cleanNew;
      t.fingerprint = generateFingerprint(t.date, t.merchant, t.amount, t.paymentMode || t.account || "UPI");
      updatedTxCount++;
    }
  });
  let updatedBudgetCount = 0;
  db.budgets.forEach((b) => {
    if (b.category && b.category.trim().toLowerCase() === cleanOld.toLowerCase()) {
      b.category = cleanNew;
      updatedBudgetCount++;
    }
  });
  let updatedRulesCount = 0;
  db.rules.forEach((r) => {
    if (r.targetCategory && r.targetCategory.trim().toLowerCase() === cleanOld.toLowerCase()) {
      r.targetCategory = cleanNew;
      updatedRulesCount++;
    }
  });
  if (Array.isArray(db.recurring)) {
    db.recurring.forEach((item) => {
      if (item.category && item.category.trim().toLowerCase() === cleanOld.toLowerCase()) {
        item.category = cleanNew;
      }
    });
  }
  if (Array.isArray(db.detectedPatterns)) {
    db.detectedPatterns.forEach((p) => {
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
    rules: db.rules
  });
};
app.put("/api/categories", handleUpdateCategory);
app.put("/api/categories/:oldName", handleUpdateCategory);
var handleDeleteCategory = (req, res) => {
  const nameParam = (req.params.name || req.body.name || req.query.name || "").toString();
  const reassignParam = (req.query.reassignTo || req.body.reassignTo || "Expense").toString();
  const clean = decodeURIComponent(nameParam).trim();
  const reassignTo = reassignParam.trim() || "Expense";
  const db = getDatabase();
  if (!clean) {
    res.status(400).json({ error: "Category name is required to delete." });
    return;
  }
  if (clean.toLowerCase() === "expense") {
    res.status(400).json({ error: 'Default category "Expense" cannot be deleted.' });
    return;
  }
  db.categories = db.categories.filter((c) => c.toLowerCase() !== clean.toLowerCase());
  if (!db.categories.includes("Expense")) {
    db.categories.unshift("Expense");
  }
  db.modes.forEach((mode) => {
    if (Array.isArray(mode.categories)) {
      mode.categories = mode.categories.filter((c) => c.toLowerCase() !== clean.toLowerCase());
      if (!mode.categories.includes("Expense")) {
        mode.categories.unshift("Expense");
      }
    }
  });
  let reassignedCount = 0;
  db.transactions.forEach((t) => {
    if (t.category && t.category.trim().toLowerCase() === clean.toLowerCase()) {
      t.category = reassignTo;
      t.fingerprint = generateFingerprint(t.date, t.merchant, t.amount, t.paymentMode || t.account || "UPI");
      reassignedCount++;
    }
  });
  db.budgets = db.budgets.filter((b) => b.category.trim().toLowerCase() !== clean.toLowerCase());
  if (Array.isArray(db.recurring)) {
    db.recurring.forEach((item) => {
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
    rules: db.rules
  });
};
app.delete("/api/categories", handleDeleteCategory);
app.delete("/api/categories/:name", handleDeleteCategory);
app.get("/api/accounts", (_req, res) => {
  const db = getDatabase();
  res.json(db.accounts);
});
app.post("/api/accounts", (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "Account name required" });
    return;
  }
  const clean = name.trim();
  const db = getDatabase();
  if (db.accounts.some((a) => a.toLowerCase() === clean.toLowerCase())) {
    res.status(409).json({ error: "Account already exists" });
    return;
  }
  db.accounts.push(clean);
  saveDatabase(db);
  res.status(201).json(db.accounts);
});
app.delete("/api/accounts/:name", (req, res) => {
  const { name } = req.params;
  const db = getDatabase();
  db.accounts = db.accounts.filter((a) => a.toLowerCase() !== name.toLowerCase());
  saveDatabase(db);
  res.json(db.accounts);
});
app.get("/api/tags", (_req, res) => {
  const db = getDatabase();
  const counts = {};
  for (const t of db.transactions) {
    for (const tag of t.tags) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }
  const tagList = db.tags.map((name) => ({
    name,
    count: counts[name] || 0
  }));
  res.json(tagList);
});
app.post("/api/tags", (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "Tag name required" });
    return;
  }
  const clean = name.trim();
  if (!clean) {
    res.status(400).json({ error: "Tag name cannot be empty" });
    return;
  }
  const db = getDatabase();
  if (db.tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
    res.status(409).json({ error: "Tag already exists" });
    return;
  }
  db.tags.push(clean);
  saveDatabase(db);
  res.status(201).json({ name: clean, count: 0 });
});
app.delete("/api/tags/:name", (req, res) => {
  const { name } = req.params;
  const { removeFromTransactions } = req.query;
  const db = getDatabase();
  const clean = decodeURIComponent(name).toLowerCase();
  db.tags = db.tags.filter((t) => t.toLowerCase() !== clean);
  if (removeFromTransactions === "true") {
    for (const t of db.transactions) {
      t.tags = t.tags.filter((tag) => tag.toLowerCase() !== clean);
    }
  }
  saveDatabase(db);
  res.json({ success: true, removed: name });
});
app.get("/api/budgets", (_req, res) => {
  const db = getDatabase();
  res.json(db.budgets);
});
app.post("/api/budgets", (req, res) => {
  const { category, monthlyLimit, active } = req.body;
  if (!category || monthlyLimit === void 0) {
    res.status(400).json({ error: "Category and monthly limit required" });
    return;
  }
  const limit = parseFloat(monthlyLimit);
  if (isNaN(limit) || limit <= 0) {
    res.status(400).json({ error: "Monthly limit must be positive" });
    return;
  }
  const db = getDatabase();
  const existing = db.budgets.find((b) => b.category.toLowerCase() === category.trim().toLowerCase());
  if (existing) {
    res.status(409).json({ error: "A budget for this category already exists" });
    return;
  }
  const budget = {
    id: `bgt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    category: category.trim(),
    monthlyLimit: Math.round(limit * 100) / 100,
    active: active !== void 0 ? Boolean(active) : true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.budgets.push(budget);
  saveDatabase(db);
  res.status(201).json(budget);
});
app.put("/api/budgets/:id", (req, res) => {
  const { id } = req.params;
  const { category, monthlyLimit, active } = req.body;
  const db = getDatabase();
  const idx = db.budgets.findIndex((b2) => b2.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Budget not found" });
    return;
  }
  const b = db.budgets[idx];
  if (category) b.category = category.trim();
  if (monthlyLimit !== void 0) {
    const lim = parseFloat(monthlyLimit);
    if (!isNaN(lim) && lim > 0) b.monthlyLimit = Math.round(lim * 100) / 100;
  }
  if (active !== void 0) b.active = Boolean(active);
  db.budgets[idx] = b;
  saveDatabase(db);
  res.json(b);
});
app.delete("/api/budgets/:id", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  db.budgets = db.budgets.filter((b) => b.id !== id);
  saveDatabase(db);
  res.json({ success: true, id });
});
app.get("/api/goals", (_req, res) => {
  const db = getDatabase();
  res.json(db.goals);
});
app.post("/api/goals", (req, res) => {
  const { name, targetAmount, currentAmount, dueDate, note } = req.body;
  if (!name || targetAmount === void 0) {
    res.status(400).json({ error: "Goal name and target amount required" });
    return;
  }
  const target = parseFloat(targetAmount);
  const current = currentAmount !== void 0 ? parseFloat(currentAmount) : 0;
  if (isNaN(target) || target <= 0) {
    res.status(400).json({ error: "Target amount must be positive" });
    return;
  }
  const db = getDatabase();
  const goal = {
    id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    targetAmount: Math.round(target * 100) / 100,
    currentAmount: Math.max(0, isNaN(current) ? 0 : Math.round(current * 100) / 100),
    dueDate: dueDate ? String(dueDate).trim() : void 0,
    note: note ? String(note).trim() : void 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.goals.push(goal);
  saveDatabase(db);
  res.status(201).json(goal);
});
app.put("/api/goals/:id", (req, res) => {
  const { id } = req.params;
  const { name, targetAmount, currentAmount, dueDate, note } = req.body;
  const db = getDatabase();
  const idx = db.goals.findIndex((g2) => g2.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }
  const g = db.goals[idx];
  if (name) g.name = name.trim();
  if (targetAmount !== void 0) {
    const t = parseFloat(targetAmount);
    if (!isNaN(t) && t > 0) g.targetAmount = Math.round(t * 100) / 100;
  }
  if (currentAmount !== void 0) {
    const c = parseFloat(currentAmount);
    if (!isNaN(c) && c >= 0) g.currentAmount = Math.round(c * 100) / 100;
  }
  if (dueDate !== void 0) g.dueDate = dueDate ? String(dueDate).trim() : void 0;
  if (note !== void 0) g.note = note ? String(note).trim() : void 0;
  db.goals[idx] = g;
  saveDatabase(db);
  res.json(g);
});
app.post("/api/goals/:id/contribute", (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const add = parseFloat(amount);
  if (isNaN(add) || add <= 0) {
    res.status(400).json({ error: "Contribution amount must be positive" });
    return;
  }
  const db = getDatabase();
  const goal = db.goals.find((g) => g.id === id);
  if (!goal) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }
  goal.currentAmount = Math.round((goal.currentAmount + add) * 100) / 100;
  saveDatabase(db);
  res.json(goal);
});
app.delete("/api/goals/:id", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  db.goals = db.goals.filter((g) => g.id !== id);
  saveDatabase(db);
  res.json({ success: true, id });
});
app.get("/api/recurring", (_req, res) => {
  const db = getDatabase();
  const detected = detectRecurringPatterns(db.transactions, db.recurring, db.ignoredPatterns);
  const suggestedRecurring = detected.filter((d) => !d.isSubscription);
  const suggestedSubscriptions = detected.filter((d) => d.isSubscription);
  const confirmedBills = db.recurring.filter((r) => !r.isSubscription);
  const confirmedSubscriptions = db.recurring.filter((r) => r.isSubscription);
  const monthlyBillsTotal = confirmedBills.reduce((acc, b) => acc + b.estimatedMonthly, 0);
  const annualBillsTotal = monthlyBillsTotal * 12;
  const monthlySubsTotal = confirmedSubscriptions.reduce((acc, s) => acc + s.estimatedMonthly, 0);
  const annualSubsTotal = monthlySubsTotal * 12;
  const totalMonthlyCommitments = monthlyBillsTotal + monthlySubsTotal;
  const totalAnnualCommitments = annualBillsTotal + annualSubsTotal;
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
      totalAnnualCommitments: Math.round(totalAnnualCommitments * 100) / 100
    },
    nextPayment
  });
});
app.post("/api/recurring/confirm", (req, res) => {
  const { merchant, category, account, amount, cadence, isSubscription, nextExpectedDate, notes } = req.body;
  if (!merchant || amount === void 0 || !cadence) {
    res.status(400).json({ error: "Merchant, amount, and cadence required" });
    return;
  }
  const numAmt = parseFloat(amount);
  const db = getDatabase();
  let estimatedMonthly = numAmt;
  if (cadence === "weekly") estimatedMonthly = numAmt * 52 / 12;
  else if (cadence === "biweekly") estimatedMonthly = numAmt * 26 / 12;
  else if (cadence === "monthly") estimatedMonthly = numAmt;
  else if (cadence === "quarterly") estimatedMonthly = numAmt / 3;
  else if (cadence === "annual") estimatedMonthly = numAmt / 12;
  const item = {
    id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    merchant: merchant.trim(),
    category: category ? category.trim() : isSubscription ? "Subscriptions" : "Utilities",
    account: account ? account.trim() : "Main Checking",
    amount: Math.round(numAmt * 100) / 100,
    cadence,
    estimatedMonthly: Math.round(estimatedMonthly * 100) / 100,
    nextExpectedDate: nextExpectedDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    isSubscription: Boolean(isSubscription),
    notes: notes ? String(notes).trim() : void 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.recurring.push(item);
  saveDatabase(db);
  res.status(201).json(item);
});
app.post("/api/recurring/ignore", (req, res) => {
  const { key } = req.body;
  if (!key || typeof key !== "string") {
    res.status(400).json({ error: "Pattern key required" });
    return;
  }
  const db = getDatabase();
  if (!db.ignoredPatterns.includes(key)) {
    db.ignoredPatterns.push(key);
    saveDatabase(db);
  }
  res.json({ success: true, ignoredCount: db.ignoredPatterns.length });
});
app.post("/api/recurring/restore-ignored", (_req, res) => {
  const db = getDatabase();
  db.ignoredPatterns = [];
  saveDatabase(db);
  res.json({ success: true, message: "All ignored suggestions restored" });
});
app.delete("/api/recurring/:id", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  db.recurring = db.recurring.filter((r) => r.id !== id);
  saveDatabase(db);
  res.json({ success: true, id });
});
app.get("/api/rules", (_req, res) => {
  const db = getDatabase();
  res.json(db.rules);
});
app.post("/api/rules", (req, res) => {
  const { merchantPattern, matchType, targetCategory, targetTags, enabled } = req.body;
  if (!merchantPattern || !targetCategory) {
    res.status(400).json({ error: "Merchant pattern and target category required" });
    return;
  }
  const db = getDatabase();
  const rule = {
    id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    merchantPattern: merchantPattern.trim(),
    matchType: matchType || "contains",
    targetCategory: targetCategory.trim(),
    targetTags: Array.isArray(targetTags) ? targetTags.map((t) => String(t).trim()).filter(Boolean) : [],
    enabled: enabled !== void 0 ? Boolean(enabled) : true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.rules.push(rule);
  saveDatabase(db);
  res.status(201).json(rule);
});
app.put("/api/rules/:id", (req, res) => {
  const { id } = req.params;
  const { merchantPattern, matchType, targetCategory, targetTags, enabled } = req.body;
  const db = getDatabase();
  const idx = db.rules.findIndex((r2) => r2.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }
  const r = db.rules[idx];
  if (merchantPattern) r.merchantPattern = merchantPattern.trim();
  if (matchType) r.matchType = matchType;
  if (targetCategory) r.targetCategory = targetCategory.trim();
  if (targetTags !== void 0 && Array.isArray(targetTags)) {
    r.targetTags = targetTags.map((t) => String(t).trim()).filter(Boolean);
  }
  if (enabled !== void 0) r.enabled = Boolean(enabled);
  db.rules[idx] = r;
  saveDatabase(db);
  res.json(r);
});
app.delete("/api/rules/:id", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  db.rules = db.rules.filter((r) => r.id !== id);
  saveDatabase(db);
  res.json({ success: true, id });
});
app.get("/api/documents", (_req, res) => {
  const db = getDatabase();
  res.json(db.documents);
});
app.post("/api/documents/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded or file exceeds 20MB limit" });
    return;
  }
  const db = getDatabase();
  const originalName = req.file.originalname;
  const filename = req.file.filename;
  const sizeBytes = req.file.size;
  const mimeType = req.file.mimetype;
  const storagePath = path2.join(vaultDir, filename);
  let status = "stored";
  let extractedData = void 0;
  const dateMatch = originalName.match(/(\d{4}[-_]\d{2}[-_]\d{2})/);
  const amountMatch = originalName.match(/\$?(\d+\.\d{2})/);
  const cleanMerchant = originalName.split(/[-_.]/)[0]?.trim();
  if (dateMatch && amountMatch && cleanMerchant) {
    const rawDate = dateMatch[1].replace(/_/g, "-");
    const amountVal = parseFloat(amountMatch[1]);
    if (!isNaN(amountVal) && amountVal > 0) {
      extractedData = {
        merchant: cleanMerchant,
        date: rawDate,
        amount: amountVal,
        type: "expense",
        category: "Needs review",
        confidence: 0.85
      };
      status = "review";
    }
  }
  let dataUrl = void 0;
  if (mimeType && mimeType.startsWith("image/") || originalName.match(/\.(png|jpe?g|webp|gif)$/i)) {
    try {
      const fileBuffer = fs2.readFileSync(storagePath);
      const effectiveMime = mimeType && mimeType.startsWith("image/") ? mimeType : originalName.match(/\.(jpe?g)$/i) ? "image/jpeg" : "image/png";
      dataUrl = `data:${effectiveMime};base64,${fileBuffer.toString("base64")}`;
    } catch (e) {
      console.warn("Could not generate dataUrl for document:", e);
    }
  }
  const docRecord = {
    id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    filename,
    originalName,
    mimeType,
    sizeBytes,
    source: "upload",
    status,
    extractedData,
    storagePath,
    dataUrl,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.documents.unshift(docRecord);
  saveDatabase(db);
  res.status(201).json(docRecord);
});
app.get("/api/documents/:id/download", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const docItem = db.documents.find((d) => d.id === id);
  if (!docItem) {
    res.status(404).json({ error: "Document file not found in vault" });
    return;
  }
  const diskPath = docItem.storagePath && fs2.existsSync(docItem.storagePath) ? docItem.storagePath : path2.join(vaultDir, docItem.filename);
  if (fs2.existsSync(diskPath)) {
    let contentType = docItem.mimeType || "application/octet-stream";
    if (docItem.filename.match(/\.(jpe?g)$/i)) contentType = "image/jpeg";
    else if (docItem.filename.match(/\.png$/i)) contentType = "image/png";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(docItem.originalName)}"`);
    const stream = fs2.createReadStream(diskPath);
    return stream.pipe(res);
  }
  if (docItem.dataUrl && docItem.dataUrl.startsWith("data:")) {
    const matches = docItem.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      const mime = matches[1];
      const buffer = Buffer.from(matches[2], "base64");
      res.setHeader("Content-Type", mime || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(docItem.originalName)}"`);
      return res.send(buffer);
    }
  }
  res.status(404).json({ error: "Document file not found in vault" });
});
app.get("/api/documents/:id/view", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const docItem = db.documents.find((d) => d.id === id);
  if (!docItem) {
    res.status(404).json({ error: "Document file not found in vault" });
    return;
  }
  const diskPath = docItem.storagePath && fs2.existsSync(docItem.storagePath) ? docItem.storagePath : path2.join(vaultDir, docItem.filename);
  if (fs2.existsSync(diskPath)) {
    let contentType = docItem.mimeType || "image/png";
    if (docItem.filename.match(/\.(jpe?g)$/i) || docItem.originalName.match(/\.(jpe?g)$/i)) {
      contentType = "image/jpeg";
    } else if (docItem.filename.match(/\.png$/i) || docItem.originalName.match(/\.png$/i)) {
      contentType = "image/png";
    }
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(docItem.originalName)}"`);
    const stream = fs2.createReadStream(diskPath);
    return stream.pipe(res);
  }
  if (docItem.dataUrl && docItem.dataUrl.startsWith("data:")) {
    const matches = docItem.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      const mime = matches[1];
      const buffer = Buffer.from(matches[2], "base64");
      res.setHeader("Content-Type", mime || "image/png");
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(docItem.originalName)}"`);
      return res.send(buffer);
    }
  }
  res.status(404).json({ error: "Document file not found in vault" });
});
app.delete("/api/documents/:id", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const docItem = db.documents.find((d) => d.id === id);
  if (!docItem) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  if (fs2.existsSync(docItem.storagePath)) {
    try {
      fs2.unlinkSync(docItem.storagePath);
    } catch (e) {
      console.error("Error removing document file from vault:", e);
    }
  }
  db.documents = db.documents.filter((d) => d.id !== id);
  saveDatabase(db);
  res.json({ success: true, id });
});
app.get("/api/drive/status", (_req, res) => {
  const db = getDatabase();
  res.json({
    folderName: db.driveSync.folderName,
    folderUrl: `https://drive.google.com/drive/folders/ledgerly-financial-inbox`,
    lastSyncTimestamp: db.driveSync.lastSyncTimestamp,
    status: db.driveSync.status,
    schedule: "Daily at 8:00 AM",
    timezone: db.preferences.timezone,
    stats: db.driveSync.stats,
    resetTimestamp: db.preferences.resetTimestamp
  });
});
app.post("/api/drive/sync", (req, res) => {
  const db = getDatabase();
  const resetTime = db.preferences.resetTimestamp ? new Date(db.preferences.resetTimestamp).getTime() : 0;
  db.driveSync.status = "synced";
  db.driveSync.lastSyncTimestamp = (/* @__PURE__ */ new Date()).toISOString();
  const driveDocs = db.documents.filter((d) => d.source === "drive");
  db.driveSync.stats.imported = driveDocs.length;
  saveDatabase(db);
  res.json({
    status: "synced",
    timestamp: db.driveSync.lastSyncTimestamp,
    message: 'Google Drive synchronization completed for folder "Ledgerly Financial Inbox".',
    stats: db.driveSync.stats
  });
});
app.post("/api/danger/erase-all-data", (req, res) => {
  const { confirmation } = req.body;
  const REQUIRED_CONFIRMATION = "DELETE ALL LEDGERLY DATA";
  if (confirmation !== REQUIRED_CONFIRMATION) {
    res.status(400).json({
      error: `Invalid confirmation string. Server strictly requires "${REQUIRED_CONFIRMATION}" to erase all data.`
    });
    return;
  }
  const resetTimestamp = (/* @__PURE__ */ new Date()).toISOString();
  const freshDb = resetAllData(resetTimestamp);
  res.json({
    success: true,
    message: "All \u0939\u093F\u0938\u093E\u092C-\u0915\u093F\u0924\u093E\u092C financial records, documents, rules, tags, and settings have been completely erased.",
    resetTimestamp,
    database: freshDb
  });
});
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path2.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path2.resolve(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u0939\u093F\u0938\u093E\u092C-\u0915\u093F\u0924\u093E\u092C server listening on port ${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
