import { Transaction } from '../types/finance';

export interface ResolvedPeriod {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  label: string; // Display label, e.g. '2 Oct 2026' or 'This Month'
  filterKey: 'today' | 'this_month' | 'last_month' | '3_months' | '6_months' | 'this_year' | 'last_year' | 'custom_day' | 'custom_range' | 'all_time';
  isSingleDay: boolean;
}

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODateString(str: string): Date {
  const parts = str.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(str);
}

export function normalizeDateString(str: string): string {
  if (!str) return '';
  const trimmed = str.trim();
  // 1. YYYY-MM-DD or YYYY/MM/DD
  const matchYMD = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (matchYMD) {
    const y = matchYMD[1];
    const m = matchYMD[2].padStart(2, '0');
    const d = matchYMD[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // 2. DD-MM-YYYY or DD/MM/YYYY
  const matchDMY = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (matchDMY) {
    const d = matchDMY[1].padStart(2, '0');
    const m = matchDMY[2].padStart(2, '0');
    const y = matchDMY[3];
    return `${y}-${m}-${d}`;
  }
  return trimmed.slice(0, 10);
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const clean = normalizeDateString(dateStr);
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    return `${d} ${MONTH_NAMES_SHORT[m - 1] || ''} ${y}`;
  }
  return dateStr;
}

export function formatMonthYearHeader(year: number, monthIndex: number): string {
  return `${MONTH_NAMES_FULL[monthIndex]} ${year}`;
}

/**
 * Exclude transfers between the owner's own accounts from income and expenses to prevent double-counting.
 */
export function isInternalTransfer(t: Transaction | null | undefined): boolean {
  if (!t) return false;

  if ((t as any).type === 'transfer') {
    return true;
  }

  const cat = (t.category || '').toLowerCase().trim();
  if (
    cat === 'transfer' ||
    cat === 'transfers' ||
    cat === 'account transfer' ||
    cat === 'self transfer' ||
    cat === 'internal transfer' ||
    cat === 'own account transfer' ||
    cat.includes('self transfer') ||
    cat.includes('internal transfer')
  ) {
    return true;
  }

  if (Array.isArray(t.tags)) {
    if (
      t.tags.some((tag) => {
        const lower = tag.toLowerCase().trim();
        return (
          lower === 'transfer' ||
          lower === 'self-transfer' ||
          lower === 'internal' ||
          lower === 'internal-transfer' ||
          lower === 'account-transfer'
        );
      })
    ) {
      return true;
    }
  }

  const merchant = (t.merchant || '').toLowerCase().trim();
  if (
    merchant.startsWith('self transfer') ||
    merchant.startsWith('transfer to self') ||
    merchant.startsWith('transfer between') ||
    merchant.startsWith('account transfer') ||
    merchant === 'internal transfer' ||
    merchant === 'self transfer' ||
    merchant.includes('own account') ||
    merchant.includes('to own account') ||
    merchant.includes('transfer to savings') ||
    merchant.includes('transfer to checking')
  ) {
    return true;
  }

  return false;
}

/**
 * Resolves any period string (quick filter, single day, specific month, specific year, or custom range)
 * into standard startDate, endDate, display label, and filterKey.
 */
export function resolvePeriodRange(periodInput?: string): ResolvedPeriod {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayISO = toISODateString(now);

  const clean = (periodInput || 'Today').trim();
  const lower = clean.toLowerCase();

  // 1. Single day match: YYYY-MM-DD
  const normalizedDay = normalizeDateString(clean);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedDay)) {
    const isToday = normalizedDay === todayISO;
    const label = formatDisplayDate(normalizedDay);
    return {
      startDate: normalizedDay,
      endDate: normalizedDay,
      label,
      filterKey: isToday ? 'today' : 'custom_day',
      isSingleDay: true,
    };
  }

  // 2. Custom date range: YYYY-MM-DD:YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [start, end] = clean.split(':');
    return {
      startDate: start,
      endDate: end,
      label: `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`,
      filterKey: 'custom_range',
      isSingleDay: start === end,
    };
  }

  // 3. Specific Month: YYYY-MM or YYYY/MM (e.g. "2026-10", "2026-09")
  const yyyyMmMatch = clean.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yyyyMmMatch) {
    const yr = parseInt(yyyyMmMatch[1], 10);
    const mIdx = parseInt(yyyyMmMatch[2], 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      const start = toISODateString(new Date(yr, mIdx, 1));
      const end = toISODateString(new Date(yr, mIdx + 1, 0));
      const isCurrentMonth = yr === currentYear && mIdx === currentMonth;
      const isLastMonth =
        currentMonth === 0
          ? yr === currentYear - 1 && mIdx === 11
          : yr === currentYear && mIdx === currentMonth - 1;
      return {
        startDate: start,
        endDate: end,
        label: formatMonthYearHeader(yr, mIdx),
        filterKey: isCurrentMonth ? 'this_month' : isLastMonth ? 'last_month' : 'custom_range',
        isSingleDay: false,
      };
    }
  }

  // 4. Specific Month by Name: "October 2026", "Oct 2026", "March 2025"
  const monthNameMatch = clean.match(/^([a-zA-Z]+)[,\s-]+(\d{4})$/);
  if (monthNameMatch) {
    const nameStr = monthNameMatch[1].toLowerCase();
    const yr = parseInt(monthNameMatch[2], 10);
    const idxFull = MONTH_NAMES_FULL.findIndex((m) => m.toLowerCase() === nameStr);
    const idxShort = MONTH_NAMES_SHORT.findIndex((m) => m.toLowerCase() === nameStr);
    const mIdx = idxFull !== -1 ? idxFull : idxShort;
    if (mIdx !== -1) {
      const start = toISODateString(new Date(yr, mIdx, 1));
      const end = toISODateString(new Date(yr, mIdx + 1, 0));
      const isCurrentMonth = yr === currentYear && mIdx === currentMonth;
      const isLastMonth =
        currentMonth === 0
          ? yr === currentYear - 1 && mIdx === 11
          : yr === currentYear && mIdx === currentMonth - 1;
      return {
        startDate: start,
        endDate: end,
        label: formatMonthYearHeader(yr, mIdx),
        filterKey: isCurrentMonth ? 'this_month' : isLastMonth ? 'last_month' : 'custom_range',
        isSingleDay: false,
      };
    }
  }

  // 5. Specific Year: "2026", "2025", "Year 2026"
  const yearMatch = clean.match(/^(?:year\s+)?(\d{4})$/i);
  if (yearMatch) {
    const yr = parseInt(yearMatch[1], 10);
    if (yr >= 1970 && yr <= 2100) {
      const start = `${yr}-01-01`;
      const end = `${yr}-12-31`;
      const isCurrentYear = yr === currentYear;
      const isPrevYear = yr === currentYear - 1;
      return {
        startDate: start,
        endDate: end,
        label: `Year ${yr}`,
        filterKey: isCurrentYear ? 'this_year' : isPrevYear ? 'last_year' : 'custom_range',
        isSingleDay: false,
      };
    }
  }

  // 6. Today
  if (lower === 'today') {
    return {
      startDate: todayISO,
      endDate: todayISO,
      label: 'Today',
      filterKey: 'today',
      isSingleDay: true,
    };
  }

  // 7. This Month
  if (lower === 'this month' || lower === 'this_month') {
    const start = toISODateString(new Date(currentYear, currentMonth, 1));
    const end = toISODateString(new Date(currentYear, currentMonth + 1, 0));
    return {
      startDate: start,
      endDate: end,
      label: 'This Month',
      filterKey: 'this_month',
      isSingleDay: false,
    };
  }

  // 8. Last Month
  if (lower === 'last month' || lower === 'last_month') {
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
    const start = toISODateString(new Date(lastMonthYear, lastMonthIndex, 1));
    const end = toISODateString(new Date(lastMonthYear, lastMonthIndex + 1, 0));
    return {
      startDate: start,
      endDate: end,
      label: 'Last Month',
      filterKey: 'last_month',
      isSingleDay: false,
    };
  }

  // 9. Last 3 Months / 3 Months
  if (lower === 'last 3 months' || lower === '3 months' || lower === '3_months') {
    const start = toISODateString(new Date(currentYear, currentMonth - 2, 1));
    const end = toISODateString(new Date(currentYear, currentMonth + 1, 0));
    return {
      startDate: start,
      endDate: end,
      label: '3 Months',
      filterKey: '3_months',
      isSingleDay: false,
    };
  }

  // 10. Last 6 Months / 6 Months
  if (lower === 'last 6 months' || lower === '6 months' || lower === '6_months') {
    const start = toISODateString(new Date(currentYear, currentMonth - 5, 1));
    const end = toISODateString(new Date(currentYear, currentMonth + 1, 0));
    return {
      startDate: start,
      endDate: end,
      label: '6 Months',
      filterKey: '6_months',
      isSingleDay: false,
    };
  }

  // 11. This Year
  if (lower === 'this year' || lower === 'this_year') {
    const start = `${currentYear}-01-01`;
    const end = `${currentYear}-12-31`;
    return {
      startDate: start,
      endDate: end,
      label: 'This Year',
      filterKey: 'this_year',
      isSingleDay: false,
    };
  }

  // 12. Last Year
  if (lower === 'last year' || lower === 'last_year') {
    const prevYear = currentYear - 1;
    const start = `${prevYear}-01-01`;
    const end = `${prevYear}-12-31`;
    return {
      startDate: start,
      endDate: end,
      label: 'Last Year',
      filterKey: 'last_year',
      isSingleDay: false,
    };
  }

  // 13. All Time
  if (lower === 'all time' || lower === 'all_time' || lower === 'all') {
    return {
      startDate: '1970-01-01',
      endDate: '2099-12-31',
      label: 'All time',
      filterKey: 'all_time',
      isSingleDay: false,
    };
  }

  // Fallback to This Month
  const fallbackStart = toISODateString(new Date(currentYear, currentMonth, 1));
  const fallbackEnd = toISODateString(new Date(currentYear, currentMonth + 1, 0));
  return {
    startDate: fallbackStart,
    endDate: fallbackEnd,
    label: clean,
    filterKey: 'this_month',
    isSingleDay: false,
  };
}

/**
 * Check if a transaction date string falls inside the resolved period
 */
export function isDateInPeriodString(dateStr: string, periodInput?: string): boolean {
  if (!dateStr) return false;
  const { startDate, endDate } = resolvePeriodRange(periodInput);
  const cleanTxDate = normalizeDateString(dateStr);
  return cleanTxDate >= startDate && cleanTxDate <= endDate;
}
