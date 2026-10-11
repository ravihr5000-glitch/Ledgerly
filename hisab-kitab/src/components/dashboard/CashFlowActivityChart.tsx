import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Calendar,
  Plus,
  Info,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { isInternalTransfer } from '../../utils/dateFilter';

export type CashFlowInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface CashFlowGroupItem {
  id: string;
  label: string;
  shortLabel: string;
  fullDateDescription: string;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
}

export const CashFlowActivityChart: React.FC = () => {
  const {
    activeMode,
    activeModeId,
    transactions,
    modeTransactions,
    selectedPeriod,
    setSelectedPeriod,
    resolvedPeriod,
    setIsAddModalOpen,
    isViewOnly,
  } = useFinance();

  const activeModeTransactionsAllTime = useMemo(() => {
    return transactions.filter(
      (t) => t.modeId === activeModeId || !t.modeId || t.modeId === activeMode.id
    );
  }, [transactions, activeModeId, activeMode.id]);

  const [interval] = useState<CashFlowInterval>('daily');
  const [activeTooltipItem, setActiveTooltipItem] = useState<CashFlowGroupItem | null>(null);

  // Format currency with Indian Rupee symbol
  const formatCurrency = (val: number, compact = false) => {
    if (compact) {
      const absVal = Math.abs(val);
      if (absVal >= 10000000) {
        return `${val < 0 ? '-' : ''}₹${(absVal / 10000000).toFixed(1)}Cr`;
      }
      if (absVal >= 100000) {
        return `${val < 0 ? '-' : ''}₹${(absVal / 100000).toFixed(1)}L`;
      }
      if (absVal >= 1000) {
        return `${val < 0 ? '-' : ''}₹${(absVal / 1000).toFixed(1).replace(/\.0$/, '')}k`;
      }
      return `${val < 0 ? '-' : ''}₹${absVal}`;
    }

    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const numPart = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(absVal);
    return isNegative ? `-₹ ${numPart}` : `₹ ${numPart}`;
  };

  // Helper to format date label
  const formatDateLabel = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        const dayNum = d.getDate();
        const monthShort = d.toLocaleString('en-US', { month: 'short' });
        return {
          short: `${dayNum} ${monthShort}`,
          full: d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        };
      }
    } catch {
      // fallback
    }
    return { short: dateStr.slice(5), full: dateStr };
  };

  // Helper to get week key and range
  const getWeekInfo = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);

      // Start of week (Sunday)
      const dayOfWeek = d.getDay();
      const sunday = new Date(d);
      sunday.setDate(d.getDate() - dayOfWeek);

      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);

      const startMonth = sunday.toLocaleString('en-US', { month: 'short' });
      const endMonth = saturday.toLocaleString('en-US', { month: 'short' });

      const key = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
      const short =
        startMonth === endMonth
          ? `${startMonth} ${sunday.getDate()}-${saturday.getDate()}`
          : `${startMonth} ${sunday.getDate()} - ${endMonth} ${saturday.getDate()}`;

      return {
        key,
        short,
        full: `Week: ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      };
    } catch {
      return { key: dateStr, short: dateStr, full: dateStr };
    }
  };

  // Helper to get month info
  const getMonthInfo = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const d = new Date(year, month, 1);
      const monthName = d.toLocaleString('en-US', { month: 'short' });
      return {
        key: `${year}-${String(month + 1).padStart(2, '0')}`,
        short: `${monthName} '${String(year).slice(2)}`,
        full: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      };
    } catch {
      return { key: dateStr.slice(0, 7), short: dateStr.slice(0, 7), full: dateStr };
    }
  };

  // Source transactions: connect to real transactions matching the active mode and calendar filter
  // If the user selected Yearly or Monthly and current period is narrow, we use modeTransactions,
  // or modeTransactionsAllTime if user chose an interval wider than the active period
  const sourceTransactions = useMemo(() => {
    // If the active filter has transactions, respect the calendar filter
    if (modeTransactions.length > 0) {
      return modeTransactions;
    }
    // If no transactions in filtered period, we also check modeTransactions
    return modeTransactions;
  }, [modeTransactions]);

  // Aggregate cash flow data by selected interval
  const chartData = useMemo(() => {
    if (sourceTransactions.length === 0) return [];

    const map = new Map<
      string,
      {
        id: string;
        label: string;
        shortLabel: string;
        fullDateDescription: string;
        income: number;
        expense: number;
        transactionCount: number;
        sortKey: string;
      }
    >();

    for (const tx of sourceTransactions) {
      if (isInternalTransfer(tx)) continue;

      let groupKey = tx.date;
      let label = tx.date;
      let shortLabel = tx.date.slice(5);
      let fullDesc = tx.date;
      let sortKey = tx.date;

      if (interval === 'daily') {
        const info = formatDateLabel(tx.date);
        groupKey = tx.date;
        sortKey = tx.date;
        shortLabel = info.short;
        fullDesc = info.full;
        label = info.short;
      } else if (interval === 'weekly') {
        const info = getWeekInfo(tx.date);
        groupKey = info.key;
        sortKey = info.key;
        shortLabel = info.short;
        fullDesc = info.full;
        label = info.short;
      } else if (interval === 'monthly') {
        const info = getMonthInfo(tx.date);
        groupKey = info.key;
        sortKey = info.key;
        shortLabel = info.short;
        fullDesc = info.full;
        label = info.short;
      } else if (interval === 'yearly') {
        const year = tx.date.split('-')[0] || '2026';
        groupKey = year;
        sortKey = year;
        shortLabel = year;
        fullDesc = `Year ${year}`;
        label = year;
      }

      const existing = map.get(groupKey) || {
        id: groupKey,
        label,
        shortLabel,
        fullDateDescription: fullDesc,
        income: 0,
        expense: 0,
        transactionCount: 0,
        sortKey,
      };

      if (tx.type === 'income') {
        existing.income += tx.amount;
      } else {
        existing.expense += tx.amount;
      }
      existing.transactionCount += 1;

      map.set(groupKey, existing);
    }

    const items = Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    return items.map((item) => ({
      ...item,
      net: item.income - item.expense,
    }));
  }, [sourceTransactions, interval]);

  // Dynamic Y-axis scale calculation with nice rounded bounds
  const { niceMax, yTicks } = useMemo(() => {
    if (chartData.length === 0) {
      return { niceMax: 10000, yTicks: [10000, 7500, 5000, 2500, 0] };
    }

    const rawMax = Math.max(
      ...chartData.map((d) => Math.max(d.income, d.expense, 0)),
      1000
    );

    // Compute nice ceiling
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const ratio = rawMax / magnitude;
    let niceMultiplier = 1;
    if (ratio <= 1) niceMultiplier = 1;
    else if (ratio <= 1.5) niceMultiplier = 1.5;
    else if (ratio <= 2) niceMultiplier = 2;
    else if (ratio <= 3) niceMultiplier = 3;
    else if (ratio <= 5) niceMultiplier = 5;
    else if (ratio <= 8) niceMultiplier = 8;
    else niceMultiplier = 10;

    const computedMax = Math.ceil(niceMultiplier * magnitude);
    const tickStep = computedMax / 4;
    const ticks = [
      computedMax,
      Math.round(computedMax - tickStep),
      Math.round(computedMax - tickStep * 2),
      Math.round(computedMax - tickStep * 3),
      0,
    ];

    return { niceMax: computedMax, yTicks: ticks };
  }, [chartData]);

  const intervalLabels: Record<CashFlowInterval, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
  };

  return (
    <div className="bg-white dark:bg-[#0B0F19] text-slate-900 dark:text-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-xs dark:shadow-xl flex flex-col transition-colors">
      {/* 1. Header: Title & Calendar Period */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Cash Flow Activity
          </h3>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
            {activeMode.name}
          </span>
        </div>

        {/* Calendar Period Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
          <span className="truncate max-w-[140px] sm:max-w-none">
            {resolvedPeriod?.label || selectedPeriod}
          </span>
        </div>
      </div>

      {/* 2. Empty State or Chart Canvas */}
      {chartData.length === 0 ? (
        <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800/90 rounded-xl p-6 text-center bg-slate-50/70 dark:bg-slate-900/30">
          <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No cash flow activity in this period</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            No income or expense entries found for {activeMode.name} in{' '}
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              {resolvedPeriod?.label || selectedPeriod}
            </span>
            . Try selecting another period or adding an entry.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!isViewOnly && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Transaction</span>
              </button>
            )}
            {activeModeTransactionsAllTime.length > 0 && selectedPeriod !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedPeriod('all')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>View All Time ({activeModeTransactionsAllTime.length})</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col pt-2">
          {/* Main Chart Canvas with Y-Axis and Unified Horizontal Scrollable Grid */}
          <div className="relative flex w-full">
            {/* Left Y-Axis Values (Sticky Column) */}
            <div className="w-14 sm:w-16 shrink-0 flex flex-col justify-between h-52 sm:h-60 py-1 pb-1 text-right pr-2.5 select-none text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {yTicks.map((tickVal, idx) => (
                <div key={idx} className="h-4 flex items-center justify-end leading-none">
                  {formatCurrency(tickVal, true)}
                </div>
              ))}
            </div>

            {/* Scrollable Bars & Date Labels Container */}
            <div className="relative flex-1 overflow-x-auto overflow-y-visible pb-1 scrollbar-thin">
              <div className="min-w-full flex flex-col">
                {/* Bars + Grid Lines Area */}
                <div className="relative h-52 sm:h-60 flex flex-col justify-between">
                  {/* Horizontal Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-1">
                    {yTicks.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-full ${
                          idx === yTicks.length - 1
                            ? 'border-b border-slate-200 dark:border-slate-700/90'
                            : 'border-b border-dashed border-slate-100 dark:border-slate-800/80'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Paired Bars Area */}
                  <div className="relative z-10 flex-1 flex items-end gap-2.5 sm:gap-4 px-3 pb-1">
                    {chartData.map((item) => {
                      const incomeHeightPct =
                        item.income > 0
                          ? Math.min(100, Math.max(6, (item.income / niceMax) * 100))
                          : 0;
                      const expenseHeightPct =
                        item.expense > 0
                          ? Math.min(100, Math.max(6, (item.expense / niceMax) * 100))
                          : 0;

                      const isHovered = activeTooltipItem?.id === item.id;
                      const showDirectValueLabel = chartData.length <= 8;

                      return (
                        <div
                          key={item.id}
                          className="flex-1 min-w-[70px] sm:min-w-[88px] md:min-w-[104px] lg:min-w-[124px] max-w-[150px] h-full flex flex-col items-center justify-end group relative cursor-pointer"
                          onMouseEnter={() => setActiveTooltipItem(item)}
                          onMouseLeave={() => setActiveTooltipItem(null)}
                          onClick={() =>
                            setActiveTooltipItem(activeTooltipItem?.id === item.id ? null : item)
                          }
                        >
                          {/* Interactive Floating Tooltip */}
                          {isHovered && (
                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 bg-[#161f30] text-white text-[11px] py-1.5 px-2.5 rounded-xl border border-slate-700 shadow-2xl pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                              <div className="font-semibold text-slate-200 border-b border-slate-700/80 pb-0.5 mb-1">
                                {item.fullDateDescription}
                              </div>
                              <div className="flex items-center justify-between gap-3 text-emerald-400">
                                <span>Money In:</span>
                                <span className="font-bold">{formatCurrency(item.income)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-orange-400">
                                <span>Money Out:</span>
                                <span className="font-bold">{formatCurrency(item.expense)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-slate-300 border-t border-slate-700/80 pt-0.5 mt-0.5 font-semibold">
                                <span>Net Flow:</span>
                                <span
                                  className={item.net >= 0 ? 'text-emerald-300' : 'text-rose-400'}
                                >
                                  {item.net >= 0 ? '+' : ''}
                                  {formatCurrency(item.net)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Top ₹ Value Indicator if spacious or hovered */}
                          {(showDirectValueLabel || isHovered) && (item.income > 0 || item.expense > 0) && (
                            <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5 opacity-90 group-hover:opacity-100 truncate max-w-full">
                              {item.income > 0 ? formatCurrency(item.income, true) : formatCurrency(item.expense, true)}
                            </div>
                          )}

                          {/* Paired Green (Money In) & Orange (Money Out) Bars - Increased Width */}
                          <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-full max-h-[160px] sm:max-h-[190px] pb-0.5">
                            {/* Green Money In Bar */}
                            <div className="h-full flex items-end justify-center w-6 sm:w-8 md:w-9 lg:w-11">
                              {item.income > 0 ? (
                                <div
                                  className="w-full bg-[#10B981] hover:bg-[#34D399] rounded-t-md sm:rounded-t-lg shadow-[0_2px_10px_rgba(16,185,129,0.35)] transition-all group-hover:brightness-110"
                                  style={{ height: `${incomeHeightPct}%` }}
                                  title={`Money In: ${formatCurrency(item.income)}`}
                                />
                              ) : (
                                <div className="w-full h-1 sm:h-1.5 bg-slate-200 dark:bg-slate-800/60 rounded-t-xs" />
                              )}
                            </div>

                            {/* Orange Money Out Bar */}
                            <div className="h-full flex items-end justify-center w-6 sm:w-8 md:w-9 lg:w-11">
                              {item.expense > 0 ? (
                                <div
                                  className="w-full bg-[#F97316] hover:bg-[#FB923C] rounded-t-md sm:rounded-t-lg shadow-[0_2px_10px_rgba(249,115,22,0.35)] transition-all group-hover:brightness-110"
                                  style={{ height: `${expenseHeightPct}%` }}
                                  title={`Money Out: ${formatCurrency(item.expense)}`}
                                />
                              ) : (
                                <div className="w-full h-1 sm:h-1.5 bg-slate-200 dark:bg-slate-800/60 rounded-t-xs" />
                              )}
                            </div>
                          </div>

                          {/* Subtle hover column highlight */}
                          <div className="absolute inset-0 bg-slate-100/70 dark:bg-slate-800/15 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -z-1" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* X-Axis Date Labels Row (Strictly aligned under each pair of bars) */}
                <div className="flex gap-2.5 sm:gap-4 px-3 pt-1.5 border-t border-slate-200 dark:border-slate-700/80">
                  {chartData.map((item) => (
                    <div
                      key={item.id}
                      className="flex-1 min-w-[70px] sm:min-w-[88px] md:min-w-[104px] lg:min-w-[124px] max-w-[150px] text-center"
                    >
                      <span
                        className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 truncate block select-none"
                        title={item.fullDateDescription}
                      >
                        {item.shortLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer note & Activity count */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/90 pt-2.5 mt-2.5">
            <span className="flex items-center gap-1.5 text-[11px]">
              <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              Showing {chartData.length} {intervalLabels[interval].toLowerCase()} interval(s)
            </span>
            <span className="text-[11px]">
              Active period: <strong className="text-slate-700 dark:text-slate-200">{resolvedPeriod?.label || selectedPeriod}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
