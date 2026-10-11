import React from 'react';
import { Plus, Edit2, Layers, Briefcase, User } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { getIconComponent } from '../modals/CreateModeModal';
import { MoneyBundle3D } from './MoneyBundle3D';

export const FinanceModeSelector: React.FC = () => {
  const {
    modes,
    activeModeId,
    activeMode,
    switchMode,
    openCreateModeModal,
    openEditModeModal,
    modeStartingBalance,
    modeTransactions,
    isViewOnly,
  } = useFinance();

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const numPart = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(absVal);
    return isNegative ? `-₹ ${numPart}` : `₹ ${numPart}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 sm:p-4 shadow-xs transition-colors">
      {/* Top Header of the Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Finance Mode
            </span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white tracking-wide"
              style={{ backgroundColor: activeMode.color || '#6558D3' }}
            >
              {activeMode.name}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {activeMode.description ||
              (activeModeId === 'combined'
                ? 'Aggregated ledger across all active financial modes'
                : 'Dedicated financial profile with independent balance & categories')}
          </p>
        </div>

        {/* Quick Mode Info & Edit Action */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeModeId !== 'combined' && (
            <div className="text-right hidden md:block">
              <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
                Opening Balance
              </span>
              <span className="text-xs font-sans tabular-nums font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(modeStartingBalance)}
              </span>
            </div>
          )}

          {activeModeId !== 'combined' && !isViewOnly && (
            <button
              onClick={() => openEditModeModal(activeMode)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Edit mode opening balance or categories"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Edit Mode</span>
            </button>
          )}

          {!isViewOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={openCreateModeModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6558D3] hover:bg-[#5749c4] rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Create Mode</span>
              </button>

              {/* 3D Floating Money Bundle shifted beside Create Mode on mobile */}
              <div className="md:hidden flex items-center shrink-0">
                <MoneyBundle3D isMobile />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Tabs / Pills for All Modes */}
      <div className="pt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {modes.map((mode) => {
          const isActive = activeModeId === mode.id;
          const IconComp = getIconComponent(mode.icon);
          const modeColor = mode.color || '#6558D3';

          return (
            <button
              key={mode.id}
              onClick={() => switchMode(mode.id)}
              className={`group shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                isActive
                  ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900 dark:border-slate-700 shadow-sm'
                  : 'bg-slate-50/80 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                }`}
                style={{
                  backgroundColor: isActive ? modeColor : `${modeColor}20`,
                  color: isActive ? '#ffffff' : modeColor,
                }}
              >
                <IconComp className="w-3 h-3" />
              </span>
              <span>{mode.name}</span>
              {mode.isCustom && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">
                  Custom
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
