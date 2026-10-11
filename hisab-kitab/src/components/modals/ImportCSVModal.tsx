import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { api } from '../../services/api';
import { ColumnMapping, ImportSummary } from '../../types/finance';

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportCSVModal: React.FC<ImportCSVModalProps> = ({ isOpen, onClose }) => {
  const {
    accounts,
    refreshAll,
    activeModeId,
    modes,
    modeCategories,
    categories,
    budgets,
    selectedPeriod,
    setSelectedPeriod,
  } = useFinance();

  const [step, setStep] = useState<'upload' | 'mapping' | 'result'>('upload');
  const [csvContent, setCsvContent] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  // Simplified column mapping: Date, Merchant, Amount, Budget (optional)
  const [mapping, setMapping] = useState<{
    dateCol: string;
    merchantCol: string;
    amountCol: string;
    budgetCol?: string;
  }>({
    dateCol: '',
    merchantCol: '',
    amountCol: '',
    budgetCol: '',
  });

  // Category to assign to imported transactions
  const [selectedCategory, setSelectedCategory] = useState<string>('Expense');

  // Budget to assign to imported transactions (Requested: Assign to the Budget option)
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');

  // Default payment mode (Bank Transfer, UPI, Cash, etc.)
  const [defaultAccount, setDefaultAccount] = useState<string>('Bank Transfer');

  // Target finance mode (Business, Personal, etc.)
  const [targetModeId, setTargetModeId] = useState<string>(() => {
    return activeModeId === 'combined'
      ? (modes.find((m) => m.id !== 'combined')?.id || 'business')
      : activeModeId;
  });

  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unified available category list
  const categoryOptions = useMemo(() => {
    const set = new Set<string>(['Expense']);
    (modeCategories || []).forEach((c) => {
      if (c && c.trim()) set.add(c.trim());
    });
    (categories || []).forEach((c) => {
      if (c && c.trim()) set.add(c.trim());
    });
    return Array.from(set);
  }, [modeCategories, categories]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvContent(content);
        processCSV(content);
      }
    };
    reader.readAsText(file);
  };

  const processCSV = async (content: string) => {
    try {
      setLoading(true);
      setError(null);
      const parsed = await api.parseCSV(content);
      setHeaders(parsed.headers);
      setSampleRows(parsed.sampleRows);
      setTotalRows(parsed.totalRows);

      if (parsed.detectedMapping) {
        setMapping({
          dateCol: parsed.detectedMapping.dateCol || '',
          merchantCol: parsed.detectedMapping.merchantCol || '',
          amountCol: parsed.detectedMapping.amountCol || '',
          budgetCol: parsed.detectedMapping.budgetCol || '',
        });
      } else {
        setMapping({
          dateCol: parsed.headers[0] || '',
          merchantCol: parsed.headers[1] || '',
          amountCol: parsed.headers[2] || '',
          budgetCol: '',
        });
      }

      setStep('mapping');
    } catch (err: any) {
      setError(err.message || 'Failed to read CSV structure');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!mapping.dateCol || !mapping.merchantCol || !mapping.amountCol) {
      setError('Please select columns for Date, Merchant / Description, and Amount.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const mappingPayload: ColumnMapping = {
        dateCol: mapping.dateCol,
        merchantCol: mapping.merchantCol,
        amountCol: mapping.amountCol,
        budgetCol: mapping.budgetCol || undefined,
      };

      const res = await api.importCSV(
        csvContent,
        mappingPayload,
        defaultAccount,
        targetModeId,
        selectedCategory,
        selectedBudgetId || undefined
      );

      setSummary(res.summary);
      setStep('result');

      // Refresh all context state from backend
      await refreshAll();

      // Ensure the imported transactions are immediately reflected in dashboard cards
      // If the current filter restricts to today/this month, broaden to 'All time' so
      // all imported transactions are guaranteed to be counted and visible.
      if (selectedPeriod !== 'All time') {
        setSelectedPeriod('All time');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import CSV transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setCsvContent('');
    setHeaders([]);
    setSampleRows([]);
    setSelectedBudgetId('');
    setSummary(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#070e24] text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#6558D3]/10 dark:bg-[#6558D3]/20 text-[#6558D3] dark:text-[#8174f7] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                Import Bank Statement (CSV)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Automatic mapping, centralized duplicate detection & rules processing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Upload or Paste */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-[#6558D3] dark:hover:border-[#6558D3] rounded-2xl p-6 sm:p-8 text-center transition-colors bg-slate-50/50 dark:bg-slate-900/40">
                <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Select CSV file from your device
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
                  Compatible with HDFC, SBI, ICICI, Axis, Chase, Bank of America, Amex, and all standard statement CSV files
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#6558D3] hover:bg-[#5749c4] text-white text-xs font-semibold rounded-xl cursor-pointer shadow-sm shadow-[#6558D3]/30 transition-all">
                  <span>Browse CSV File</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Or paste raw CSV text:
                </p>
                <textarea
                  rows={4}
                  placeholder={`Date,Description,Amount\n2026-09-25,Mukesh,9200.00\n2026-09-25,Mukesh,1000.00`}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                />
              </div>

              {csvContent.trim() && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => processCSV(csvContent)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    <span>Analyze Columns</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Column Mapping & Category Selection */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                Found <span className="font-bold text-slate-900 dark:text-white">{totalRows}</span> rows in CSV.
                Please verify the column mapping and category below before importing.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Date Column */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date Column *
                  </label>
                  <select
                    value={mapping.dateCol}
                    onChange={(e) => setMapping({ ...mapping, dateCol: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6558D3] cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      -- Select Column --
                    </option>
                    {headers.map((h) => (
                      <option key={h} value={h} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Merchant / Description Column */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Merchant / Description Column *
                  </label>
                  <select
                    value={mapping.merchantCol}
                    onChange={(e) => setMapping({ ...mapping, merchantCol: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6558D3] cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      -- Select Column --
                    </option>
                    {headers.map((h) => (
                      <option key={h} value={h} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Amount Column */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount Column *
                  </label>
                  <select
                    value={mapping.amountCol}
                    onChange={(e) => setMapping({ ...mapping, amountCol: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6558D3] cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      -- Select Column --
                    </option>
                    {headers.map((h) => (
                      <option key={h} value={h} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Category Dropdown (Requested New Field) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6558D3] cursor-pointer"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Default Payment Mode */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Payment Mode
                  </label>
                  <select
                    value={defaultAccount}
                    onChange={(e) => setDefaultAccount(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6558D3] cursor-pointer"
                  >
                    <option value="Bank Transfer" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      Bank Transfer
                    </option>
                    <option value="UPI" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      UPI
                    </option>
                    <option value="Cash" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      Cash
                    </option>
                    {accounts
                      .filter((a) => !['Bank Transfer', 'UPI', 'Cash'].includes(a))
                      .map((a) => (
                        <option key={a} value={a} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                          {a}
                        </option>
                      ))}
                  </select>
                </div>

                {/* 6. Target Finance Mode */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Ledger / Mode
                  </label>
                  <select
                    value={targetModeId}
                    onChange={(e) => setTargetModeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6558D3] cursor-pointer"
                  >
                    {modes
                      .filter((m) => m.id !== 'combined')
                      .map((m) => (
                        <option key={m.id} value={m.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                          {m.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* 7. ASSIGN TO THE BUDGET Option (Requested Feature) */}
                <div className="sm:col-span-2 p-3.5 bg-gradient-to-r from-[#6558D3]/5 via-[#6558D3]/10 to-transparent dark:from-[#6558D3]/10 dark:via-[#6558D3]/20 border border-[#6558D3]/30 rounded-xl">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Assign to the Budget
                    </label>
                    <span className="text-[10px] text-[#6558D3] dark:text-[#8174f7] font-semibold">
                      Budget Association
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Select Budget
                      </label>
                      <select
                        value={selectedBudgetId}
                        onChange={(e) => setSelectedBudgetId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6558D3] cursor-pointer font-medium"
                      >
                        <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                          Auto (Match by Category: {selectedCategory})
                        </option>
                        {budgets.map((b) => (
                          <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                            {b.name || b.category} ({b.category}) · Limit ₹{b.monthlyLimit}/mo
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Or Map Budget Column from CSV (Optional)
                      </label>
                      <select
                        value={mapping.budgetCol || ''}
                        onChange={(e) => setMapping({ ...mapping, budgetCol: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6558D3] cursor-pointer"
                      >
                        <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                          -- None (Use Dropdown Selection) --
                        </option>
                        {headers.map((h) => (
                          <option key={h} value={h} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    All imported statement transactions will be linked to the designated budget and reflected in budget calculations and transactions views.
                  </p>
                </div>
              </div>

              {/* Sample preview table */}
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  Preview (First 3 rows)
                </p>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        {headers.slice(0, 5).map((h) => (
                          <th key={h} className="p-2.5 truncate font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {sampleRows.slice(0, 3).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {headers.slice(0, 5).map((h) => (
                            <td key={h} className="p-2.5 truncate max-w-[150px]">
                              {r[h] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Back to file
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-sm shadow-[#6558D3]/30 disabled:opacity-60 cursor-pointer transition-all"
                >
                  {loading ? 'Processing Import...' : 'Execute Import'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Result Summary Report */}
          {step === 'result' && summary && (
            <div className="space-y-5 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Import Completed</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Transactions have been processed and connected directly to your dashboard calculations.
                </p>
              </div>

              {/* Metrics summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl">
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Transactions inserted</p>
                  <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100 font-sans tabular-nums mt-0.5">
                    {summary.transactionsInserted}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Duplicates skipped</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-200 font-sans tabular-nums mt-0.5">
                    {summary.duplicatesSkipped}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Rows skipped</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-200 font-sans tabular-nums mt-0.5">
                    {summary.rowsSkipped}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Items needing review</p>
                  <p className="text-xl font-bold text-amber-900 dark:text-amber-100 font-sans tabular-nums mt-0.5">
                    {summary.itemsNeedingReview}
                  </p>
                </div>
              </div>

              {summary.assignedBudget && (
                <div className="p-3 bg-[#6558D3]/10 dark:bg-[#6558D3]/20 border border-[#6558D3]/30 rounded-xl text-left flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-[#6558D3] dark:text-[#8174f7]">Assigned to Budget</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{summary.assignedBudget}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#6558D3] text-white font-medium">Linked</span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Import Another File</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-sm cursor-pointer transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
