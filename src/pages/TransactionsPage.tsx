import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  Paperclip,
  Tag as TagIcon,
  Check,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckSquare,
  Square,
  MinusSquare,
  CreditCard,
  Layers,
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  SlidersHorizontal,
  Landmark,
  Wallet,
  Calendar,
  FileText,
  Download,
  PieChart,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Transaction, DEFAULT_PAYMENT_MODES } from '../types/finance';
import {
  generateSingleReceiptPdf,
  generateBulkTransactionsPdf,
  exportTransactionsToExcelCsv,
} from '../utils/receiptGenerator';
import { ReceiptModal } from '../components/modals/ReceiptModal';

export const TransactionsPage: React.FC = () => {
  const {
    transactions,
    filteredTransactions,
    categories,
    modeCategories,
    accounts,
    modes,
    activeModeId,
    activeMode,
    switchMode,
    deleteTransaction,
    deleteTransactionsBulk,
    inlineCategoryChange,
    inlinePaymentModeChange,
    inlineTagsChange,
    setIsAddModalOpen,
    openEditTransactionModal,
    setIsImportModalOpen,
    setIsTagModalOpen,
    selectedPeriod,
    resolvedPeriod,
    budgets,
    selectedBudgetIds,
    setSelectedBudgetIds,
    isAllBudgetsSelected,
    selectAllBudgets,
    deselectAllBudgets,
    isViewOnly,
    profile,
    isDarkMode,
  } = useFinance();

  const budgetMap = useMemo(() => new Map(budgets.map((b) => [b.id, b.name || b.category])), [budgets]);
  const selectedBudgetNames = useMemo(
    () => budgets.filter((b) => selectedBudgetIds.includes(b.id)).map((b) => b.name || b.category),
    [budgets, selectedBudgetIds]
  );

  const [searchTerm, setSearchTerm] = useState('');
  // Default to 'period' so Transactions section is synchronized with the calendar in the header
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'period'>('period');
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>('current'); // 'current' | 'all' | mode.id
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('All');

  // Synchronize with header calendar whenever a user selects a specific date, month, or year
  useEffect(() => {
    setSelectedDateFilter('period');
  }, [selectedPeriod]);

  // Multi-select bulk state
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);

  // Inline editing state for tags
  const [activeInlineTagTxId, setActiveInlineTagTxId] = useState<string | null>(null);
  const [newTagVal, setNewTagVal] = useState('');

  // Single delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Mobile-specific interactive states (< 768px)
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [mobileActionTx, setMobileActionTx] = useState<Transaction | null>(null);
  const [previewReceiptTx, setPreviewReceiptTx] = useState<Transaction | null>(null);
  const [mobileTagInput, setMobileTagInput] = useState('');

  // Available categories for filter and edit (ensure 'Expense' is included)
  const allCategories = useMemo(() => {
    const set = new Set<string>(['Expense', ...categories, ...modeCategories]);
    return Array.from(set);
  }, [categories, modeCategories]);

  // Available payment modes (UPI, Bank Transfer, Cash, + custom)
  const availablePaymentModes = useMemo(() => {
    const list = ['UPI', 'Bank Transfer', 'Cash'];
    if (Array.isArray(accounts)) {
      accounts.forEach((acc) => {
        if (acc && !list.includes(acc)) {
          list.push(acc);
        }
      });
    }
    return list;
  }, [accounts]);

  // Search and filter logic
  const displayedTransactions = useMemo(() => {
    const baseList = selectedDateFilter === 'period' ? filteredTransactions : transactions;
    return baseList.filter((tx) => {
      // 1. Budget filter (synchronizes with Budgets page and Dashboard selection)
      // When specific budget(s) are selected: display only transactions associated with those budget(s).
      // When Select All is enabled: display transactions from all budgets.
      if (budgets.length > 0 && !isAllBudgetsSelected) {
        if (selectedBudgetIds.length === 0) {
          return false;
        }
        const selectedSet = new Set(selectedBudgetIds);
        const activeSelectedBudgets = budgets.filter((b) => selectedSet.has(b.id));
        const activeCategories = new Set(
          activeSelectedBudgets.map((b) => (b.category || '').toLowerCase().trim()).filter(Boolean)
        );

        let matchesBudget = false;
        if (tx.budgetId) {
          matchesBudget = selectedSet.has(tx.budgetId);
        } else {
          const cleanCat = (tx.category || '').toLowerCase().trim();
          matchesBudget = cleanCat ? activeCategories.has(cleanCat) : false;
        }

        if (!matchesBudget) {
          return false;
        }
      }

      // Mode filter
      if (selectedModeFilter !== 'all' && selectedModeFilter !== 'current') {
        if (tx.modeId !== selectedModeFilter) {
          return false;
        }
      } else if (selectedModeFilter === 'current') {
        // If a specific subset of budgets is selected, allow transactions belonging to those budgets across modes.
        // If Select All or no budgets exist, filter by activeModeId as standard.
        if (activeModeId !== 'combined' && (budgets.length === 0 || isAllBudgetsSelected)) {
          if (tx.modeId !== activeModeId) {
            return false;
          }
        }
      }

      // Category filter
      if (selectedCategory !== 'All' && tx.category !== selectedCategory) {
        return false;
      }

      // Payment Mode filter (UPI, Bank Transfer, Cash)
      const pm = tx.paymentMode || tx.account || 'Bank Transfer';
      if (selectedPaymentMode !== 'All' && pm.toLowerCase() !== selectedPaymentMode.toLowerCase()) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesMerchant = tx.merchant.toLowerCase().includes(q);
        const matchesCategory = tx.category.toLowerCase().includes(q);
        const matchesPm = pm.toLowerCase().includes(q);
        const matchesTag = tx.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesMerchant && !matchesCategory && !matchesPm && !matchesTag) {
          return false;
        }
      }
      return true;
    });
  }, [
    selectedDateFilter,
    filteredTransactions,
    transactions,
    budgets,
    isAllBudgetsSelected,
    selectedBudgetIds,
    selectedModeFilter,
    activeModeId,
    selectedCategory,
    selectedPaymentMode,
    searchTerm,
  ]);

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const numPart = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absVal);
    return isNegative ? `-₹ ${numPart}` : `₹ ${numPart}`;
  };

  const isFiltered =
    searchTerm.trim() !== '' ||
    selectedCategory !== 'All' ||
    selectedPaymentMode !== 'All' ||
    selectedModeFilter !== 'current' ||
    selectedDateFilter === 'all' ||
    (budgets.length > 0 && !isAllBudgetsSelected);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedPaymentMode('All');
    setSelectedModeFilter('current');
    setSelectedDateFilter('period');
    if (budgets.length > 0 && !isAllBudgetsSelected) {
      selectAllBudgets();
    }
  };

  const getPaymentIcon = (pm?: string) => {
    const lower = (pm || '').toLowerCase();
    if (lower.includes('bank') || lower.includes('transfer')) {
      return <Landmark className="w-3 h-3 text-slate-400" />;
    }
    if (lower.includes('card')) {
      return <CreditCard className="w-3 h-3 text-slate-400" />;
    }
    return <Wallet className="w-3 h-3 text-slate-400" />;
  };

  // Bulk Selection calculations
  const isAllSelected =
    displayedTransactions.length > 0 &&
    displayedTransactions.every((tx) => selectedTxIds.has(tx.id));

  const isSomeSelected =
    displayedTransactions.some((tx) => selectedTxIds.has(tx.id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const next = new Set(selectedTxIds);
      displayedTransactions.forEach((tx) => next.delete(tx.id));
      setSelectedTxIds(next);
    } else {
      const next = new Set(selectedTxIds);
      displayedTransactions.forEach((tx) => next.add(tx.id));
      setSelectedTxIds(next);
    }
  };

  const handleToggleSelectRow = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedTxIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTxIds(next);
  };

  const handleConfirmBulkDelete = async () => {
    try {
      setBulkDeleting(true);
      await deleteTransactionsBulk(Array.from(selectedTxIds));
      setSelectedTxIds(new Set());
      setIsBulkDeleteModalOpen(false);
    } catch (err: any) {
      console.error('Failed bulk delete:', err);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteTransaction(deletingId);
      selectedTxIds.delete(deletingId);
      setSelectedTxIds(new Set(selectedTxIds));
      setDeletingId(null);
    } catch (err: any) {
      console.error('Failed delete:', err);
    }
  };

  const handleAddInlineTag = async (tx: Transaction, explicitTag?: string) => {
    const clean = (explicitTag !== undefined ? explicitTag : newTagVal).trim();
    if (!clean) return;
    if (!tx.tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      const updated = [...tx.tags, clean];
      await inlineTagsChange(tx.id, updated);
    }
    if (explicitTag === undefined) {
      setNewTagVal('');
      setActiveInlineTagTxId(null);
    }
  };

  const handleRemoveInlineTag = async (tx: Transaction, tagToRemove: string) => {
    const updated = tx.tags.filter((t) => t !== tagToRemove);
    await inlineTagsChange(tx.id, updated);
  };

  const selectedTransactionsList = useMemo(() => {
    return displayedTransactions.filter((tx) => selectedTxIds.has(tx.id));
  }, [displayedTransactions, selectedTxIds]);

  const singleSelectedTx = useMemo(() => {
    if (selectedTxIds.size !== 1) return null;
    const singleId = Array.from(selectedTxIds)[0];
    return displayedTransactions.find((tx) => tx.id === singleId) || filteredTransactions.find((tx) => tx.id === singleId) || null;
  }, [selectedTxIds, displayedTransactions, filteredTransactions]);

  const handleDownloadSingleReceipt = () => {
    if (!singleSelectedTx) return;
    setPreviewReceiptTx(singleSelectedTx);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ============================================================
          DESKTOP TOP FILTER & ACTIONS BAR (>= 768px)
          Desktop layout & spacing strictly preserved
          ============================================================ */}
      <div className="hidden md:flex bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex-col gap-3 transition-colors">
        {/* Row 1: Search & Bulk Action Banner */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by merchant, category, or payment mode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
            />
          </div>

          {/* Bulk Action Controls */}
          <div className="flex items-center gap-2">
            {selectedTxIds.size > 0 && (
              <div className="flex items-center gap-2 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-xl animate-in fade-in">
                <span className="text-xs font-semibold text-[#6558D3] dark:text-indigo-300 font-sans tabular-nums">
                  {selectedTxIds.size} selected
                </span>

                {/* 1. Delete button: compact trash/delete icon with text "Delete" */}
                {!isViewOnly && (
                  <button
                    type="button"
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                    title="Delete selected entries"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}

                {/* 2. Receipt download for a single transaction */}
                {selectedTxIds.size === 1 && (
                  <button
                    type="button"
                    onClick={handleDownloadSingleReceipt}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                    title="Download official PDF receipt"
                  >
                    <Download className="w-3.5 h-3.5 text-[#6558D3] dark:text-[#8174f7]" />
                    <span>Receipt</span>
                  </button>
                )}

                {/* 3. Download options for selected transactions */}
                {selectedTxIds.size >= 1 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDownloadMenuOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                      title="Download selected transactions"
                    >
                      <Download className="w-3.5 h-3.5 text-[#6558D3] dark:text-[#8174f7]" />
                      <span>Download</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {isDownloadMenuOpen && (
                      <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-30 animate-in fade-in zoom-in-95">
                        <button
                          type="button"
                          onClick={() => {
                            generateBulkTransactionsPdf(
                              selectedTransactionsList,
                              `${selectedTransactionsList.length} Transactions Report`,
                              { isDark: isDarkMode }
                            );
                            setIsDownloadMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition cursor-pointer text-left"
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-500" />
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            exportTransactionsToExcelCsv(
                              selectedTransactionsList,
                              selectedTransactionsList.length === displayedTransactions.length
                                ? 'Ledgerly_Transactions'
                                : 'Ledgerly_Selected_Transactions'
                            );
                            setIsDownloadMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition cursor-pointer text-left"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Excel</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTxIds(new Set());
                    setIsDownloadMenuOpen(false);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-1 rounded cursor-pointer"
                  title="Clear selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {!isViewOnly && (
              <>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Entry</span>
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Import</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Row 2: Dropdown Filters (Mode, Date Range, Category, Payment Mode, Tags) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Finance Mode Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl text-xs">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedModeFilter}
              onChange={(e) => setSelectedModeFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="current" className="bg-white dark:bg-slate-800">Current Mode ({activeMode.name})</option>
              <option value="all" className="bg-white dark:bg-slate-800">All Modes Combined</option>
              {modes.map((m) => (
                <option key={m.id} value={m.id} className="bg-white dark:bg-slate-800">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter (Synchronized with Header Calendar by default) */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-[#6558D3] dark:text-indigo-400" />
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value as 'all' | 'period')}
              className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-xs"
              title="Filter transactions by date range"
            >
              <option value="period" className="bg-white dark:bg-slate-800">
                Calendar: {resolvedPeriod?.label || selectedPeriod} ({filteredTransactions.length})
              </option>
              <option value="all" className="bg-white dark:bg-slate-800">
                All Dates ({transactions.length})
              </option>
            </select>
          </div>

          {/* Budget Filter */}
          {budgets.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl text-xs">
              <PieChart className="w-3.5 h-3.5 text-[#6558D3] dark:text-[#8174f7]" />
              <select
                value={isAllBudgetsSelected ? 'all' : (selectedBudgetIds.length === 1 ? selectedBudgetIds[0] : (selectedBudgetIds.length === 0 ? 'none' : 'custom'))}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') {
                    selectAllBudgets();
                  } else if (val === 'none') {
                    deselectAllBudgets();
                  } else if (val !== 'custom') {
                    setSelectedBudgetIds([val]);
                  }
                }}
                className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-xs"
                title="Filter transactions by budget"
              >
                <option value="all" className="bg-white dark:bg-slate-800">
                  All Budgets ({budgets.length})
                </option>
                {budgets.map((b) => (
                  <option key={b.id} value={b.id} className="bg-white dark:bg-slate-800">
                    {b.name || b.category} ({formatCurrency(b.monthlyLimit)})
                  </option>
                ))}
                {!isAllBudgetsSelected && selectedBudgetIds.length > 1 && (
                  <option value="custom" className="bg-white dark:bg-slate-800" disabled>
                    Custom ({selectedBudgetIds.length} Budgets)
                  </option>
                )}
                {selectedBudgetIds.length === 0 && (
                  <option value="none" className="bg-white dark:bg-slate-800">
                    No Budgets Selected
                  </option>
                )}
              </select>
            </div>
          )}

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-white dark:bg-slate-800">All Categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c} className="bg-white dark:bg-slate-800">
                {c}
              </option>
            ))}
          </select>

          {/* Payment Mode Filter (UPI, Bank Transfer, Cash) */}
          <select
            value={selectedPaymentMode}
            onChange={(e) => setSelectedPaymentMode(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-white dark:bg-slate-800">All Payment Modes</option>
            <option value="UPI" className="bg-white dark:bg-slate-800">UPI</option>
            <option value="Bank Transfer" className="bg-white dark:bg-slate-800">Bank Transfer</option>
            <option value="Cash" className="bg-white dark:bg-slate-800">Cash</option>
          </select>

          {/* Open Tag Manager Modal button */}
          <button
            onClick={() => setIsTagModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs cursor-pointer ml-auto"
            title="Manage Tags"
          >
            <TagIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Manage Tags</span>
          </button>
        </div>
      </div>

      {/* Desktop Transaction Count & Active Period Bar */}
      <div className="hidden md:flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-slate-800 dark:text-slate-200 font-sans tabular-nums">
            {displayedTransactions.length} {displayedTransactions.length === 1 ? 'Transaction' : 'Transactions'}
          </span>
          {selectedDateFilter === 'period' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-[#6558D3] dark:text-indigo-400 font-medium text-[11px] border border-indigo-200/50 dark:border-indigo-800/50">
              <Calendar className="w-3 h-3 text-[#6558D3] dark:text-indigo-400" />
              <span>Calendar: {resolvedPeriod?.label || selectedPeriod}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
              All Dates ({transactions.length})
            </span>
          )}

          {budgets.length > 0 && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-medium text-[11px] border ${
              isAllBudgetsSelected
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-[#6558D3] dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-800/50'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50'
            }`}>
              <PieChart className="w-3 h-3" />
              <span>
                {isAllBudgetsSelected
                  ? `All Budgets (${budgets.length})`
                  : selectedBudgetIds.length === 0
                  ? 'No budgets selected'
                  : `Budget: ${selectedBudgetNames.join(', ')}`}
              </span>
            </span>
          )}
        </div>

        {isFiltered && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6558D3] dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
          >
            <Filter className="w-3 h-3" />
            <span>Reset Search & Filters</span>
          </button>
        )}
      </div>

      {/* ============================================================
          MOBILE DEDICATED HEADER & CONTROLS (< 768px)
          Matching Reference Image:
          1. "Search by merchant, category..."
          2. "[Business ⌵] [Filters ⌵] [···]"
          3. "2 Transactions         Filtered"
          ============================================================ */}
      <div className="md:hidden space-y-3">
        {/* 1. Mobile Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by merchant, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6558D3] transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 2. Key Filters Row (Kept minimal for better focus) */}
        <div className="flex items-center gap-2">
          {/* Mode Pill: "Business ⌵" */}
          <div className="relative inline-flex items-center">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs">
              <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <select
                value={selectedModeFilter}
                onChange={(e) => setSelectedModeFilter(e.target.value)}
                className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-4 appearance-none text-xs"
              >
                <option value="current" className="bg-white dark:bg-slate-800">
                  {activeMode.name}
                </option>
                <option value="all" className="bg-white dark:bg-slate-800">
                  All Modes
                </option>
                {modes.map((m) => (
                  <option key={m.id} value={m.id} className="bg-white dark:bg-slate-800">
                    {m.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Filters Pill: "Filters ⌵" */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold border transition-all shadow-xs cursor-pointer ${
              selectedCategory !== 'All' || selectedPaymentMode !== 'All' || selectedDateFilter === 'all'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-[#6558D3] text-[#6558D3] dark:text-indigo-300'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>
              Filters
              {selectedCategory !== 'All' || selectedPaymentMode !== 'All' || selectedDateFilter === 'all' ? ' (Active)' : ''}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* More Actions Pill: "···" */}
          <button
            type="button"
            onClick={() => setIsMobileMoreOpen(true)}
            className="p-2 ml-auto bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
            title="More Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Transaction Count with Filter Status & Period Synchronization */}
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700 dark:text-slate-300 font-sans tabular-nums">
              {displayedTransactions.length}{' '}
              {displayedTransactions.length === 1 ? 'Transaction' : 'Transactions'}
            </span>
            {selectedDateFilter === 'period' && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-[#6558D3] dark:text-indigo-400 font-medium">
                <Calendar className="w-3 h-3 text-[#6558D3] dark:text-indigo-400" />
                <span>{resolvedPeriod?.label || selectedPeriod}</span>
              </span>
            )}
            {budgets.length > 0 && !isAllBudgetsSelected && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-medium border border-amber-200/50 dark:border-amber-800/50">
                <PieChart className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>
                  {selectedBudgetIds.length === 0 ? 'No budgets' : selectedBudgetNames.join(', ')}
                </span>
              </span>
            )}
          </div>

          {isFiltered && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6558D3] dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <Filter className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Multi-select active banner on mobile if rows selected */}
        {selectedTxIds.size > 0 && (
          <div className="bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 p-2.5 rounded-xl flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[#6558D3] dark:text-indigo-300 font-sans tabular-nums">
              {selectedTxIds.size} selected
            </span>

            <div className="flex items-center gap-1.5 ml-auto">
              {/* 1. Delete action */}
              {!isViewOnly && (
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}

              {/* 2. Single Receipt */}
              {selectedTxIds.size === 1 && (
                <button
                  type="button"
                  onClick={handleDownloadSingleReceipt}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#6558D3] dark:text-[#8174f7]" />
                  <span>Receipt</span>
                </button>
              )}

              {/* 3. Download Options */}
              {selectedTxIds.size >= 1 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDownloadMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#6558D3] dark:text-[#8174f7]" />
                    <span>Download</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isDownloadMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-30 animate-in fade-in zoom-in-95">
                      <button
                        type="button"
                        onClick={() => {
                          generateBulkTransactionsPdf(
                            selectedTransactionsList,
                            `${selectedTransactionsList.length} Transactions Report`,
                            { isDark: isDarkMode }
                          );
                          setIsDownloadMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                      >
                        <FileText className="w-3.5 h-3.5 text-rose-500" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportTransactionsToExcelCsv(
                            selectedTransactionsList,
                            selectedTransactionsList.length === displayedTransactions.length
                              ? 'Ledgerly_Transactions'
                              : 'Ledgerly_Selected_Transactions'
                          );
                          setIsDownloadMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Excel</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedTxIds(new Set());
                  setIsDownloadMenuOpen(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 4. Mobile Cards List matching reference image */}
        {displayedTransactions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/90 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No transactions found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              {isFiltered ? 'Try clearing your filters or search term.' : 'Add your first transaction entry.'}
            </p>
            {isFiltered && (
              <button
                onClick={resetFilters}
                className="px-3.5 py-2 text-xs font-semibold text-[#6558D3] bg-indigo-50 dark:bg-indigo-950/60 rounded-xl"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            {displayedTransactions.map((tx) => {
              const txMode = modes.find((m) => m.id === tx.modeId);
              const paymentMethod = tx.paymentMode || tx.account || 'Bank Transfer';
              const isIncome = tx.type === 'income';
              const isSelected = selectedTxIds.has(tx.id);

              return (
                <div
                  key={tx.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border transition-all shadow-xs ${
                    isSelected
                      ? 'border-[#6558D3] ring-1 ring-[#6558D3]/30 bg-indigo-50/20 dark:bg-indigo-950/20'
                      : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Top section of Card */}
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Checkbox + Direction Icon + Merchant Details */}
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {/* Mobile Row Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleSelectRow(tx.id, e)}
                        className="p-1 -ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0 mt-2"
                        title={isSelected ? 'Deselect' : 'Select'}
                        aria-label={`Select transaction ${tx.merchant}`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#6558D3] dark:text-[#8174f7]" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        )}
                      </button>

                      {/* Direction Icon (Green for Income, Orange for Expense) */}
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          isIncome
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 dark:text-emerald-400'
                            : 'bg-orange-50 dark:bg-orange-950/60 text-orange-500 dark:text-orange-400'
                        }`}
                      >
                        <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                      </div>

                      {/* Stacked Merchant & Metadata */}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {tx.merchant}
                        </h3>

                        {/* Sub-row 1: Category Tag + Payment Mode */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {/* Category pill */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              isIncome
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
                                : 'bg-slate-100 text-slate-700 border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60'
                            }`}
                          >
                            <TagIcon className="w-2.5 h-2.5" />
                            <span>
                              {tx.category}
                              {tx.budgetId && budgetMap.has(tx.budgetId) ? ` · ${budgetMap.get(tx.budgetId)}` : ''}
                            </span>
                          </span>

                          <span className="text-slate-300 dark:text-slate-600 text-xs">•</span>

                          {/* Payment method button */}
                          <button
                            type="button"
                            onClick={() => setMobileActionTx(tx)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#6558D3] dark:text-slate-400 dark:hover:text-[#8174f7] active:scale-95 transition cursor-pointer"
                            title="Tap to change payment mode or options"
                          >
                            {getPaymentIcon(paymentMethod)}
                            <span className="underline decoration-dotted underline-offset-2">{paymentMethod}</span>
                          </button>
                        </div>

                        {/* Sub-row 2: Date + Mode Tag */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 font-sans tabular-nums">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{tx.date}</span>
                          </span>

                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md text-white shadow-xs"
                            style={{ backgroundColor: txMode?.color || '#6558D3' }}
                          >
                            {txMode?.name || 'Combined'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount in bold tabular font */}
                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm sm:text-base font-bold font-sans tabular-nums tracking-tight ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-orange-600 dark:text-orange-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Row: Receipt Trigger + Options Button */}
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 mt-3 flex items-center justify-between">
                    {/* Left: Receipt > */}
                    <button
                      type="button"
                      onClick={() => setPreviewReceiptTx(tx)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[#3F32A3] dark:hover:text-[#8174f7] cursor-pointer min-h-[32px]"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Receipt</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      {Boolean(tx.receiptAttached || tx.receiptDocumentId || tx.receiptDataUrl) && (
                        <span className="ml-1 text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 px-1.5 py-0.2 rounded">
                          Attached
                        </span>
                      )}
                    </button>

                    {/* Right: Options Menu (···) */}
                    <button
                      type="button"
                      onClick={() => setMobileActionTx(tx)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                      title="Transaction options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================
          DESKTOP TRANSACTIONS TABLE & EMPTY STATE (>= 768px)
          ============================================================ */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        {displayedTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">No transactions found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              {transactions.length === 0
                ? 'No transactions recorded yet. Add your first manual entry or import a CSV statement.'
                : 'No transactions match the selected filter criteria. Try selecting "All Dates" or resetting filters.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Entry</span>
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Import CSV</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  {/* Select All Checkbox Icon Column before Date */}
                  <th className="py-3.5 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      title={isAllSelected ? 'Deselect All' : 'Select All'}
                      aria-label="Select all transactions"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#6558D3] dark:text-[#8174f7]" />
                      ) : isSomeSelected ? (
                        <MinusSquare className="w-4 h-4 text-[#6558D3] dark:text-[#8174f7]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Merchant / Source</th>
                  <th className="py-3.5 px-4">Category</th>
                  {/* Payment Mode column (replacing Account) */}
                  <th className="py-3.5 px-4">Payment Mode</th>
                  <th className="py-3.5 px-4">Tags</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Receipt</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedTransactions.map((tx) => {
                  const isSelected = selectedTxIds.has(tx.id);
                  const txMode = modes.find((m) => m.id === tx.modeId);
                  const paymentMethod = tx.paymentMode || tx.account || 'Bank Transfer';

                  return (
                    <tr
                      key={tx.id}
                      className={`transition-colors group ${
                        isSelected
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/60'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {/* Select Button Box Icon before every entry */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelectRow(tx.id, e)}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title={isSelected ? 'Deselect' : 'Select'}
                          aria-label={`Select transaction ${tx.merchant}`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#6558D3] dark:text-[#8174f7]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Date - crisp white numbers in dark mode */}
                      <td className="py-3 px-4 font-sans tabular-nums text-slate-600 dark:text-white font-medium whitespace-nowrap">
                        {tx.date}
                      </td>

                      {/* Merchant + Mode tag if combined */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {tx.merchant}
                          </span>
                          {txMode && (
                            <span
                              className="text-[9px] font-semibold px-1.5 py-0.2 rounded-md text-white"
                              style={{ backgroundColor: txMode.color || '#6558D3' }}
                              title={`Finance Mode: ${txMode.name}`}
                            >
                              {txMode.name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Inline Category Editing */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <select
                          value={tx.category}
                          onChange={(e) => inlineCategoryChange(tx.id, e.target.value)}
                          className="text-xs bg-slate-100/70 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all cursor-pointer"
                        >
                          {allCategories.map((c) => (
                            <option key={c} value={c} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                              {c}
                            </option>
                          ))}
                        </select>
                        {tx.budgetId && budgetMap.has(tx.budgetId) && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[130px]">
                            {budgetMap.get(tx.budgetId)}
                          </div>
                        )}
                      </td>

                      {/* Payment Mode (Dropdown: UPI, Bank Transfer, Cash) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <select
                          value={paymentMethod}
                          onChange={(e) => inlinePaymentModeChange(tx.id, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all cursor-pointer ${
                            paymentMethod === 'UPI'
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                              : paymentMethod === 'Bank Transfer'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          <option value="UPI" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">UPI</option>
                          <option value="Bank Transfer" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Bank Transfer</option>
                          <option value="Cash" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Cash</option>
                        </select>
                      </td>

                      {/* Inline Tags Editing */}
                      <td className="py-3 px-4 max-w-[240px]">
                        <div className="flex flex-wrap items-center gap-1">
                          {tx.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
                            >
                              #{tag}
                              <button
                                onClick={() => handleRemoveInlineTag(tx, tag)}
                                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 ml-0.5"
                                title="Remove tag"
                              >
                                ×
                              </button>
                            </span>
                          ))}

                          {/* Inline Add Tag Button */}
                          {activeInlineTagTxId === tx.id ? (
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="text"
                                placeholder="Tag name"
                                value={newTagVal}
                                onChange={(e) => setNewTagVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddInlineTag(tx);
                                  }
                                }}
                                className="text-[10px] w-20 px-1 py-0.5 border border-[#6558D3] rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                autoFocus
                              />
                              <button
                                onClick={() => handleAddInlineTag(tx)}
                                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  setActiveInlineTagTxId(null);
                                  setNewTagVal('');
                                }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveInlineTagTxId(tx.id);
                                setNewTagVal('');
                              }}
                              className="p-1 text-slate-400 hover:text-[#6558D3] dark:hover:text-[#8174f7] hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-[10px] cursor-pointer"
                              title="Add tag to transaction"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Amount in INR */}
                      <td className="py-3 px-4 text-right font-sans tabular-nums font-bold whitespace-nowrap">
                        <span
                          className={
                            tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'
                          }
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>

                      {/* Receipt Indicator */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {Boolean(tx.receiptAttached || tx.receiptDocumentId || tx.receiptDataUrl) ? (
                          <button
                            type="button"
                            onClick={() => setPreviewReceiptTx(tx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-[#3F32A3] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
                            title={tx.receiptName || 'Click to view & download receipt'}
                          >
                            <Paperclip className="w-3 h-3 text-[#3F32A3] dark:text-[#8174f7]" />
                            <span>Attached</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPreviewReceiptTx(tx)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium text-slate-400 hover:text-[#3F32A3] dark:hover:text-[#8174f7] hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                            title="Generate & download official PDF receipt"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                        )}
                      </td>

                      {/* Edit & Delete Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {!isViewOnly ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditTransactionModal(tx)}
                              className="p-1.5 text-slate-400 hover:text-[#6558D3] dark:hover:text-[#8174f7] hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Edit transaction"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(tx.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (< 768px) is handled above in dedicated mobile block */}
        </>
      )}
      </div>

      {/* ============================================================
          MOBILE BOTTOM SHEETS & MODALS (< 768px)
          ============================================================ */}

      {/* Mobile Filter Bottom Sheet */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl w-full p-5 z-10 border-t border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Sheet Handle */}
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#6558D3]" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Filter Transactions</h3>
              </div>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Date Range Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Date Range
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedDateFilter('period')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      selectedDateFilter === 'period'
                        ? 'bg-[#6558D3] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Calendar Period ({resolvedPeriod?.label || selectedPeriod}) · {filteredTransactions.length}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDateFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      selectedDateFilter === 'all'
                        ? 'bg-[#6558D3] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    All Dates ({transactions.length})
                  </button>
                </div>
              </div>

              {/* Budget Filter */}
              {budgets.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Budget Filter
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => selectAllBudgets()}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                        isAllBudgetsSelected
                          ? 'bg-[#6558D3] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      All Budgets ({budgets.length})
                    </button>
                    {budgets.map((b) => {
                      const isSelected = !isAllBudgetsSelected && selectedBudgetIds.includes(b.id) && selectedBudgetIds.length === 1;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBudgetIds([b.id])}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#6558D3] text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {b.name || b.category} ({formatCurrency(b.monthlyLimit)})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('All')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      selectedCategory === 'All'
                        ? 'bg-[#6558D3] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    All Categories
                  </button>
                  {allCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                        selectedCategory === cat
                          ? 'bg-[#6558D3] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Mode Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Payment Mode
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['All', 'UPI', 'Bank Transfer', 'Cash'].map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setSelectedPaymentMode(pm)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                        selectedPaymentMode === pm
                          ? 'bg-[#6558D3] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6558D3] shadow-sm shadow-[#6558D3]/30"
              >
                Apply ({displayedTransactions.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile More Actions Bottom Sheet */}
      {isMobileMoreOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMoreOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl w-full p-5 z-10 border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">Quick Actions</h3>

            <div className="space-y-1">
              <button
                onClick={() => {
                  setIsMobileMoreOpen(false);
                  setIsImportModalOpen(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                <span>Import CSV Statement</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMoreOpen(false);
                  setIsTagModalOpen(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <TagIcon className="w-4 h-4 text-slate-500" />
                <span>Manage All Tags</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMoreOpen(false);
                  handleToggleSelectAll();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <CheckSquare className="w-4 h-4 text-slate-500" />
                <span>
                  {isAllSelected ? 'Deselect All Transactions' : `Select All (${displayedTransactions.length})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Card Action Sheet (···) */}
      {mobileActionTx && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileActionTx(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl w-full p-5 z-10 border-t border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {mobileActionTx.merchant}
                </h3>
                <span className="text-[11px] text-slate-400 font-sans tabular-nums">
                  {mobileActionTx.date} • {formatCurrency(mobileActionTx.amount)}
                </span>
              </div>
              <button
                onClick={() => setMobileActionTx(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                {isViewOnly ? (
                  <div className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200">
                    {mobileActionTx.category}
                  </div>
                ) : (
                  <select
                    value={mobileActionTx.category}
                    onChange={(e) => {
                      inlineCategoryChange(mobileActionTx.id, e.target.value);
                      setMobileActionTx({ ...mobileActionTx, category: e.target.value });
                    }}
                    className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Payment Mode</span>
                  {!isViewOnly && (
                    <span className="text-[10px] font-normal lowercase tracking-normal text-slate-400">
                      tap to change
                    </span>
                  )}
                </label>
                {isViewOnly ? (
                  <div className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    {getPaymentIcon(mobileActionTx.paymentMode || mobileActionTx.account || 'Bank Transfer')}
                    <span>{mobileActionTx.paymentMode || mobileActionTx.account || 'Bank Transfer'}</span>
                  </div>
                ) : (
                  <select
                    value={mobileActionTx.paymentMode || mobileActionTx.account || 'Bank Transfer'}
                    onChange={(e) => {
                      const newPm = e.target.value;
                      inlinePaymentModeChange(mobileActionTx.id, newPm);
                      setMobileActionTx({
                        ...mobileActionTx,
                        paymentMode: newPm,
                        account: newPm,
                      });
                    }}
                    className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    {(() => {
                      const currentVal = mobileActionTx.paymentMode || mobileActionTx.account || 'Bank Transfer';
                      const list = availablePaymentModes.includes(currentVal)
                        ? availablePaymentModes
                        : [currentVal, ...availablePaymentModes];
                      return list.map((pm) => (
                        <option key={pm} value={pm}>
                          {pm}
                        </option>
                      ));
                    })()}
                  </select>
                )}
              </div>

              {/* Tags Editor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {mobileActionTx.tags.length === 0 ? (
                    <span className="text-[11px] text-slate-400">No tags assigned</span>
                  ) : (
                    mobileActionTx.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        <span>#{t}</span>
                        {!isViewOnly && (
                          <button
                            onClick={() => {
                              handleRemoveInlineTag(mobileActionTx, t);
                              setMobileActionTx({
                                ...mobileActionTx,
                                tags: mobileActionTx.tags.filter((x) => x !== t),
                              });
                            }}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))
                  )}
                </div>

                {!isViewOnly && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Add a new tag..."
                      value={mobileTagInput}
                      onChange={(e) => setMobileTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && mobileTagInput.trim()) {
                          handleAddInlineTag(mobileActionTx, mobileTagInput);
                          setMobileActionTx({
                            ...mobileActionTx,
                            tags: [...mobileActionTx.tags, mobileTagInput.trim()],
                          });
                          setMobileTagInput('');
                        }
                      }}
                      className="flex-1 p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (mobileTagInput.trim()) {
                          handleAddInlineTag(mobileActionTx, mobileTagInput);
                          setMobileActionTx({
                            ...mobileActionTx,
                            tags: [...mobileActionTx.tags, mobileTagInput.trim()],
                          });
                          setMobileTagInput('');
                        }
                      }}
                      className="px-3 py-2 text-xs font-semibold text-white bg-[#6558D3] rounded-xl cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Select, Receipt, or Delete actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewReceiptTx(mobileActionTx);
                    setMobileActionTx(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-white bg-[#3F32A3] hover:bg-[#34278e] rounded-xl shadow-xs transition cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>View & Download Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleToggleSelectRow(mobileActionTx.id);
                    setMobileActionTx(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>
                    {selectedTxIds.has(mobileActionTx.id)
                      ? 'Deselect Transaction'
                      : 'Select Transaction'}
                  </span>
                </button>

                {!isViewOnly && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const target = mobileActionTx;
                        setMobileActionTx(null);
                        openEditTransactionModal(target);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-[#6558D3] dark:text-[#8174f7]" />
                      <span>Edit Transaction</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeletingId(mobileActionTx.id);
                        setMobileActionTx(null);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Transaction</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsBulkDeleteModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 z-10 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Delete {selectedTxIds.size} Transactions?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              This action will permanently remove {selectedTxIds.size} selected transaction record(s) from your ledger.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={bulkDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
              >
                {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setDeletingId(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 z-10 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Transaction?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
