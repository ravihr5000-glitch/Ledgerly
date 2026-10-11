import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Info,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Budget } from '../types/finance';
import { isDateInPeriodString } from '../utils/dateFilter';

export const BudgetsPage: React.FC = () => {
  const {
    budgets,
    categories,
    transactions,
    createBudget,
    updateBudget,
    deleteBudget,
    deleteAllBudgets,
    selectedBudgetIds,
    toggleSelectBudget,
    selectAllBudgets,
    deselectAllBudgets,
    isBudgetSelected,
    selectedPeriod,
    resolvedPeriod,
    isViewOnly,
  } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Expense');

  const budgetCategoryOptions = useMemo(() => {
    const primaryOptions = ['Expense', 'Income', 'Other'];
    const merged = [...primaryOptions];
    for (const c of categories) {
      if (!merged.some((m) => m.toLowerCase() === c.toLowerCase())) {
        merged.push(c);
      }
    }
    return merged;
  }, [categories]);
  const [formLimit, setFormLimit] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAll = async () => {
    try {
      setIsDeletingAll(true);
      setError(null);
      await deleteAllBudgets();
      setIsDeleteAllModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete all budgets');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const numPart = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absVal);
    return isNegative ? `-₹ ${numPart}` : `₹ ${numPart}`;
  };

  // Spending and Income per budget / category within the active calendar period
  const spendingData = useMemo(() => {
    const spendingByBudget = new Map<string, number>();
    const spendingByCategory = new Map<string, number>();
    const incomeByBudget = new Map<string, number>();
    const incomeByCategory = new Map<string, number>();

    for (const t of transactions) {
      if (isDateInPeriodString(t.date, selectedPeriod)) {
        if (t.type === 'expense') {
          if (t.budgetId) {
            spendingByBudget.set(t.budgetId, (spendingByBudget.get(t.budgetId) || 0) + t.amount);
          }
          const cat = (t.category || '').toLowerCase().trim();
          spendingByCategory.set(cat, (spendingByCategory.get(cat) || 0) + t.amount);
        } else if (t.type === 'income') {
          if (t.budgetId) {
            incomeByBudget.set(t.budgetId, (incomeByBudget.get(t.budgetId) || 0) + t.amount);
          }
          const cat = (t.category || '').toLowerCase().trim();
          incomeByCategory.set(cat, (incomeByCategory.get(cat) || 0) + t.amount);
        }
      }
    }
    return { spendingByBudget, spendingByCategory, incomeByBudget, incomeByCategory };
  }, [transactions, selectedPeriod]);

  // Overall budget health summary for active budgets in this period
  const healthSummary = useMemo(() => {
    if (budgets.length === 0) return null;

    let totalLimit = 0;
    let totalSpent = 0;
    let totalIncome = 0;
    let overBudgetCount = 0;

    for (const b of budgets) {
      if (b.active) {
        totalLimit += b.monthlyLimit;
        const directSpent = spendingData.spendingByBudget.get(b.id);
        const catSpent = spendingData.spendingByCategory.get((b.category || '').toLowerCase().trim()) || 0;
        const spent = directSpent !== undefined ? directSpent : catSpent;

        const directIncome = spendingData.incomeByBudget.get(b.id);
        const catIncome = spendingData.incomeByCategory.get((b.category || '').toLowerCase().trim()) || 0;
        const income = directIncome !== undefined ? directIncome : catIncome;

        totalSpent += spent;
        totalIncome += income;
        if (spent > b.monthlyLimit + income) {
          overBudgetCount++;
        }
      }
    }

    const effectiveTotalPool = totalLimit + totalIncome;
    const pct = effectiveTotalPool > 0 ? (totalSpent / effectiveTotalPool) * 100 : 0;
    return {
      totalLimit,
      totalSpent,
      totalIncome,
      overBudgetCount,
      percentUsed: Math.round(pct),
    };
  }, [budgets, spendingData]);

  const handleOpenCreate = () => {
    setEditingBudget(null);
    setFormName('');
    setFormCategory('Expense');
    setFormLimit('');
    setFormActive(true);
    setFormNotes('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Budget) => {
    setEditingBudget(b);
    setFormName(b.name || '');
    setFormCategory(b.category);
    setFormLimit(b.monthlyLimit.toString());
    setFormActive(b.active);
    setFormNotes(b.notes || '');
    setFormDate(b.date || (b.createdAt ? b.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]));
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(formLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      setError('Please enter a positive budget limit amount.');
      return;
    }

    const finalName = formName.trim() || formCategory;
    const finalDate = formDate.trim() || new Date().toISOString().split('T')[0];

    try {
      setLoading(true);
      if (editingBudget) {
        await updateBudget(editingBudget.id, {
          name: finalName,
          category: formCategory,
          monthlyLimit: limitNum,
          active: formActive,
          notes: formNotes.trim() || undefined,
          date: finalDate,
        });
      } else {
        await createBudget({
          name: finalName,
          category: formCategory,
          monthlyLimit: limitNum,
          active: formActive,
          notes: formNotes.trim() || undefined,
          date: finalDate,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save budget.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Monthly Category Budgets</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track spending against target monthly limits for {resolvedPeriod?.label || selectedPeriod}
          </p>
        </div>

        {!isViewOnly && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Budget</span>
          </button>
        )}
      </div>

      {/* Budget Health Summary Card */}
      {healthSummary && (
        <div className="bg-white dark:bg-slate-900 px-3.5 py-3 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 divide-x sm:divide-x-0 divide-slate-200/80 dark:divide-slate-800 items-center">
            {/* Left: Total Budget Limit */}
            <div className="min-w-0 pr-2.5 sm:pr-0">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
                Total Budget Limit
              </span>
              <div className="text-[15px] sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 sm:mt-1 font-sans tabular-nums tracking-tight truncate">
                {formatCurrency(healthSummary.totalLimit)}
              </div>
            </div>

            {/* Right: Month-to-Date / Period Spent */}
            <div className="min-w-0 pl-3 sm:pl-0">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
                Month-to-Date Spent
              </span>
              <div className="text-[15px] sm:text-xl font-bold text-orange-600 dark:text-orange-400 mt-0.5 sm:mt-1 font-sans tabular-nums tracking-tight truncate">
                {formatCurrency(healthSummary.totalSpent)}
                <span className="text-[10px] sm:text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">
                  ({healthSummary.percentUsed}%)
                </span>
              </div>
            </div>

            {/* Desktop Only: Budget Status (Hidden on Mobile) */}
            <div className="hidden sm:block min-w-0">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
                Budget Status
              </span>
              <div className="text-sm font-bold mt-1.5 flex items-center gap-1.5 truncate">
                {healthSummary.overBudgetCount > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 truncate">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{healthSummary.overBudgetCount} budget{healthSummary.overBudgetCount === 1 ? '' : 's'} over limit</span>
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 truncate">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>All active budgets within limit</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Master Select All Checkbox & Delete All Dustbin Icon */}
      {budgets.length > 0 && (
        <div className="flex items-center justify-between py-1 px-1">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={budgets.length > 0 && selectedBudgetIds.length === budgets.length}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = selectedBudgetIds.length > 0 && selectedBudgetIds.length < budgets.length;
                  }
                }}
                onChange={(e) => {
                  if (e.target.checked) {
                    selectAllBudgets();
                  } else {
                    deselectAllBudgets();
                  }
                }}
                className="w-4 h-4 rounded text-[#6558D3] focus:ring-[#6558D3] border-slate-300 dark:border-slate-700 cursor-pointer accent-[#6558D3]"
              />
              <span>
                Select All{' '}
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  ({selectedBudgetIds.length} of {budgets.length} selected for Dashboard & Transactions)
                </span>
              </span>
            </label>

            {/* Delete all Dustbin Icon at right side of select all - appears when all budgets are selected */}
            {budgets.length > 0 && selectedBudgetIds.length === budgets.length && !isViewOnly && (
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/80 rounded-lg transition-colors cursor-pointer shadow-xs animate-in fade-in zoom-in-95 duration-150"
                title="Delete all budgets"
                aria-label="Delete all budgets"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Delete All</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Budgets List or Empty State */}
      {budgets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto mb-3">
            <PieChart className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No budgets created yet</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Set monthly spending caps on categories like Groceries, Dining, or Housing. You can create multiple budgets under the same category.
          </p>
          {!isViewOnly && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Budget</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const isSelected = isBudgetSelected(b.id);
            const directSpent = spendingData.spendingByBudget.get(b.id);
            const catSpent = spendingData.spendingByCategory.get((b.category || '').toLowerCase().trim()) || 0;
            const spent = directSpent !== undefined ? directSpent : catSpent;

            const directIncome = spendingData.incomeByBudget.get(b.id);
            const catIncome = spendingData.incomeByCategory.get((b.category || '').toLowerCase().trim()) || 0;
            const income = directIncome !== undefined ? directIncome : catIncome;

            const effectiveLimit = b.monthlyLimit + income;
            const remaining = effectiveLimit - spent;
            const pct = effectiveLimit > 0 ? Math.min(100, Math.round((spent / effectiveLimit) * 100)) : 0;
            const isOver = spent > effectiveLimit;

            return (
              <div
                key={b.id}
                className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all shadow-xs space-y-3 ${
                  isSelected
                    ? 'border-[#6558D3] dark:border-[#8174f7] ring-1 ring-[#6558D3]/30 shadow-sm'
                    : 'border-slate-200/90 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {/* Checkbox beside budget */}
                    <label
                      className="flex items-center cursor-pointer mt-0.5 shrink-0"
                      title={isSelected ? 'Deselect from Dashboard & Transactions' : 'Select for Dashboard & Transactions'}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectBudget(b.id)}
                        className="w-4 h-4 rounded text-[#6558D3] focus:ring-[#6558D3] border-slate-300 dark:border-slate-700 cursor-pointer accent-[#6558D3]"
                      />
                    </label>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {b.name || b.category}
                        </h4>
                        {isSelected && (
                          <span className="text-[10px] font-semibold text-[#6558D3] dark:text-[#8174f7] bg-[#6558D3]/10 dark:bg-[#6558D3]/20 px-1.5 py-0.5 rounded-md shrink-0">
                            Active
                          </span>
                        )}
                        {!b.active && (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md shrink-0">
                            Paused
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex-wrap">
                        <span>Category: {b.category}</span>
                        <span>·</span>
                        <span>Limit: {formatCurrency(b.monthlyLimit)}/mo</span>
                        {b.date && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span>Date: {b.date}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isOver && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-md">
                        Over Budget
                      </span>
                    )}
                    {!isViewOnly && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Budget"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteBudget(b.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete Budget"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver
                          ? 'bg-rose-500'
                          : pct > 80
                          ? 'bg-amber-500'
                          : 'bg-[#6558D3]'
                      }`}
                      style={{ width: `${Math.min(100, (spent / (effectiveLimit || 1)) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-sans tabular-nums">
                      Spent: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(spent)}</strong> ({pct}%)
                      {income > 0 && (
                        <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                          (+{formatCurrency(income)} income added)
                        </span>
                      )}
                    </span>
                    <span className="font-sans tabular-nums">
                      {remaining >= 0 ? (
                        <span>Remaining: {formatCurrency(remaining)}</span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          Over by {formatCurrency(Math.abs(remaining))}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 z-10 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              {editingBudget ? 'Edit Budget' : 'Create Budget'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Set spending limits for any category. You can create multiple budgets under the same category.
            </p>

            {error && (
              <div className="p-3 mb-3 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Budget Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Groceries, Office Lunch, Dining Out"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Give this budget a distinctive name so you can manage multiple budgets in the same category separately.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                >
                  {budgetCategoryOptions.map((c) => (
                    <option key={c} value={c} className="bg-white dark:bg-slate-800">
                      {c}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Multiple budgets can be created under the same category.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Limit (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="e.g. 5000"
                  value={formLimit}
                  onChange={(e) => setFormLimit(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                />
              </div>

              {/* Date Dropdown / Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Budget Date *
                </label>
                <div className="space-y-1.5">
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Quick set:</span>
                    <button
                      type="button"
                      onClick={() => setFormDate(new Date().toISOString().split('T')[0])}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                        setFormDate(firstDay);
                      }}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      1st of This Month
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    A yellow dot will appear on this calendar date in the header calendar.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 text-[#6558D3] rounded border-slate-300 dark:border-slate-700"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Active Budget</span>
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {editingBudget ? 'Update Budget' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete All Budgets Confirmation Modal */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => !isDeletingAll && setIsDeleteAllModalOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 z-10 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Delete All Budgets?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This will remove all {budgets.length} budgets.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              Are you sure you want to permanently delete all budgets? Historical transactions will remain intact.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(false)}
                disabled={isDeletingAll}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={isDeletingAll}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingAll ? 'Deleting...' : 'Delete All Budgets'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
