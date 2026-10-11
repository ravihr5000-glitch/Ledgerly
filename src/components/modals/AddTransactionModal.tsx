import React, { useState, useEffect } from 'react';
import { X, Upload, Plus, Tag as TagIcon, AlertCircle, Layers, Check } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, DEFAULT_PAYMENT_MODES } from '../../types/finance';
import { toISODateString } from '../../utils/dateFilter';

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Expense',
  'Office Supplies & Stationery',
  'Software, Tools & SaaS',
  'Cloud Hosting & Infrastructure (AWS/GCP)',
  'Marketing & Advertising',
  'Advertising Campaigns & Ads',
  'Utilities, Bills & Telecom',
  'Rent, Lease & Real Estate',
  'Travel, Flights & Lodging',
  'Food, Dining & Cafes',
  'Groceries & Provisions',
  'Contractor & Freelancer Fees',
  'Salaries & Payroll',
  'Legal, Compliance & Professional',
  'Taxes, Duties & GST',
  'Inventory & Raw Materials',
  'Equipment, Hardware & Laptops',
  'Shipping, Freight & Logistics',
  'Healthcare & Medical',
  'Insurance (Health, Asset, Liability)',
  'Education, Training & Books',
  'Maintenance, Repairs & Upkeep',
  'Shopping, Apparel & Personal',
  'Transportation, Fuel & Cabs',
  'Banking Fees & Processing',
  'Events, Offsites & Hospitality',
  'Subscriptions & Memberships',
  'Charity, Donations & CSR',
  'Needs review',
  'Other Expense',
];

export const DEFAULT_INCOME_CATEGORIES = [
  'Income',
  'Client Revenue & Contracts',
  'Client Retainers & Invoicing',
  'Salary & Monthly Wages',
  'Freelance & Consulting Fees',
  'Product Sales & E-commerce',
  'Business Revenue',
  'Investments, Stocks & Dividends',
  'Rental & Property Income',
  'Bank Interest & Fixed Deposits',
  'Capital Gains & Trading Profits',
  'Grants, Subsidies & Funding',
  'Refunds, Rebates & Cashbacks',
  'Performance Bonus & Incentives',
  'Affiliate & Referral Earnings',
  'Royalties & Licensing',
  'Expense Reimbursements',
  'Gifts, Awards & Inheritances',
  'Side Hustle Revenue',
  'Other Income',
];

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  transactionToEdit,
}) => {
  const {
    modes,
    activeModeId,
    activeMode,
    modeCategories,
    categories: globalCategories,
    tags: availableTags,
    budgets,
    createTransaction,
    updateTransaction,
    editingTransaction,
    setEditingTransaction,
    uploadDocument,
    setSelectedPeriod,
  } = useFinance();

  const effectiveTx = transactionToEdit !== undefined ? transactionToEdit : editingTransaction;

  const today = toISODateString(new Date());

  const [modeId, setModeId] = useState<string>(activeModeId === 'combined' ? 'business' : activeModeId);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState('Expense');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [receiptAttached, setReceiptAttached] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync modeId and default category when modal opens, active mode changes, or edit target changes
  useEffect(() => {
    if (isOpen) {
      if (effectiveTx) {
        setModeId(effectiveTx.modeId || (activeModeId === 'combined' ? 'business' : activeModeId));
        setType(effectiveTx.type || 'expense');
        setAmount(effectiveTx.amount ? effectiveTx.amount.toString() : '');
        setMerchant(effectiveTx.merchant || '');
        setDate(effectiveTx.date ? effectiveTx.date.slice(0, 10) : today);
        setCategory(effectiveTx.category || 'Expense');
        setSelectedBudgetId(effectiveTx.budgetId || '');
        setPaymentMode(effectiveTx.paymentMode || effectiveTx.account || 'UPI');
        setSelectedTags(Array.isArray(effectiveTx.tags) ? [...effectiveTx.tags] : []);
        setReceiptAttached(Boolean(effectiveTx.receiptAttached || effectiveTx.receiptDocumentId));
        setReceiptFile(null);
        setReceiptDataUrl(effectiveTx.receiptDataUrl || null);
      } else {
        const targetMode = activeModeId === 'combined' ? 'business' : activeModeId;
        setModeId(targetMode);
        setType('expense');
        setAmount('');
        setMerchant('');
        setDate(today);
        setCategory('Expense');
        setSelectedBudgetId('');
        setPaymentMode('UPI');
        setSelectedTags([]);
        setReceiptAttached(false);
        setReceiptFile(null);
        setReceiptDataUrl(null);
      }
    }
  }, [isOpen, activeModeId, effectiveTx]);

  // Cleanup object url on unmount or file change
  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);


  // Determine available categories for the selected mode & type in modal
  const selectedModeObj = modes.find((m) => m.id === modeId);
  const availableCategoriesForMode = React.useMemo(() => {
    const baseList = type === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
    const merged = [...baseList];

    // Include existing categories from modes, global categories, and budgets
    const extra = [
      ...(selectedModeObj?.categories || []),
      ...(modeCategories || []),
      ...(globalCategories || []),
      ...budgets.map((b) => b.category),
    ].filter(Boolean);

    for (const c of extra) {
      if (!merged.some((m) => m.toLowerCase() === c.toLowerCase())) {
        merged.push(c);
      }
    }
    return merged;
  }, [type, selectedModeObj, modeCategories, globalCategories, budgets]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const clean = newTagInput.trim();
    if (clean && !selectedTags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setSelectedTags([...selectedTags, clean]);
      setNewTagInput('');
    }
  };

  const handleToggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setReceiptFile(f);
      setReceiptAttached(true);
      const isImg = Boolean(
        (f.type && f.type.startsWith('image/')) ||
        /\.(png|jpe?g|jpg|webp|gif)$/i.test(f.name)
      );
      if (isImg) {
        try {
          const url = URL.createObjectURL(f);
          setReceiptPreviewUrl(url);
        } catch {
          // ignore
        }
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setReceiptDataUrl(reader.result);
          }
        };
        reader.readAsDataURL(f);
      } else {
        setReceiptPreviewUrl(null);
        setReceiptDataUrl(null);
      }
    }
  };

  const handleRemoveReceiptFile = () => {
    setReceiptFile(null);
    setReceiptAttached(false);
    setReceiptDataUrl(null);
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
      setReceiptPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    if (!merchant.trim()) {
      setError('Please enter a merchant or source name.');
      return;
    }

    if (!date) {
      setError('Please select a valid date.');
      return;
    }

    try {
      setLoading(true);

      let docId: string | undefined = undefined;
      let docName: string | undefined = undefined;

      // Ensure dataUrl is prepared if user selected an image file
      let effectiveDataUrl = receiptDataUrl;
      if (!effectiveDataUrl && receiptFile) {
        const isImg = Boolean(
          (receiptFile.type && receiptFile.type.startsWith('image/')) ||
          /\.(png|jpe?g|jpg|webp|gif)$/i.test(receiptFile.name)
        );
        if (isImg) {
          try {
            effectiveDataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
              reader.onerror = () => resolve('');
              reader.readAsDataURL(receiptFile);
            });
          } catch {
            // fallback
          }
        }
      }

      // If receipt is attached and a file is selected, upload it to vault
      if (receiptFile) {
        try {
          const uploaded = await uploadDocument(receiptFile);
          if (uploaded && uploaded.id) {
            docId = uploaded.id;
            docName = uploaded.originalName;
            if (!effectiveDataUrl && uploaded.dataUrl) {
              effectiveDataUrl = uploaded.dataUrl;
            }
          }
        } catch (uploadErr) {
          console.error('Failed uploading receipt document:', uploadErr);
        }
      }

      const txPayload = {
        modeId,
        type,
        amount: numAmount,
        merchant: merchant.trim(),
        date,
        category,
        paymentMode,
        account: paymentMode,
        tags: selectedTags,
        receiptAttached: Boolean(receiptFile || receiptAttached || effectiveDataUrl || docId),
        receiptDocumentId: docId || effectiveTx?.receiptDocumentId,
        receiptName: docName || (receiptFile ? receiptFile.name : (effectiveTx?.receiptName || (receiptAttached ? 'Receipt attached' : undefined))),
        receiptDataUrl: effectiveDataUrl || effectiveTx?.receiptDataUrl || undefined,
        budgetId: selectedBudgetId || undefined,
      };

      if (effectiveTx) {
        await updateTransaction(effectiveTx.id, txPayload);
      } else {
        await createTransaction(txPayload);
        if (date) {
          await setSelectedPeriod(date);
        }
      }

      // Reset and close
      setAmount('');
      setMerchant('');
      setDate(today);
      setSelectedTags([]);
      setReceiptAttached(false);
      setReceiptFile(null);
      setReceiptDataUrl(null);
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
        setReceiptPreviewUrl(null);
      }
      setEditingTransaction(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEditingTransaction(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col z-10 border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {effectiveTx ? 'Edit Financial Entry' : 'Add Financial Entry'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {effectiveTx ? 'Update transaction details and date' : 'Record a new income or expense transaction'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Finance Mode *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {modes
                .filter((m) => m.id !== 'combined')
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setModeId(m.id);
                      setCategory('Expense');
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                      modeId === m.id
                        ? 'border-[#6558D3] bg-[#6558D3] text-white shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: m.color || '#6558D3' }}
                    />
                    <span className="truncate">{m.name}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Type Toggle: Expense vs. Income */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Transaction Type *
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  if (!DEFAULT_EXPENSE_CATEGORIES.some((c) => c.toLowerCase() === category.toLowerCase())) {
                    setCategory('Expense');
                  }
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Expense (Money Out)
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  if (!DEFAULT_INCOME_CATEGORIES.some((c) => c.toLowerCase() === category.toLowerCase())) {
                    setCategory(modeId === 'business' ? 'Client Revenue' : 'Income');
                  }
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Income (Money In)
              </button>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Amount (₹ INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] font-sans tabular-nums font-semibold transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] transition-all cursor-pointer text-slate-900 dark:text-white"
              />
              {type === 'income' && (
                <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0 shadow-xs" />
                  A green dot will appear below this date in the header calendar.
                </p>
              )}
            </div>
          </div>

          {/* Merchant / Source */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Merchant / Source *
            </label>
            <input
              type="text"
              placeholder="e.g. Axis Bank, Vendor Name, Grocery Store, Client Payout"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Category & Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] transition-all cursor-pointer text-slate-900 dark:text-white"
              >
                {availableCategoriesForMode.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Mode: UPI, Bank Transfer, Cash */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Payment Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] transition-all cursor-pointer font-medium text-slate-900 dark:text-white"
              >
                <option value="UPI" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">UPI</option>
                <option value="Bank Transfer" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Bank Transfer</option>
                <option value="Cash" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Cash</option>
              </select>
            </div>
          </div>

          {/* Budget Association (Optional) */}
          {budgets.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Assign to Budget (Optional)
                </label>
                {type === 'income' && selectedBudgetId && (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    + Adding income to selected budget
                  </span>
                )}
              </div>
              <select
                value={selectedBudgetId}
                onChange={(e) => setSelectedBudgetId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] transition-all cursor-pointer font-medium text-slate-900 dark:text-white"
              >
                <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  None / Auto (Match by Category: {category})
                </option>
                {budgets.map((b) => (
                  <option key={b.id} value={b.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {b.name || b.category} ({b.category}) · Limit ₹{b.monthlyLimit}/mo
                  </option>
                ))}
              </select>
              {selectedBudgetId && (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {type === 'income'
                    ? `✓ Income will be allocated to "${budgets.find((b) => b.id === selectedBudgetId)?.name || 'budget'}" and reflected across dashboard metrics.`
                    : `✓ Expense will be deducted from "${budgets.find((b) => b.id === selectedBudgetId)?.name || 'budget'}".`}
                </p>
              )}
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Tags (Optional)
            </label>
            {/* Existing tag pills */}
            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {availableTags.map((t) => {
                  const isSelected = selectedTags.includes(t.name);
                  return (
                    <button
                      type="button"
                      key={t.name}
                      onClick={() => handleToggleTag(t.name)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#6558D3] text-white border-[#6558D3]'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      #{t.name}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Add new tag inline */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <TagIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Add custom tag (e.g. Urgent, TaxDeductible)"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Add Tag
              </button>
            </div>
          </div>

          {/* Receipt Upload */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={receiptAttached}
                onChange={(e) => setReceiptAttached(e.target.checked)}
                className="rounded text-[#6558D3] focus:ring-[#6558D3] cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Attach Document / Receipt</span>
            </label>

            {receiptAttached && (
              <div className="pt-2 space-y-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="text-xs text-slate-600 dark:text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#6558D3] file:text-white hover:file:bg-[#5749c4] cursor-pointer"
                />
                {receiptFile && (
                  <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    {receiptPreviewUrl ? (
                      <img
                        src={receiptPreviewUrl}
                        alt="Receipt preview"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-[#6558D3]">
                        <Upload className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {receiptFile.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {(receiptFile.size / 1024).toFixed(1)} KB • Ready to save
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveReceiptFile}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Remove receipt"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl transition-all shadow-sm shadow-[#6558D3]/30 disabled:opacity-60 cursor-pointer"
            >
              {effectiveTx ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
              <span>{loading ? 'Saving...' : (effectiveTx ? 'Save Changes' : 'Save Transaction')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
