import { Transaction, RecurringItem, normalizeMerchant } from './db.js';

export interface DetectedPattern {
  key: string; // unique dismissed key: normalizedMerchant + "|" + cadence
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

const SUBSCRIPTION_HINTS = [
  'netflix', 'spotify', 'hulu', 'disney', 'youtube', 'icloud', 'dropbox',
  'adobe', 'microsoft', 'amazon prime', 'patreon', 'gym', 'openai', 'chatgpt',
  'canva', 'notion', 'zoom', 'slack', 'github', 'hbo', 'apple tv', 'apple music',
  'audible', 'nytimes', 'wsj', 'playstation', 'xbox', 'nintendo'
];

const RECURRING_BILL_HINTS = [
  'rent', 'mortgage', 'loan', 'insurance', 'utilities', 'electric', 'water',
  'internet', 'phone', 'daycare', 'tuition', 'lease', 'car payment', 'hoa',
  'property tax', 'gas bill', 'trash', 'sewer', 'wifi', 'broadband', 'geico',
  'state farm', 'allstate', 'progressive', 'verizon', 'at&t', 't-mobile'
];

const DISQUALIFIED_CATEGORIES = ['groceries', 'shopping', 'supermarket'];

export function detectRecurringPatterns(
  transactions: Transaction[],
  confirmedItems: RecurringItem[],
  ignoredKeys: string[]
): DetectedPattern[] {
  // Only evaluate expense transactions
  const expenses = transactions.filter(t => t.type === 'expense');

  // Group by normalized merchant
  const grouped = new Map<string, Transaction[]>();
  for (const t of expenses) {
    const norm = normalizeMerchant(t.merchant);
    if (!norm) continue;
    if (!grouped.has(norm)) {
      grouped.set(norm, []);
    }
    grouped.get(norm)!.push(t);
  }

  const results: DetectedPattern[] = [];
  const confirmedNormalized = new Set(confirmedItems.map(c => normalizeMerchant(c.merchant)));
  const ignoredSet = new Set(ignoredKeys);

  for (const [normMerchant, txs] of grouped.entries()) {
    // Check if already confirmed
    if (confirmedNormalized.has(normMerchant)) {
      continue;
    }

    // Sort uniquely by date
    const uniqueDateTxs = new Map<string, Transaction>();
    for (const t of txs) {
      // Pick representative tx per unique date
      if (!uniqueDateTxs.has(t.date)) {
        uniqueDateTxs.set(t.date, t);
      }
    }

    const sortedTxs = Array.from(uniqueDateTxs.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Require at least 2 unique transaction dates
    if (sortedTxs.length < 2) {
      continue;
    }

    // Check disqualified categories (groceries / shopping)
    const primaryCategory = sortedTxs[sortedTxs.length - 1].category.toLowerCase();
    if (DISQUALIFIED_CATEGORIES.some(cat => primaryCategory.includes(cat))) {
      continue;
    }

    // Compute intervals in days
    const intervals: number[] = [];
    for (let i = 1; i < sortedTxs.length; i++) {
      const prev = new Date(sortedTxs[i - 1].date).getTime();
      const curr = new Date(sortedTxs[i].date).getTime();
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      intervals.push(diffDays);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Supported cadence windows
    let cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | null = null;
    if (avgInterval >= 5 && avgInterval <= 9) {
      cadence = 'weekly';
    } else if (avgInterval >= 12 && avgInterval <= 17) {
      cadence = 'biweekly';
    } else if (avgInterval >= 24 && avgInterval <= 40) {
      cadence = 'monthly';
    } else if (avgInterval >= 75 && avgInterval <= 110) {
      cadence = 'quarterly';
    } else if (avgInterval >= 330 && avgInterval <= 400) {
      cadence = 'annual';
    }

    if (!cadence) {
      continue; // Reject patterns that do not fit a supported interval
    }

    // Check Hints
    const isSubHint = SUBSCRIPTION_HINTS.some(h => normMerchant.includes(h) || primaryCategory.includes('subscription'));
    const isBillHint = RECURRING_BILL_HINTS.some(h => normMerchant.includes(h) || primaryCategory.includes('utilities') || primaryCategory.includes('housing') || primaryCategory.includes('insurance'));
    const hasStrongHint = isSubHint || isBillHint;

    // Amounts
    const amounts = sortedTxs.map(t => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);
    const amountVariationPercent = avgAmount > 0 ? ((maxAmount - minAmount) / avgAmount) * 100 : 0;

    // Subscription candidate: max 20% variation. Other: max 35% variation
    const isSub = isSubHint || primaryCategory.includes('subscription');
    const maxAllowedVariation = isSub ? 20 : 35;

    if (amountVariationPercent > maxAllowedVariation) {
      continue;
    }

    // Without a strong merchant or category hint:
    // Suggest a pattern ONLY after at least 3 stable monthly, quarterly, or annual occurrences with no more than 3% amount variation
    if (!hasStrongHint) {
      if (sortedTxs.length < 3) {
        continue;
      }
      if (cadence === 'weekly' || cadence === 'biweekly') {
        continue; // Disallow routine weekly shopping without hints
      }
      if (amountVariationPercent > 3) {
        continue;
      }
    }

    // Interval jitter
    let maxJitter = 0;
    for (const intv of intervals) {
      const jitter = Math.abs(intv - avgInterval);
      if (jitter > maxJitter) maxJitter = jitter;
    }

    // High confidence requires:
    // >= 3 occurrences, amount variation <= 12%, interval jitter <= 5 days
    let confidence: 'High' | 'Likely' = 'Likely';
    if (sortedTxs.length >= 3 && amountVariationPercent <= 12 && maxJitter <= 5) {
      confidence = 'High';
    }

    // Calculate monthly equivalent
    let estimatedMonthly = avgAmount;
    if (cadence === 'weekly') {
      estimatedMonthly = (avgAmount * 52) / 12;
    } else if (cadence === 'biweekly') {
      estimatedMonthly = (avgAmount * 26) / 12;
    } else if (cadence === 'monthly') {
      estimatedMonthly = avgAmount;
    } else if (cadence === 'quarterly') {
      estimatedMonthly = avgAmount / 3;
    } else if (cadence === 'annual') {
      estimatedMonthly = avgAmount / 12;
    }

    // Calendar-aware next date
    const lastDate = new Date(sortedTxs[sortedTxs.length - 1].date);
    const nextDate = new Date(lastDate);
    if (cadence === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (cadence === 'biweekly') {
      nextDate.setDate(nextDate.getDate() + 14);
    } else if (cadence === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (cadence === 'quarterly') {
      nextDate.setMonth(nextDate.getMonth() + 3);
    } else if (cadence === 'annual') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }

    const nextDateStr = nextDate.toISOString().split('T')[0];
    const key = `${normMerchant}|${cadence}`;

    // Skip if ignored
    if (ignoredSet.has(key)) {
      continue;
    }

    const latestTx = sortedTxs[sortedTxs.length - 1];

    results.push({
      key,
      merchant: latestTx.merchant,
      normalizedMerchant: normMerchant,
      category: latestTx.category,
      account: latestTx.account || latestTx.paymentMode || 'Bank Transfer',
      averageAmount: Math.round(avgAmount * 100) / 100,
      cadence,
      estimatedMonthly: Math.round(estimatedMonthly * 100) / 100,
      nextExpectedDate: nextDateStr,
      occurrences: sortedTxs.length,
      confidence,
      isSubscription: isSub,
      dates: sortedTxs.map(t => t.date),
    });
  }

  return results;
}
