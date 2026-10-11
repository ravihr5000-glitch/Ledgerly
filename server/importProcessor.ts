import { Transaction, CategorizationRule, generateFingerprint, Budget } from './db.js';

export interface CSVParseResult {
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
  detectedMapping?: ColumnMapping;
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

export interface ImportSummary {
  transactionsInserted: number;
  duplicatesSkipped: number;
  rowsSkipped: number;
  itemsNeedingReview: number;
  insertedIds: string[];
  assignedBudget?: string;
}

export function parseCSVLines(csvContent: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvContent
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse header
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
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
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    for (let h = 0; h < headers.length; h++) {
      row[headers[h]] = values[h] || '';
    }
    rows.push(row);
  }

  return { headers, rows };
}

export function autoDetectMapping(headers: string[]): ColumnMapping | undefined {
  const lower = headers.map(h => h.toLowerCase().trim());

  const findCol = (candidates: string[]): string | undefined => {
    for (const c of candidates) {
      const idx = lower.findIndex(h => h === c || h.includes(c));
      if (idx !== -1) return headers[idx];
    }
    return undefined;
  };

  const dateCol = findCol(['date', 'posted date', 'transaction date', 'trans date', 'time']);
  const merchantCol = findCol(['merchant', 'description', 'payee', 'name', 'details', 'memo', 'narration', 'particulars']);
  const amountCol = findCol(['amount', 'total', 'transaction amount', 'net amount', 'spent', 'debit', 'credit', 'balance']);
  const categoryCol = findCol(['category', 'type', 'classification']);
  const accountCol = findCol(['account', 'card', 'bank', 'mode', 'payment mode']);
  const budgetCol = findCol(['budget', 'budget name', 'budget plan', 'allocated budget']);

  if (!dateCol && !merchantCol && !amountCol) {
    return undefined;
  }

  return {
    dateCol: dateCol || headers[0] || '',
    merchantCol: merchantCol || headers[1] || '',
    amountCol: amountCol || headers[2] || '',
    categoryCol,
    accountCol,
    budgetCol,
  };
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

export function normalizeDate(rawDate: string): string | null {
  if (!rawDate) return null;
  const clean = rawDate.trim();
  if (!clean || clean === '-' || clean === 'N/A' || clean === 'null') return null;

  // 1. YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // 2. YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = ymdMatch[2].padStart(2, '0');
    const dd = ymdMatch[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const expandYear = (yrStr: string): string => {
    if (yrStr.length === 4) return yrStr;
    const n = parseInt(yrStr, 10);
    return n < 70 ? `20${yrStr.padStart(2, '0')}` : `19${yrStr.padStart(2, '0')}`;
  };

  // 3. Textual month format: "25 Sept 26", "25 Sept 2026", "25-Sep-2026", "25-Sep-26", "25 September 2026"
  const textMonthMatch1 = clean.match(/^(\d{1,2})[\s\-/.]([a-zA-Z]{3,9})[\s\-/.](\d{2,4})$/);
  if (textMonthMatch1) {
    const dd = textMonthMatch1[1].padStart(2, '0');
    const monKey = textMonthMatch1[2].toLowerCase();
    const mm = MONTH_MAP[monKey];
    const yyyy = expandYear(textMonthMatch1[3]);
    if (mm) {
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // 4. Textual month format: "Sept 25, 2026", "September 25 2026", "Sep 25, 26"
  const textMonthMatch2 = clean.match(/^([a-zA-Z]{3,9})[\s\-/.],?\s*(\d{1,2}),?\s*(\d{2,4})$/);
  if (textMonthMatch2) {
    const monKey = textMonthMatch2[1].toLowerCase();
    const mm = MONTH_MAP[monKey];
    const dd = textMonthMatch2[2].padStart(2, '0');
    const yyyy = expandYear(textMonthMatch2[3]);
    if (mm) {
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // 5. Separated by slash, dash, dot: DD/MM/YYYY or MM/DD/YYYY, with 2 or 4 digit years
  const numDateMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (numDateMatch) {
    const p1 = parseInt(numDateMatch[1], 10);
    const p2 = parseInt(numDateMatch[2], 10);
    const yyyy = expandYear(numDateMatch[3]);

    let mm: string;
    let dd: string;

    if (p1 > 12) {
      // First part > 12 must be day: DD/MM/YYYY
      dd = String(p1).padStart(2, '0');
      mm = String(Math.min(12, p2)).padStart(2, '0');
    } else if (p2 > 12) {
      // Second part > 12 must be day: MM/DD/YYYY
      mm = String(p1).padStart(2, '0');
      dd = String(p2).padStart(2, '0');
    } else {
      // Standard convention in Indian and international statements is DD/MM/YYYY
      dd = String(p1).padStart(2, '0');
      mm = String(p2).padStart(2, '0');
    }

    return `${yyyy}-${mm}-${dd}`;
  }

  // 6. Native Date parsing fallback
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const effectiveYear = y < 1970 && y > 1900 ? y + 100 : y;
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${effectiveYear}-${m}-${day}`;
  }

  return null;
}

export function applyRules(
  merchant: string,
  category: string,
  tags: string[],
  rules: CategorizationRule[]
): { category: string; tags: string[] } {
  let updatedCategory = category;
  const updatedTags = new Set(tags);

  const normMerchant = merchant.toLowerCase();

  for (const rule of rules) {
    if (!rule.enabled) continue;
    const pattern = rule.merchantPattern.toLowerCase().trim();
    let matches = false;

    if (rule.matchType === 'exact') {
      matches = normMerchant === pattern;
    } else if (rule.matchType === 'starts_with') {
      matches = normMerchant.startsWith(pattern);
    } else {
      // contains
      matches = normMerchant.includes(pattern);
    }

    if (matches) {
      if (rule.targetCategory) {
        updatedCategory = rule.targetCategory;
      }
      if (rule.targetTags && rule.targetTags.length > 0) {
        rule.targetTags.forEach(t => updatedTags.add(t));
      }
    }
  }

  return {
    category: updatedCategory,
    tags: Array.from(updatedTags),
  };
}

export function processRowsForImport(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  existingTransactions: Transaction[],
  rules: CategorizationRule[],
  availableCategories: string[],
  defaultAccount: string,
  targetModeId: string = 'business',
  defaultCategory: string = 'Expense',
  defaultBudgetId?: string,
  budgets: Budget[] = []
): { summary: ImportSummary; newTransactions: Transaction[] } {
  const existingFingerprints = new Set(existingTransactions.map(t => t.fingerprint));
  const batchFingerprints = new Set<string>();
  const newTransactions: Transaction[] = [];

  let insertedCount = 0;
  let dupCount = 0;
  let skippedCount = 0;
  let reviewCount = 0;
  const insertedIds: string[] = [];

  // Determine assigned budget name for summary report
  const selectedBudgetObj = defaultBudgetId
    ? budgets.find(b => b.id === defaultBudgetId)
    : undefined;
  const assignedBudgetName = selectedBudgetObj
    ? (selectedBudgetObj.name || selectedBudgetObj.category)
    : undefined;

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
    if (!cleanMerchant || cleanMerchant === '-' || cleanMerchant === 'N/A') {
      skippedCount++;
      continue;
    }

    // Determine amount and type
    let amount = 0;
    let type: 'expense' | 'income' = 'expense';

    // 1. Primary: Single Amount column
    if (mapping.amountCol && row[mapping.amountCol] && row[mapping.amountCol].trim() !== '') {
      const rawAmt = row[mapping.amountCol].trim();
      if (rawAmt === '-' || rawAmt === 'N/A') {
        skippedCount++;
        continue;
      }
      const num = parseFloat(rawAmt.replace(/[^0-9.-]+/g, ''));
      if (isNaN(num) || num === 0) {
        skippedCount++;
        continue;
      }

      amount = Math.abs(num);

      // Check explicit credit indicators (CR suffix/prefix, '+', 'credit')
      const isExplicitCredit = /(cr\b|credit|\+)/i.test(rawAmt);
      // Check explicit debit indicators (DR suffix/prefix, '-', 'debit', parenthesized)
      const isExplicitDebit = /(dr\b|debit|-|\()/i.test(rawAmt) || num < 0;

      if (isExplicitCredit) {
        type = 'income';
      } else if (isExplicitDebit) {
        type = 'expense';
      } else {
        // If neither, check if assigned category or merchant indicates income
        const isIncomeCat = /(revenue|salary|income|deposit|payroll|dividend|sales)/i.test(defaultCategory);
        const isDepositWord = /(payroll|deposit|salary|refund|interest|dividend|direct dep|transfer in)/i.test(cleanMerchant);
        type = (isIncomeCat || isDepositWord) ? 'income' : 'expense';
      }
    } else if (mapping.debitCol && row[mapping.debitCol] && row[mapping.debitCol].trim() !== '') {
      const val = parseFloat(row[mapping.debitCol].replace(/[^0-9.-]+/g, ''));
      if (!isNaN(val) && val > 0) {
        amount = val;
        type = 'expense';
      }
    } else if (mapping.creditCol && row[mapping.creditCol] && row[mapping.creditCol].trim() !== '') {
      const val = parseFloat(row[mapping.creditCol].replace(/[^0-9.-]+/g, ''));
      if (!isNaN(val) && val > 0) {
        amount = val;
        type = 'income';
      }
    }

    if (amount <= 0) {
      skippedCount++;
      continue;
    }

    const account = mapping.accountCol && row[mapping.accountCol]
      ? row[mapping.accountCol].trim()
      : defaultAccount;

    // Duplicate check against existing stored records
    const baseFingerprint = generateFingerprint(normDate, cleanMerchant, amount, account);
    if (existingFingerprints.has(baseFingerprint)) {
      dupCount++;
      continue;
    }

    // Within current CSV batch, handle multiple identical legitimate transactions
    let fingerprint = baseFingerprint;
    let seq = 1;
    while (batchFingerprints.has(fingerprint)) {
      fingerprint = `${baseFingerprint}_dup${seq++}`;
    }
    batchFingerprints.add(fingerprint);

    // Resolve category: prioritize user selected defaultCategory, then row column, then 'Expense'
    let category = defaultCategory && defaultCategory !== '__auto__'
      ? defaultCategory.trim()
      : (mapping.categoryCol && row[mapping.categoryCol] ? row[mapping.categoryCol].trim() : 'Expense');

    // Match against known categories (case-insensitive)
    const matchedCategory = availableCategories.find(c => c.toLowerCase() === category.toLowerCase());
    if (matchedCategory) {
      category = matchedCategory;
    } else if (!category || category === '__auto__') {
      category = 'Expense';
    }

    // Apply categorization rules if matched
    const rulesApplied = applyRules(cleanMerchant, category, [], rules);
    category = rulesApplied.category;
    const tags = rulesApplied.tags;

    if (category === 'Needs review') {
      reviewCount++;
    }

    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const paymentMode = (account && ['UPI', 'Bank Transfer', 'Cash'].includes(account))
      ? account
      : (defaultAccount || 'Bank Transfer');

    // Resolve budget assignment:
    let rowBudgetId: string | undefined = undefined;
    if (mapping.budgetCol && row[mapping.budgetCol] && row[mapping.budgetCol].trim()) {
      const budgetVal = row[mapping.budgetCol].trim().toLowerCase();
      const matchedB = budgets.find(
        (b) =>
          b.id.toLowerCase() === budgetVal ||
          (b.name && b.name.toLowerCase() === budgetVal) ||
          b.category.toLowerCase() === budgetVal
      );
      if (matchedB) {
        rowBudgetId = matchedB.id;
      }
    } else if (defaultBudgetId && defaultBudgetId.trim() !== '') {
      rowBudgetId = defaultBudgetId.trim();
    } else if (budgets && budgets.length > 0) {
      // Auto-match if budget category matches
      const matchedB = budgets.find(
        (b) => b.category.toLowerCase().trim() === category.toLowerCase().trim()
      );
      if (matchedB) {
        rowBudgetId = matchedB.id;
      }
    }

    const transaction: Transaction = {
      id,
      date: normDate,
      merchant: cleanMerchant,
      category,
      paymentMode,
      account: paymentMode,
      modeId: targetModeId || 'business',
      tags,
      amount: Math.round(amount * 100) / 100,
      type,
      receiptAttached: false,
      fingerprint,
      source: 'csv',
      createdAt: new Date().toISOString(),
      ...(rowBudgetId ? { budgetId: rowBudgetId } : {}),
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
      insertedIds,
      assignedBudget: assignedBudgetName,
    },
    newTransactions,
  };
}
