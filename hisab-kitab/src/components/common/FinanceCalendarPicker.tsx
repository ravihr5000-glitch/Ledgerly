import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Check, Calendar, ArrowLeft } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  toISODateString,
  formatDisplayDate,
  formatMonthYearHeader,
  parseISODateString,
  normalizeDateString,
  MONTH_NAMES_SHORT,
  MONTH_NAMES_FULL,
} from '../../utils/dateFilter';

interface QuickFilterOption {
  key: string;
  label: string;
  periodValue: string;
}

const QUICK_FILTERS: QuickFilterOption[] = [
  { key: 'today', label: 'Today', periodValue: 'Today' },
  { key: 'this_month', label: 'This Month', periodValue: 'This Month' },
  { key: 'last_month', label: 'Last Month', periodValue: 'Last Month' },
  { key: '3_months', label: '3 Months', periodValue: 'Last 3 Months' },
  { key: '6_months', label: '6 Months', periodValue: 'Last 6 Months' },
  { key: 'this_year', label: 'This Year', periodValue: 'This Year' },
  { key: 'last_year', label: 'Last Year', periodValue: 'Last Year' },
  { key: 'all_time', label: 'All Time', periodValue: 'All Time' },
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface FinanceCalendarPickerProps {
  className?: string;
  align?: 'left' | 'right';
}

export const FinanceCalendarPicker: React.FC<FinanceCalendarPickerProps> = ({
  className = '',
  align = 'right',
}) => {
  const { selectedPeriod, setSelectedPeriod, resolvedPeriod, transactions, budgets } = useFinance();
  const [isOpen, setIsOpen] = useState(false);
  const [isPresetsDropdownOpen, setIsPresetsDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

  // Map of date string ('YYYY-MM-DD') -> count of income entries (Money In)
  // Displays a green dot below that date in the header calendar
  const incomeCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    if (!Array.isArray(transactions)) return map;

    for (const t of transactions) {
      if (!t || !t.date || t.type !== 'income') continue;
      const dateKey = normalizeDateString(String(t.date));
      if (dateKey) {
        map.set(dateKey, (map.get(dateKey) || 0) + 1);
      }
    }
    return map;
  }, [transactions]);

  // Map of date string ('YYYY-MM-DD') -> count of expense entries
  const expenseCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    if (!Array.isArray(transactions)) return map;

    for (const t of transactions) {
      if (!t || !t.date || t.type === 'income') continue;
      const dateKey = normalizeDateString(String(t.date));
      if (dateKey) {
        map.set(dateKey, (map.get(dateKey) || 0) + 1);
      }
    }
    return map;
  }, [transactions]);

  // Map of date string ('YYYY-MM-DD') -> count of transactions/entries
  // Updates automatically whenever entries are added, edited, or deleted
  const transactionCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    if (!Array.isArray(transactions)) return map;

    for (const t of transactions) {
      if (!t || !t.date) continue;
      const dateKey = normalizeDateString(String(t.date));
      if (dateKey) {
        map.set(dateKey, (map.get(dateKey) || 0) + 1);
      }
    }
    return map;
  }, [transactions]);

  // Set of dates ('YYYY-MM-DD') on which a budget was created / assigned
  const budgetDatesSet = useMemo(() => {
    const set = new Set<string>();
    if (!Array.isArray(budgets)) return set;

    for (const b of budgets) {
      if (!b) continue;
      const raw = b.date ? String(b.date) : (b.createdAt ? String(b.createdAt) : '');
      const dateKey = normalizeDateString(raw);
      if (dateKey) {
        set.add(dateKey);
      }
    }
    return set;
  }, [budgets]);

  // Calendar navigation state (which month/year is being viewed)
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (resolvedPeriod?.startDate) {
      return parseISODateString(resolvedPeriod.startDate);
    }
    return new Date();
  });

  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const presetsRef = useRef<HTMLDivElement>(null);

  // Sync viewDate when selectedPeriod changes
  useEffect(() => {
    if (resolvedPeriod?.startDate) {
      setViewDate(parseISODateString(resolvedPeriod.startDate));
    }
  }, [resolvedPeriod?.startDate]);

  // Close popover on outside click or Escape
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsPresetsDropdownOpen(false);
        setViewMode('days');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPresetsDropdownOpen) {
          setIsPresetsDropdownOpen(false);
        } else if (viewMode !== 'days') {
          setViewMode('days');
        } else {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handlePointerDown);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isPresetsDropdownOpen, viewMode]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    if (viewMode === 'days') {
      setViewDate(new Date(viewYear, viewMonth - 1, 1));
    } else if (viewMode === 'months') {
      setViewDate(new Date(viewYear - 1, viewMonth, 1));
    } else if (viewMode === 'years') {
      setViewDate(new Date(viewYear - 12, viewMonth, 1));
    }
  };

  const handleNextMonth = () => {
    if (viewMode === 'days') {
      setViewDate(new Date(viewYear, viewMonth + 1, 1));
    } else if (viewMode === 'months') {
      setViewDate(new Date(viewYear + 1, viewMonth, 1));
    } else if (viewMode === 'years') {
      setViewDate(new Date(viewYear + 12, viewMonth, 1));
    }
  };

  // Build grid days (35 or 42 cells)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isPrevMonth: boolean;
      isNextMonth: boolean;
    }> = [];

    // 1. Trailing days from previous month
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonthDate = new Date(viewYear, viewMonth - 1, d);
      cells.push({
        dateStr: toISODateString(prevMonthDate),
        dayNum: d,
        isCurrentMonth: false,
        isPrevMonth: true,
        isNextMonth: false,
      });
    }

    // 2. Days of current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const currentMonthDate = new Date(viewYear, viewMonth, d);
      cells.push({
        dateStr: toISODateString(currentMonthDate),
        dayNum: d,
        isCurrentMonth: true,
        isPrevMonth: false,
        isNextMonth: false,
      });
    }

    // 3. Leading days of next month (fill to 35 or 42 cells)
    const totalFilled = cells.length;
    const targetLength = totalFilled <= 35 ? 35 : 42;
    const remaining = targetLength - totalFilled;
    for (let d = 1; d <= remaining; d++) {
      const nextMonthDate = new Date(viewYear, viewMonth + 1, d);
      cells.push({
        dateStr: toISODateString(nextMonthDate),
        dayNum: d,
        isCurrentMonth: false,
        isPrevMonth: false,
        isNextMonth: true,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const handleSelectQuickFilter = async (opt: QuickFilterOption) => {
    await setSelectedPeriod(opt.periodValue);
    setIsPresetsDropdownOpen(false);
    setViewMode('days');
    setIsOpen(false);
  };

  const handleSelectDay = async (dateStr: string) => {
    // Select this specific day (e.g. "2026-10-02" -> displays "2 Oct 2026")
    await setSelectedPeriod(dateStr);
    setIsPresetsDropdownOpen(false);
    setViewMode('days');
    setIsOpen(false);
  };

  const handleSelectMonth = async (yr: number, mIdx: number) => {
    const formatted = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
    await setSelectedPeriod(formatted);
    setIsPresetsDropdownOpen(false);
    setViewMode('days');
    setIsOpen(false);
  };

  const handleSelectYear = async (yr: number) => {
    await setSelectedPeriod(String(yr));
    setIsPresetsDropdownOpen(false);
    setViewMode('days');
    setIsOpen(false);
  };

  // Determine active trigger label
  const triggerLabel = useMemo(() => {
    if (resolvedPeriod?.isSingleDay) {
      return formatDisplayDate(resolvedPeriod.startDate);
    }
    const matchedQuick = QUICK_FILTERS.find((q) => q.key === resolvedPeriod?.filterKey);
    if (matchedQuick) {
      return matchedQuick.label;
    }
    return resolvedPeriod?.label || selectedPeriod;
  }, [resolvedPeriod, selectedPeriod]);

  // Active label inside the presets dropdown button
  const activeQuickFilterLabel = useMemo(() => {
    const matched = QUICK_FILTERS.find((q) => q.key === resolvedPeriod?.filterKey);
    if (matched) return matched.label;
    if (resolvedPeriod?.isSingleDay) return formatDisplayDate(resolvedPeriod.startDate);
    return resolvedPeriod?.label || 'Custom';
  }, [resolvedPeriod]);

  const todayISO = toISODateString(new Date());

  // Count entries for months in viewYear
  const monthTransactionCounts = useMemo(() => {
    const counts = new Array(12).fill(0);
    if (!Array.isArray(transactions)) return counts;
    const yearPrefix = `${viewYear}-`;
    for (const t of transactions) {
      if (!t || !t.date) continue;
      const clean = normalizeDateString(String(t.date));
      if (clean.startsWith(yearPrefix)) {
        const monthNum = parseInt(clean.substring(5, 7), 10);
        if (monthNum >= 1 && monthNum <= 12) {
          counts[monthNum - 1] += 1;
        }
      }
    }
    return counts;
  }, [transactions, viewYear]);

  // Count income entries for months in viewYear
  const monthIncomeCounts = useMemo(() => {
    const counts = new Array(12).fill(0);
    if (!Array.isArray(transactions)) return counts;
    const yearPrefix = `${viewYear}-`;
    for (const t of transactions) {
      if (!t || !t.date || t.type !== 'income') continue;
      const clean = normalizeDateString(String(t.date));
      if (clean.startsWith(yearPrefix)) {
        const monthNum = parseInt(clean.substring(5, 7), 10);
        if (monthNum >= 1 && monthNum <= 12) {
          counts[monthNum - 1] += 1;
        }
      }
    }
    return counts;
  }, [transactions, viewYear]);

  // Generate 12-year window for year selector
  const yearStart = Math.floor(viewYear / 12) * 12;
  const yearsList = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => yearStart + i);
  }, [yearStart]);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Top Calendar Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setIsPresetsDropdownOpen(false);
          setViewMode('days');
        }}
        className="inline-flex items-center justify-between gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-100 bg-white dark:bg-[#070e24] hover:bg-slate-50 dark:hover:bg-[#111c3d] border border-slate-200 dark:border-indigo-500/40 hover:border-slate-300 dark:hover:border-indigo-400 rounded-xl transition-all shadow-xs dark:shadow-md cursor-pointer min-h-[38px] active:scale-98 select-none"
        title={`Current period: ${triggerLabel}. Tap to change date, month, year, or filter.`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="tracking-wide font-medium truncate max-w-[150px] sm:max-w-[180px] flex items-center gap-1.5">
          <span>{triggerLabel}</span>
          {resolvedPeriod?.isSingleDay && incomeCountByDate.get(resolvedPeriod.startDate) ? (
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-xs shadow-emerald-500/70 shrink-0 inline-block"
              title="Income recorded on this date"
            />
          ) : null}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-indigo-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Container */}
      {isOpen && (
        <>
          {/* Mobile backdrop to easily dismiss */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs sm:hidden z-40"
            onClick={() => {
              setIsOpen(false);
              setIsPresetsDropdownOpen(false);
              setViewMode('days');
            }}
            aria-hidden="true"
          />

          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Financial Calendar"
            className="fixed left-1/2 -translate-x-1/2 top-16 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:translate-x-0 sm:mt-2.5 z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Main Calendar Container */}
            <div className="bg-white dark:bg-[#070b19] border border-slate-200/90 dark:border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-xl dark:shadow-2xl shadow-slate-300/40 dark:shadow-black/85 text-slate-800 dark:text-slate-100 w-[308px] sm:w-[330px] flex flex-col select-none">
              {/* 1. Quick Presets Dropdown Selector */}
              <div ref={presetsRef} className="relative mb-3">
                <button
                  type="button"
                  onClick={() => setIsPresetsDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#091024] hover:bg-slate-100 dark:hover:bg-[#0f1938] border border-slate-200 dark:border-indigo-500/30 hover:border-slate-300 dark:hover:border-indigo-400 text-xs text-slate-800 dark:text-slate-100 transition shadow-xs cursor-pointer"
                  title="Select quick preset filter"
                  aria-expanded={isPresetsDropdownOpen}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] uppercase font-bold text-[#6558D3] dark:text-indigo-400 tracking-wider">
                      Filter:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {activeQuickFilterLabel}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 dark:text-indigo-400 transition-transform duration-200 shrink-0 ${
                      isPresetsDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Quick filters dropdown menu inside the calendar */}
                {isPresetsDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-white dark:bg-[#070b19] border border-slate-200 dark:border-indigo-500/40 rounded-xl p-1.5 shadow-xl dark:shadow-2xl flex flex-col gap-1 animate-in fade-in zoom-in-95 max-h-[260px] overflow-y-auto">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-[#6558D3] dark:text-indigo-400/80 uppercase tracking-wider border-b border-slate-100 dark:border-indigo-500/20 mb-0.5">
                      Presets & Quick Periods
                    </div>
                    {QUICK_FILTERS.map((opt) => {
                      const isActive = resolvedPeriod?.filterKey === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelectQuickFilter(opt)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                            isActive
                              ? 'bg-[#2563eb] text-white font-semibold shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-indigo-950/60'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isActive && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Month & Year Navigation Header with Mode Switcher */}
              <div className="flex items-center justify-between mb-2 px-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-indigo-950/60 transition cursor-pointer"
                  title="Previous"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
                </button>

                <div className="flex items-center gap-1.5">
                  {viewMode === 'days' ? (
                    <button
                      type="button"
                      onClick={() => setViewMode('months')}
                      className="px-2.5 py-1 rounded-lg text-sm sm:text-base font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-indigo-950/60 transition flex items-center gap-1.5 cursor-pointer"
                      title="Click to select month or switch to month picker"
                    >
                      <span>{formatMonthYearHeader(viewYear, viewMonth)}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-indigo-400" />
                    </button>
                  ) : viewMode === 'months' ? (
                    <button
                      type="button"
                      onClick={() => setViewMode('years')}
                      className="px-2.5 py-1 rounded-lg text-sm sm:text-base font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-indigo-950/60 transition flex items-center gap-1.5 cursor-pointer"
                      title="Click to select year or switch to year picker"
                    >
                      <span>{viewYear}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-indigo-400" />
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {yearStart} – {yearStart + 11}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-indigo-950/60 transition cursor-pointer"
                  title="Next"
                  aria-label="Next"
                >
                  <ChevronRight className="w-4 h-4 stroke-[2.2]" />
                </button>
              </div>

              {/* Quick Specific Month & Year Direct Selector Buttons */}
              <div className="grid grid-cols-2 gap-1.5 mb-3 px-0.5">
                <button
                  type="button"
                  onClick={() => handleSelectMonth(viewYear, viewMonth)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-[#6558D3] dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 transition-colors shadow-2xs cursor-pointer truncate"
                  title={`Select all transactions in ${formatMonthYearHeader(viewYear, viewMonth)}`}
                >
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span className="truncate">Select {MONTH_NAMES_SHORT[viewMonth]} {viewYear}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectYear(viewYear)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer truncate"
                  title={`Select all transactions in Year ${viewYear}`}
                >
                  <span className="truncate">Select Year {viewYear}</span>
                </button>
              </div>

              {/* View 1: Days Grid */}
              {viewMode === 'days' && (
                <>
                  {/* Day Headers (Sun - Sat) */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {WEEKDAY_NAMES.map((name) => (
                      <span
                        key={name}
                        className="text-[11px] font-medium text-slate-400 dark:text-indigo-300/70 py-1"
                      >
                        {name}
                      </span>
                    ))}
                  </div>

                  {/* Day Cells Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarCells.map((cell) => {
                      const isSelectedDay =
                        resolvedPeriod?.isSingleDay &&
                        resolvedPeriod.startDate === cell.dateStr;

                      const isInActiveRange =
                        !resolvedPeriod?.isSingleDay &&
                        cell.dateStr >= resolvedPeriod.startDate &&
                        cell.dateStr <= resolvedPeriod.endDate;

                      const isRangeBoundary =
                        !resolvedPeriod?.isSingleDay &&
                        (cell.dateStr === resolvedPeriod.startDate ||
                          cell.dateStr === resolvedPeriod.endDate);

                      const isTodayCell = cell.dateStr === todayISO;

                      // Income, Expense, and Budget indicators
                      const incomeCount = incomeCountByDate.get(cell.dateStr) || 0;
                      const expenseCount = expenseCountByDate.get(cell.dateStr) || 0;
                      const txCount = transactionCountByDate.get(cell.dateStr) || 0;
                      const hasIncome = incomeCount > 0;
                      const hasExpense = expenseCount > 0;
                      const hasTransactions = txCount > 0;
                      const hasBudget = budgetDatesSet.has(cell.dateStr);

                      let cellClasses =
                        'w-8 h-8 sm:w-9 sm:h-9 mx-auto rounded-full flex flex-col items-center justify-center text-xs transition-all cursor-pointer relative ';

                      if (isSelectedDay || isRangeBoundary) {
                        cellClasses +=
                          'bg-[#2563eb] text-white font-bold shadow-md shadow-blue-600/30 dark:shadow-blue-600/50 scale-105 z-10';
                      } else if (isInActiveRange) {
                        cellClasses +=
                          'bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-100 font-medium hover:bg-blue-100 dark:hover:bg-blue-600/35';
                      } else if (cell.isCurrentMonth) {
                        cellClasses +=
                          'text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-indigo-950/60 font-medium';
                        if (isTodayCell) {
                          cellClasses += ' ring-1 ring-blue-500/50 dark:ring-indigo-400/50';
                        }
                      } else {
                        cellClasses +=
                          'text-slate-300 dark:text-indigo-400/40 hover:text-slate-500 dark:hover:text-indigo-300/70 hover:bg-slate-50 dark:hover:bg-indigo-950/30';
                      }

                      const titleParts: string[] = [formatDisplayDate(cell.dateStr)];
                      if (hasIncome) titleParts.push(`${incomeCount} income (${incomeCount === 1 ? 'Money In' : 'entries'})`);
                      if (hasExpense) titleParts.push(`${expenseCount} expense`);
                      if (hasBudget) titleParts.push('Budget created');
                      const titleText = titleParts.join(' · ');

                      return (
                        <button
                          key={cell.dateStr}
                          type="button"
                          onClick={() => handleSelectDay(cell.dateStr)}
                          className={cellClasses}
                          title={titleText}
                          aria-label={`Select ${formatDisplayDate(cell.dateStr)}${hasIncome ? `, ${incomeCount} income recorded` : ''}${hasExpense ? `, ${expenseCount} expense entries` : ''}${hasBudget ? ', budget created' : ''}`}
                        >
                          <span className="leading-none -mt-0.5 select-none">{cell.dayNum}</span>

                          {/* Dots below calendar date: Green dot for Income (Money In), Blue dot for Expense, Yellow dot for Budget */}
                          {(hasIncome || hasExpense || hasBudget) && (
                            <div className="absolute bottom-0.5 flex items-center justify-center gap-0.5 pointer-events-none">
                              {/* Green dot for recorded income (Money In) */}
                              {hasIncome && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                                    isSelectedDay || isRangeBoundary
                                      ? 'bg-emerald-300 shadow-xs ring-0.5 ring-emerald-600/40'
                                      : 'bg-emerald-500 dark:bg-emerald-400 shadow-xs shadow-emerald-500/70 ring-0.5 ring-emerald-600/30'
                                  }`}
                                />
                              )}
                              {/* Blue dot for expense */}
                              {hasExpense && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                                    isSelectedDay || isRangeBoundary
                                      ? 'bg-white shadow-xs'
                                      : 'bg-[#3b82f6] shadow-xs shadow-blue-500/70'
                                  }`}
                                />
                              )}
                              {/* Yellow dot for budget */}
                              {hasBudget && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                                    isSelectedDay || isRangeBoundary
                                      ? 'bg-amber-200 shadow-xs'
                                      : 'bg-amber-400 dark:bg-amber-300 shadow-xs shadow-amber-500/80 ring-0.5 ring-amber-500/40'
                                  }`}
                                />
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* View 2: Months Grid */}
              {viewMode === 'months' && (
                <div className="py-1">
                  <div className="flex items-center justify-between mb-2 px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>Select a Month in {viewYear}:</span>
                    <button
                      type="button"
                      onClick={() => setViewMode('days')}
                      className="text-[#6558D3] dark:text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Back
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {MONTH_NAMES_SHORT.map((name, idx) => {
                      const count = monthTransactionCounts[idx];
                      const isCurrentM = viewMonth === idx;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleSelectMonth(viewYear, idx)}
                          className={`p-2 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                            isCurrentM
                              ? 'bg-[#2563eb] text-white font-bold shadow-md shadow-blue-500/30'
                              : 'bg-slate-50 dark:bg-[#0b132e] hover:bg-slate-100 dark:hover:bg-[#121c42] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-indigo-500/20'
                          }`}
                        >
                          <span className="text-xs font-bold">{name}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span
                              className={`text-[10px] ${
                                isCurrentM
                                  ? 'text-blue-100'
                                  : count > 0
                                  ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {count > 0 ? `${count} tx` : '-'}
                            </span>
                            {monthIncomeCounts[idx] > 0 && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-xs shrink-0"
                                title={`${monthIncomeCounts[idx]} income recorded in ${name}`}
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* View 3: Years Grid */}
              {viewMode === 'years' && (
                <div className="py-1">
                  <div className="flex items-center justify-between mb-2 px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>Select a Year:</span>
                    <button
                      type="button"
                      onClick={() => setViewMode('days')}
                      className="text-[#6558D3] dark:text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Back
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {yearsList.map((yr) => {
                      const isCurrentY = viewYear === yr;
                      return (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => handleSelectYear(yr)}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                            isCurrentY
                              ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/30'
                              : 'bg-slate-50 dark:bg-[#0b132e] hover:bg-slate-100 dark:hover:bg-[#121c42] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-indigo-500/20'
                          }`}
                        >
                          {yr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. Bottom Status / Indicator Hint */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-indigo-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1" title="Green dot: Income recorded (Money In)">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-xs shadow-emerald-500/70 ring-0.5 ring-emerald-600/30" />
                    <span>Green = Income</span>
                  </div>
                  <div className="flex items-center gap-1" title="Blue dot: Expense recorded">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] shadow-xs shadow-blue-500/60" />
                    <span>Blue = Expense</span>
                  </div>
                  <div className="flex items-center gap-1" title="Yellow dot: Budget created">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-xs shadow-amber-500/60 ring-0.5 ring-amber-500/40" />
                    <span>Yellow = Budget</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectQuickFilter(QUICK_FILTERS[0])}
                    className="text-[#6558D3] dark:text-indigo-400 hover:text-[#5749c4] dark:hover:text-indigo-300 font-semibold cursor-pointer transition-colors"
                  >
                    Today
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => handleSelectQuickFilter(QUICK_FILTERS[7])}
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold cursor-pointer transition-colors"
                  >
                    All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
