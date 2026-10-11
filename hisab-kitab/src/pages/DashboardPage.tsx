import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  Plus,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  Edit2,
  Check,
  X,
  FileText,
  PiggyBank,
  PieChart,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { PageId } from '../components/layout/Sidebar';
import { FinanceModeSelector } from '../components/common/FinanceModeSelector';
import { CashFlowActivityChart } from '../components/dashboard/CashFlowActivityChart';
import { CategoryDonutChart } from '../components/dashboard/CategoryDonutChart';
import { ReceiptModal } from '../components/modals/ReceiptModal';
import { Transaction, PeriodType } from '../types/finance';
import { isInternalTransfer } from '../utils/dateFilter';

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const {
    modes,
    activeModeId,
    activeMode,
    modeTransactions,
    periodIncome,
    periodSpending,
    moneySaved,
    netCashFlow,
    savingsRate,
    currentBalance,
    modeStartingBalance,
    updateCurrentBalance,
    selectedPeriod,
    setSelectedPeriod,
    resolvedPeriod,
    dayBudgets,
    setIsAddModalOpen,
    setIsImportModalOpen,
    openEditModeModal,
    openEditTransactionModal,
    budgets,
    selectedBudgets,
    selectedBudgetIds,
    setSelectedBudgetIds,
    selectAllBudgets,
    deselectAllBudgets,
    isAllBudgetsSelected,
    selectedBudgetsTotalLimit,
    selectedBudgetTransactions,
    profile,
    isViewOnly,
  } = useFinance();

  const selectedBudgetNames = useMemo(
    () => selectedBudgets.map((b) => b.name || b.category),
    [selectedBudgets]
  );

  const budgetLabel = useMemo(() => {
    if (budgets.length === 0) return '';
    if (isAllBudgetsSelected) return `All Budgets (${budgets.length})`;
    if (selectedBudgetNames.length === 1) return selectedBudgetNames[0];
    if (selectedBudgetNames.length === 0) return 'No budgets selected';
    return `${selectedBudgetNames.length} Budgets Selected`;
  }, [budgets.length, isAllBudgetsSelected, selectedBudgetNames]);

  const [previewReceiptTx, setPreviewReceiptTx] = useState<Transaction | null>(null);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [editBalanceInput, setEditBalanceInput] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);
  const [balanceSaveSuccess, setBalanceSaveSuccess] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement>(null);

  // Close wallet menu on outside click or Escape
  useEffect(() => {
    if (!walletMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(e.target as Node)) {
        setWalletMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWalletMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [walletMenuOpen]);

  const handleStartEditBalance = () => {
    setEditBalanceInput(currentBalance.toString());
    setIsEditingBalance(true);
  };

  const handleSaveBalance = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(editBalanceInput);
    if (isNaN(val)) return;
    try {
      setSavingBalance(true);
      await updateCurrentBalance(val);
      setIsEditingBalance(false);
      setBalanceSaveSuccess(true);
      setTimeout(() => setBalanceSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save current balance', err);
    } finally {
      setSavingBalance(false);
    }
  };

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const numPart = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absVal);
    return isNegative ? `-₹\u00A0${numPart}` : `₹\u00A0${numPart}`;
  };

  // Helper to dynamically calculate optimal font size so numbers fit comfortably within cards without congestion
  const getMetricFontSize = (text: string) => {
    const len = text.length;
    if (len >= 16) {
      return 'text-base sm:text-lg lg:text-[17px] xl:text-[19px] 2xl:text-xl';
    }
    if (len >= 13) {
      return 'text-lg sm:text-xl lg:text-[19px] xl:text-[22px] 2xl:text-[25px]';
    }
    if (len >= 10) {
      return 'text-xl sm:text-2xl lg:text-[22px] xl:text-[25px] 2xl:text-[28px]';
    }
    return 'text-2xl sm:text-[26px] lg:text-[26px] xl:text-[28px] 2xl:text-3xl';
  };

  const formattedCurrentBalance = useMemo(() => formatCurrency(currentBalance), [currentBalance]);
  const formattedIncome = useMemo(() => formatCurrency(periodIncome), [periodIncome]);
  const formattedSpending = useMemo(() => formatCurrency(periodSpending), [periodSpending]);
  const formattedSaved = useMemo(() => {
    if (moneySaved > 0) {
      const numPart = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(moneySaved);
      return `+₹\u00A0${numPart}`;
    }
    if (moneySaved < 0) {
      const numPart = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Math.abs(moneySaved));
      return `-₹\u00A0${numPart}`;
    }
    return `₹\u00A00.00`;
  }, [moneySaved]);

  // Recent 5 transactions (from selected budgets if budgets exist, else mode transactions)
  const recentTransactions = useMemo(() => {
    const list = budgets.length > 0 ? selectedBudgetTransactions : modeTransactions;
    return [...list]
      .filter((t) => !isInternalTransfer(t))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [budgets.length, selectedBudgetTransactions, modeTransactions]);

  // Spending by category (from selected budgets if budgets exist, else mode transactions)
  const spendingByCategory = useMemo(() => {
    const list = budgets.length > 0 ? selectedBudgetTransactions : modeTransactions;
    const map = new Map<string, number>();
    for (const t of list) {
      if (t.type === 'expense' && !isInternalTransfer(t)) {
        map.set(t.category, (map.get(t.category) || 0) + t.amount);
      }
    }
    const entries = Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    return entries;
  }, [modeTransactions]);

  // Donut chart colors
  const DONUT_COLORS = [
    activeMode.color || '#6558D3',
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EC4899',
    '#8B5CF6',
    '#14B8A6',
    '#64748B',
  ];

  return (
    <div className="space-y-6">
      {/* 1. Finance Mode Selector */}
      <FinanceModeSelector />


      {/* 2. Four Responsive Metric Cards - Adaptive Light & Dark Theme */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 xl:gap-4">
        {/* Card 1: Current Balance */}
        <div className="bg-white dark:bg-[#070e24] p-3.5 sm:p-4 lg:p-4.5 xl:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs flex flex-col relative group transition-colors min-w-0">
          {/* Header row: uniform h-8 */}
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 h-8 mb-2 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0 pr-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                {budgets.length > 0 ? (isAllBudgetsSelected ? 'ALL BUDGETS BALANCE' : 'BUDGET BALANCE') : 'CURRENT BALANCE'}
              </span>
              {balanceSaveSuccess && (
                <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-full shrink-0">
                  <Check className="w-2.5 h-2.5" /> Saved
                </span>
              )}
            </div>

            {/* Wallet button with interactive dropdown options: Budget & Edit Balance */}
            <div className="relative" ref={walletMenuRef}>
              <button
                type="button"
                onClick={() => setWalletMenuOpen((prev) => !prev)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0 transition-transform active:scale-95 cursor-pointer hover:opacity-90 hover:scale-105 ring-offset-1 hover:ring-2 hover:ring-[#6558D3]/40"
                style={{ backgroundColor: activeMode.color || '#6558D3' }}
                title="Wallet options: Budget & Edit Balance"
                aria-label="Wallet options"
                aria-expanded={walletMenuOpen}
              >
                <Wallet className="w-4 h-4" />
              </button>

              {walletMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 sm:w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 backdrop-blur-xs">
                  {/* Option 1: Budget */}
                  <button
                    type="button"
                    onClick={() => {
                      setWalletMenuOpen(false);
                      onNavigate('budgets');
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer text-left group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#6558D3]/10 dark:bg-[#6558D3]/20 flex items-center justify-center text-[#6558D3] dark:text-[#8174f7] shrink-0 group-hover:scale-105 transition-transform">
                      <PieChart className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-slate-900 dark:text-white font-bold leading-tight">Budget</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate">
                        Redirect to Budget page
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Edit Balance */}
                  {!isViewOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setWalletMenuOpen(false);
                        handleStartEditBalance();
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer text-left border-t border-slate-100 dark:border-slate-800/60 group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Edit2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-slate-900 dark:text-white font-bold leading-tight">Edit Balance</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate">
                          Edit current balance
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Amount row: spacious, non-congested, single line with non-breaking symbols */}
          <div className="min-h-[2.5rem] sm:min-h-[2.75rem] flex items-center shrink-0 mb-1.5 w-full min-w-0 overflow-hidden">
            {isEditingBalance ? (
              <form onSubmit={handleSaveBalance} className="w-full">
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={editBalanceInput}
                      onChange={(e) => setEditBalanceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setIsEditingBalance(false);
                      }}
                      autoFocus
                      disabled={savingBalance}
                      placeholder="0.00"
                      className="w-full pl-6 pr-2 py-1 text-sm sm:text-base font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-[#6558D3] rounded-xl focus:outline-none font-sans tabular-nums"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingBalance}
                    className="p-1.5 bg-[#6558D3] hover:bg-[#5749c4] text-white rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50"
                    title="Save balance"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingBalance(false)}
                    disabled={savingBalance}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl cursor-pointer transition-all"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </form>
            ) : (
              <div
                onClick={!isViewOnly ? handleStartEditBalance : undefined}
                className={!isViewOnly ? 'cursor-pointer w-full min-w-0' : 'w-full min-w-0'}
                title={!isViewOnly ? 'Click to calibrate current account balance' : undefined}
              >
                <div
                  className={`${getMetricFontSize(formattedCurrentBalance)} font-bold text-slate-900 dark:text-white tracking-tight font-sans tabular-nums leading-tight whitespace-nowrap overflow-hidden text-ellipsis`}
                  title={formattedCurrentBalance}
                >
                  {formattedCurrentBalance}
                </div>
              </div>
            )}
          </div>

          {/* Footer row: mt-auto with min-h for consistent baseline */}
          <div className="mt-auto pt-1.5 flex flex-col justify-end text-[10px] sm:text-[11px] font-sans tabular-nums min-h-[32px]">
            <div className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-0.5">
              <span className="text-slate-500 dark:text-slate-400 truncate">
                {budgets.length > 0
                  ? `${isAllBudgetsSelected ? 'All Budgets Limit' : 'Budget Limit'}: ${formatCurrency(selectedBudgetsTotalLimit)}${
                      periodIncome > 0 ? ` (+${formatCurrency(periodIncome)} income)` : ''
                    }`
                  : activeModeId === 'combined'
                  ? 'All modes'
                  : `Opening: ${formatCurrency(modeStartingBalance)}`}
              </span>
              <span className="font-semibold text-[#6558D3] dark:text-[#8174f7] shrink-0">
                End of {resolvedPeriod?.label || selectedPeriod}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Money In */}
        <div className="bg-white dark:bg-[#070e24] p-3.5 sm:p-4 lg:p-4.5 xl:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs flex flex-col transition-colors min-w-0">
          {/* Header row: uniform h-8 */}
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 h-8 mb-2 shrink-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate pr-1">
              TOTAL MONEY IN
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs shrink-0">
              <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          {/* Amount row: spacious, non-congested, single line with non-breaking symbols */}
          <div className="min-h-[2.5rem] sm:min-h-[2.75rem] flex items-center shrink-0 mb-1.5 w-full min-w-0 overflow-hidden">
            <div
              className={`${getMetricFontSize(formattedIncome)} font-bold text-emerald-600 dark:text-emerald-400 tracking-tight font-sans tabular-nums leading-tight whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-[0_0_3px_rgba(16,185,129,0.25)] dark:drop-shadow-[0_0_4px_rgba(52,211,153,0.3)]`}
              title={formattedIncome}
            >
              {formattedIncome}
            </div>
          </div>

          {/* Footer row: mt-auto with min-h for consistent baseline */}
          <div className="mt-auto pt-1.5 flex flex-col justify-end text-[10px] sm:text-[11px] font-sans tabular-nums min-h-[32px]">
            <p className="text-slate-500 dark:text-slate-400 truncate">
              {budgets.length > 0
                ? `Received for ${budgetLabel} in ${resolvedPeriod?.label || selectedPeriod}`
                : `Received during ${resolvedPeriod?.label || selectedPeriod}`}
            </p>
          </div>
        </div>

        {/* Card 3: Total Money Out */}
        <div className="bg-white dark:bg-[#070e24] p-3.5 sm:p-4 lg:p-4.5 xl:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs flex flex-col transition-colors min-w-0">
          {/* Header row: uniform h-8 */}
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 h-8 mb-2 shrink-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate pr-1">
              TOTAL MONEY OUT
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200/80 dark:border-orange-800/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-xs shrink-0">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          {/* Amount row: spacious, non-congested, single line with non-breaking symbols */}
          <div className="min-h-[2.5rem] sm:min-h-[2.75rem] flex items-center shrink-0 mb-1.5 w-full min-w-0 overflow-hidden">
            <div
              className={`${getMetricFontSize(formattedSpending)} font-bold text-orange-600 dark:text-orange-400 tracking-tight font-sans tabular-nums leading-tight whitespace-nowrap overflow-hidden text-ellipsis`}
              title={formattedSpending}
            >
              {formattedSpending}
            </div>
          </div>

          {/* Footer row: mt-auto with min-h for consistent baseline */}
          <div className="mt-auto pt-1.5 flex flex-col justify-end text-[10px] sm:text-[11px] font-sans tabular-nums min-h-[32px]">
            <p className="text-slate-500 dark:text-slate-400 truncate">
              {budgets.length > 0
                ? `Spent for ${budgetLabel} in ${resolvedPeriod?.label || selectedPeriod}`
                : `Spent during ${resolvedPeriod?.label || selectedPeriod}`}
            </p>
          </div>
        </div>

        {/* Card 4: Money Saved */}
        <div className="bg-white dark:bg-[#070e24] p-3.5 sm:p-4 lg:p-4.5 xl:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs flex flex-col transition-colors min-w-0">
          {/* Header row: uniform h-8 */}
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 h-8 mb-2 shrink-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate pr-1">
              MONEY SAVED
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs shrink-0">
              <PiggyBank className="w-4 h-4 stroke-[2]" />
            </div>
          </div>

          {/* Amount row: spacious, non-congested, single line with non-breaking symbols */}
          <div className="min-h-[2.5rem] sm:min-h-[2.75rem] flex items-center shrink-0 mb-1.5 w-full min-w-0 overflow-hidden">
            <div
              className={`${getMetricFontSize(formattedSaved)} font-bold tracking-tight font-sans tabular-nums leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${
                moneySaved < 0
                  ? 'text-rose-600 dark:text-rose-400 drop-shadow-[0_0_3px_rgba(244,63,94,0.25)] dark:drop-shadow-[0_0_4px_rgba(251,113,133,0.3)]'
                  : 'text-blue-600 dark:text-blue-400 drop-shadow-[0_0_3px_rgba(37,99,235,0.25)] dark:drop-shadow-[0_0_4px_rgba(96,165,250,0.3)]'
              }`}
              title={formattedSaved}
            >
              {formattedSaved}
            </div>
          </div>

          {/* Footer row: mt-auto with min-h for consistent baseline */}
          <div className="mt-auto pt-1.5 flex flex-col justify-end text-[10px] sm:text-[11px] font-sans tabular-nums min-h-[32px]">
            <div className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-0.5">
              <span className="text-slate-500 dark:text-slate-400 truncate">Money In – Money Out</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                {savingsRate}% saved
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Analytics & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 cols): Cash Flow Timeline Chart stacked directly above Recent Activity */}
        <div className="lg:col-span-2 space-y-5">
          <CashFlowActivityChart />

          {/* Recent Activity (5 newest for this mode) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {budgets.length > 0
                    ? `Latest transactions for ${budgetLabel} in ${resolvedPeriod?.label || selectedPeriod}`
                    : `Latest transactions for ${activeMode.name} in ${resolvedPeriod?.label || selectedPeriod}`}
                </p>
              </div>
              <button
                onClick={() => onNavigate('transactions')}
                className="text-xs font-semibold text-[#6558D3] dark:text-indigo-400 hover:underline cursor-pointer"
              >
                View All Transactions →
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No transactions recorded</p>
                <p className="text-xs text-slate-400 mt-1 mb-3">
                  No activity logged for {activeMode.name} yet.
                </p>
                {!isViewOnly && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Entry</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTransactions.map((tx) => {
                  const txMode = modes.find((m) => m.id === tx.modeId);
                  const paymentMethod = tx.paymentMode || tx.account || 'Bank Transfer';

                  return (
                    <div
                      key={tx.id}
                      className="py-3 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.type === 'income'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                              : 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400'
                          }`}
                        >
                          {tx.type === 'income' ? (
                            <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {tx.merchant}
                            </p>
                            {activeModeId === 'combined' && txMode && (
                              <span
                                className="text-[9px] font-semibold px-1.5 py-0.2 rounded-md text-white shadow-xs"
                                style={{ backgroundColor: txMode.color || '#6558D3' }}
                              >
                                {txMode.name}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setSelectedPeriod(tx.date.slice(0, 10))}
                              className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer font-medium transition-colors"
                              title={`Filter dashboard to ${tx.date}`}
                            >
                              {tx.date}
                            </button>
                            <span>•</span>
                            <span>{tx.category}</span>
                            <span>•</span>
                            <span className="font-medium text-slate-600 dark:text-slate-400">{paymentMethod}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                        {!isViewOnly && (
                          <button
                            type="button"
                            onClick={() => openEditTransactionModal(tx)}
                            className="p-1.5 text-slate-400 hover:text-[#6558D3] dark:hover:text-[#8174f7] hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors cursor-pointer"
                            title="Edit transaction"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setPreviewReceiptTx(tx)}
                          className="p-1.5 text-slate-400 hover:text-[#3F32A3] dark:hover:text-[#8174f7] hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors cursor-pointer"
                          title="View official receipt"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        <div className="text-right">
                          <span
                            className={`text-xs font-bold font-sans tabular-nums ${
                              tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </span>
                          {tx.receiptAttached && (
                            <span className="block text-[10px] text-slate-400">Attached</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Category Donut Chart */}
        <div className="lg:col-span-1 space-y-6">
          <CategoryDonutChart onNavigate={onNavigate} />
        </div>
      </div>

      {/* Official Ledgerly Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(previewReceiptTx)}
        onClose={() => setPreviewReceiptTx(null)}
        transaction={previewReceiptTx}
        modeName={
          previewReceiptTx
            ? modes.find((m) => m.id === previewReceiptTx.modeId)?.name || activeMode.name
            : activeMode.name
        }
        userName={profile?.name}
      />
    </div>
  );
};
