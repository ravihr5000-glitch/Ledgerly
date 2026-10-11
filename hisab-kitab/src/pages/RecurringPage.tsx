import React, { useState } from 'react';
import {
  Repeat,
  Plus,
  Trash2,
  CheckCircle2,
  EyeOff,
  Calendar,
  AlertCircle,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { DetectedPattern, RecurringItem } from '../types/finance';

export const RecurringPage: React.FC = () => {
  const {
    recurringData,
    confirmRecurring,
    ignoreRecurringPattern,
    restoreIgnoredPatterns,
    deleteRecurringItem,
    accounts,
    categories,
    isViewOnly,
  } = useFinance();

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualMerchant, setManualMerchant] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualCadence, setManualCadence] = useState<'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual'>('monthly');
  const [manualCategory, setManualCategory] = useState('Utilities');
  const [manualAccount, setManualAccount] = useState(accounts[0] || 'Main Checking');
  const [manualNextDate, setManualNextDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const numPart = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absVal);
    return isNegative ? `-₹ ${numPart}` : `₹ ${numPart}`;
  };

  const handleKeep = async (pattern: DetectedPattern) => {
    await confirmRecurring({
      merchant: pattern.merchant,
      category: pattern.category,
      account: pattern.account,
      amount: pattern.averageAmount,
      cadence: pattern.cadence,
      isSubscription: false,
      nextExpectedDate: pattern.nextExpectedDate,
    });
  };

  const handleIgnore = async (key: string) => {
    await ignoreRecurringPattern(key);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(manualAmount);
    if (!manualMerchant.trim() || isNaN(amt) || amt <= 0) return;

    try {
      setLoading(true);
      await confirmRecurring({
        merchant: manualMerchant.trim(),
        category: manualCategory,
        account: manualAccount,
        amount: amt,
        cadence: manualCadence,
        isSubscription: false,
        nextExpectedDate: manualNextDate,
      });
      setIsManualModalOpen(false);
      setManualMerchant('');
      setManualAmount('');
    } finally {
      setLoading(false);
    }
  };

  const totals = recurringData?.totals || {
    monthlyBillsTotal: 0,
    annualBillsTotal: 0,
    totalMonthlyCommitments: 0,
    totalAnnualCommitments: 0,
  };

  const suggested = recurringData?.suggestedRecurring || [];
  const confirmed = recurringData?.confirmedBills || [];
  const nextPayment = recurringData?.nextPayment;

  return (
    <div className="space-y-6">
      {/* Commitment Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Monthly Bill Commitments
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-sans tabular-nums tracking-tight">
            {formatCurrency(totals.monthlyBillsTotal)}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Confirmed recurring bills normalized per month
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Annual Bill Commitments
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-sans tabular-nums tracking-tight">
            {formatCurrency(totals.annualBillsTotal)}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Projected 12-month recurring expenditure
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Next Expected Payment
          </span>
          <div className="text-xl font-bold text-[#6558D3] dark:text-[#8174f7] mt-1 truncate">
            {nextPayment ? `${nextPayment.merchant} (${formatCurrency(nextPayment.amount)})` : 'None upcoming'}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {nextPayment ? `Expected on ${nextPayment.nextExpectedDate}` : 'No upcoming payments scheduled'}
          </p>
        </div>
      </div>

      {/* Suggested Recurring Patterns (Detection Engine Output) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Suggested Recurring Bills
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-[#6558D3] dark:text-[#8174f7]">
                {suggested.length} Detected
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Patterns identified across your transaction history. Review and confirm.
            </p>
          </div>

          {!isViewOnly && (
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Recurring Manually</span>
            </button>
          )}
        </div>

        {suggested.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Repeat className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No new recurring bills detected</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-md mx-auto mt-1">
              Ledgerly continuously analyzes interval cadences and stable amounts from real transactions to detect recurring payments.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggested.map((item) => (
              <div
                key={item.key}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 rounded-xl space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.merchant}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.category} • {item.account}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.confidence === 'High'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800'
                    }`}
                  >
                    {item.confidence} Confidence
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-200 dark:border-slate-700/80 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase">Cadence</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{item.cadence}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase">Avg Charge</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-sans tabular-nums">
                      {formatCurrency(item.averageAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase">Occurrences</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.occurrences} dates</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Next date: <strong className="text-slate-800 dark:text-slate-200">{item.nextExpectedDate}</strong>
                  </span>
                  {!isViewOnly && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleIgnore(item.key)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                      >
                        <EyeOff className="w-3 h-3" />
                        <span>Ignore</span>
                      </button>
                      <button
                        onClick={() => handleKeep(item)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-lg shadow-xs cursor-pointer transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Keep (Confirm)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmed Recurring Bills List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirmed Recurring Payments</h3>

        {confirmed.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No confirmed recurring payments</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Confirmed bills will appear here and feed into cash flow forecasts.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {confirmed.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-slate-800/60 px-2 rounded-xl transition-all"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.merchant}</h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {item.category} • {item.account} • {item.cadence} cadence • Next: {item.nextExpectedDate}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-bold font-sans tabular-nums text-slate-900 dark:text-white">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-sans tabular-nums">
                      ~{formatCurrency(item.estimatedMonthly)}/mo
                    </span>
                  </div>
                  {!isViewOnly && (
                    <button
                      onClick={() => deleteRecurringItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                      title="Remove recurring item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Recurring Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsManualModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 z-10 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Add Recurring Bill</h3>
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Merchant / Payee *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Farm, PG&E, Landlord"
                  value={manualMerchant}
                  onChange={(e) => setManualMerchant(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Cadence</label>
                  <select
                    value={manualCadence}
                    onChange={(e) => setManualCadence(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                  >
                    <option value="weekly" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Weekly</option>
                    <option value="biweekly" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Biweekly</option>
                    <option value="monthly" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Monthly</option>
                    <option value="quarterly" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Quarterly</option>
                    <option value="annual" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Annual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Next Date</label>
                  <input
                    type="date"
                    value={manualNextDate}
                    onChange={(e) => setManualNextDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  Save Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
