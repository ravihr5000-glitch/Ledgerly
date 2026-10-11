import React, { useState } from 'react';
import {
  Target,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Goal } from '../types/finance';

export const GoalsPage: React.FC = () => {
  const { goals, createGoal, updateGoal, contributeGoal, deleteGoal, isViewOnly } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formCurrent, setFormCurrent] = useState('0');
  const [formDueDate, setFormDueDate] = useState('');
  const [formNote, setFormNote] = useState('');

  // Contribute modal
  const [contributeGoalItem, setContributeGoalItem] = useState<Goal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const numPart = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absVal);
    return isNegative ? `-₹ ${numPart}` : `₹ ${numPart}`;
  };

  const handleOpenCreate = () => {
    setEditingGoal(null);
    setFormName('');
    setFormTarget('');
    setFormCurrent('0');
    setFormDueDate('');
    setFormNote('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g: Goal) => {
    setEditingGoal(g);
    setFormName(g.name);
    setFormTarget(g.targetAmount.toString());
    setFormCurrent(g.currentAmount.toString());
    setFormDueDate(g.dueDate || '');
    setFormNote(g.note || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseFloat(formTarget);
    const currentNum = parseFloat(formCurrent || '0');

    if (!formName.trim() || isNaN(targetNum) || targetNum <= 0) {
      setError('Please provide a goal name and positive target amount.');
      return;
    }

    try {
      setLoading(true);
      if (editingGoal) {
        await updateGoal(editingGoal.id, {
          name: formName.trim(),
          targetAmount: targetNum,
          currentAmount: Math.max(0, isNaN(currentNum) ? 0 : currentNum),
          dueDate: formDueDate.trim() || undefined,
          note: formNote.trim() || undefined,
        });
      } else {
        await createGoal({
          name: formName.trim(),
          targetAmount: targetNum,
          currentAmount: Math.max(0, isNaN(currentNum) ? 0 : currentNum),
          dueDate: formDueDate.trim() || undefined,
          note: formNote.trim() || undefined,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save goal.');
    } finally {
      setLoading(false);
    }
  };

  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoalItem) return;
    const addAmt = parseFloat(contributeAmount);
    if (isNaN(addAmt) || addAmt <= 0) return;

    try {
      setLoading(true);
      await contributeGoal(contributeGoalItem.id, addAmt);
      setContributeGoalItem(null);
      setContributeAmount('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Savings Goals</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set and track targets for emergency funds, vacations, or major milestones
          </p>
        </div>

        {!isViewOnly && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Goal</span>
          </button>
        )}
      </div>

      {/* Goals Grid or Strict Empty State */}
      {goals.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto mb-3">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No savings goals created yet</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Plan your financial milestones. Create an emergency fund, dream vacation, or down payment goal.
          </p>
          {!isViewOnly && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Goal</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((g) => {
            const remaining = Math.max(0, g.targetAmount - g.currentAmount);
            const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
            const isCompleted = g.currentAmount >= g.targetAmount;

            return (
              <div
                key={g.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{g.name}</h4>
                      {g.dueDate && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" /> Due {g.dueDate}
                        </span>
                      )}
                    </div>
                    {!isViewOnly && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(g)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Goal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteGoal(g.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Goal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {g.note && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      {g.note}
                    </p>
                  )}
                </div>

                {/* Progress bar & metrics */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-xl font-bold font-sans tabular-nums text-slate-900 dark:text-slate-100 tracking-tight">
                      {formatCurrency(g.currentAmount)}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 font-sans tabular-nums text-[11px]">
                      Target: {formatCurrency(g.targetAmount)}
                    </span>
                  </div>

                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isCompleted ? 'bg-emerald-500' : 'bg-[#6558D3]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{pct}% funded</span>
                    <span>
                      {isCompleted ? (
                        <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Goal Completed!</strong>
                      ) : (
                        <span>Remaining: {formatCurrency(remaining)}</span>
                      )}
                    </span>
                  </div>
                </div>

                {!isViewOnly && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setContributeGoalItem(g);
                        setContributeAmount('');
                      }}
                      className="w-full py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
                    >
                      + Add Contribution
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 z-10 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
              {editingGoal ? 'Edit Goal' : 'Create New Goal'}
            </h3>

            {error && (
              <div className="p-3 mb-3 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Goal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 6-Month Emergency Fund"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="e.g. 10000"
                    value={formTarget}
                    onChange={(e) => setFormTarget(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Saved (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={formCurrent}
                    onChange={(e) => setFormCurrent(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Due Date (optional)
                </label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stored in High-Yield Savings Account"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                />
              </div>

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
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {editingGoal ? 'Update Goal' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contribution Modal */}
      {contributeGoalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setContributeGoalItem(null)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 z-10 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Add Contribution to &quot;{contributeGoalItem.name}&quot;
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Currently saved: {formatCurrency(contributeGoalItem.currentAmount)}
            </p>

            <form onSubmit={handleContributeSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contribution Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6558D3]"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setContributeGoalItem(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Record Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
