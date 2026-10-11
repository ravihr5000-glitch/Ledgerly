import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  PieChart,
  Plus,
  Briefcase,
  User,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { isDateInPeriodString, isInternalTransfer } from '../../utils/dateFilter';
import { getIconComponent } from '../modals/CreateModeModal';

export interface CashFlowCategoryItem {
  id: 'money_in' | 'money_out' | 'money_saved';
  name: string;
  description: string;
  amount: number;
  rawAmount: number;
  dotColorClass: string;
  dotGlow: string;
  dotHex: string;
  fromColor: string;
  toColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  type: 'income' | 'expense' | 'savings';
}

interface CategoryDonutChartProps {
  onNavigate?: (page: any) => void;
}

interface DonutSlice {
  id: string;
  name: string;
  description: string;
  amount: number;
  rawAmount: number;
  pct: number;
  startAngle: number;
  endAngle: number;
  fromColor: string;
  toColor: string;
  dotHex: string;
  pathD: string;
  isFullRing: boolean;
  gradCoords: { x1: number; y1: number; x2: number; y2: number };
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ onNavigate }) => {
  const {
    modes,
    activeMode,
    activeModeId,
    switchMode,
    openCreateModeModal,
    transactions,
    budgets,
    selectedPeriod,
    resolvedPeriod,
    isViewOnly,
  } = useFinance();

  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);
  const [isChartHovered, setIsChartHovered] = useState(false);

  // Currency formatter
  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const maxDigits = val % 1 === 0 ? 0 : 2;
    const numPart = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: maxDigits,
      maximumFractionDigits: maxDigits,
    }).format(absVal);
    return isNegative ? `-₹\u00A0${numPart}` : `₹\u00A0${numPart}`;
  };

  // 1. Transactions belonging to the active mode and within the selected calendar period
  const modeTransactionsInPeriod = useMemo(() => {
    return transactions.filter((t) => {
      if (activeModeId !== 'combined' && t.modeId !== activeModeId) return false;
      if (!isDateInPeriodString(t.date, selectedPeriod)) return false;
      if (isInternalTransfer(t)) return false;
      return true;
    });
  }, [transactions, activeModeId, selectedPeriod]);

  // 2. Transactions from all budgets combined:
  // If budgets exist, matches any transaction assigned to a budget or having a category belonging to any budget.
  // If no budgets exist, uses all mode transactions.
  const transactionsAcrossAllBudgets = useMemo(() => {
    if (budgets.length === 0) return modeTransactionsInPeriod;

    const bIds = new Set(budgets.map((b) => b.id));
    const bCats = new Set(
      budgets.map((b) => (b.category || '').toLowerCase().trim()).filter(Boolean)
    );

    const matched = modeTransactionsInPeriod.filter((t) => {
      if (t.budgetId && bIds.has(t.budgetId)) return true;
      const cat = (t.category || '').toLowerCase().trim();
      if (cat && bCats.has(cat)) return true;
      return false;
    });

    return matched.length > 0 ? matched : modeTransactionsInPeriod;
  }, [modeTransactionsInPeriod, budgets]);

  // 3. Calculate values using actual transaction data from all budgets combined:
  // Money In: Total income across all budgets
  const moneyIn = useMemo(() => {
    return transactionsAcrossAllBudgets
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactionsAcrossAllBudgets]);

  // Money Out: Total expenses across all budgets
  const moneyOut = useMemo(() => {
    return transactionsAcrossAllBudgets
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactionsAcrossAllBudgets]);

  // Money Saved: Total savings across all budgets
  const moneySaved = useMemo(() => {
    return moneyIn - moneyOut;
  }, [moneyIn, moneyOut]);

  // 4. Three categories according to the selected mode
  const categoriesList: CashFlowCategoryItem[] = useMemo(() => {
    return [
      {
        id: 'money_in',
        name: 'Money In',
        description: 'Total income across all budgets.',
        amount: moneyIn,
        rawAmount: moneyIn,
        dotColorClass: 'bg-emerald-500',
        dotGlow: '#10b981',
        dotHex: '#10b981',
        fromColor: '#34d399',
        toColor: '#059669',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeText: '#10b981',
        badgeBorder: 'rgba(16, 185, 129, 0.4)',
        type: 'income',
      },
      {
        id: 'money_out',
        name: 'Money Out',
        description: 'Total expenses across all budgets.',
        amount: moneyOut,
        rawAmount: moneyOut,
        dotColorClass: 'bg-orange-500',
        dotGlow: '#f97316',
        dotHex: '#f97316',
        fromColor: '#fb923c',
        toColor: '#ea580c',
        badgeBg: 'rgba(249, 115, 22, 0.15)',
        badgeText: '#f97316',
        badgeBorder: 'rgba(249, 115, 22, 0.4)',
        type: 'expense',
      },
      {
        id: 'money_saved',
        name: 'Money Saved',
        description: 'Total savings across all budgets.',
        amount: moneySaved > 0 ? moneySaved : 0,
        rawAmount: moneySaved,
        dotColorClass: moneySaved < 0 ? 'bg-rose-500' : 'bg-blue-500',
        dotGlow: moneySaved < 0 ? '#f43f5e' : '#3b82f6',
        dotHex: moneySaved < 0 ? '#f43f5e' : '#3b82f6',
        fromColor: moneySaved < 0 ? '#fb7185' : '#38bdf8',
        toColor: moneySaved < 0 ? '#e11d48' : '#2563eb',
        badgeBg: moneySaved < 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)',
        badgeText: moneySaved < 0 ? '#f43f5e' : '#3b82f6',
        badgeBorder: moneySaved < 0 ? 'rgba(244, 63, 94, 0.4)' : 'rgba(56, 189, 248, 0.4)',
        type: 'savings',
      },
    ];
  }, [moneyIn, moneyOut, moneySaved]);

  // Geometry parameters: viewBox 320x320, center at (160, 160)
  const CX = 160;
  const CY = 160;
  const R_OUTER = 118; // Outer radius
  const R_INNER = 80;  // Inner radius (thickness: 38px)
  const R_MID = (R_OUTER + R_INNER) / 2; // 99px

  // Compute Donut Slices for visualization
  const activeItemsForChart = useMemo(() => {
    return categoriesList.filter((item) => item.amount > 0);
  }, [categoriesList]);

  const totalChartAmount = useMemo(() => {
    return activeItemsForChart.reduce((sum, item) => sum + item.amount, 0);
  }, [activeItemsForChart]);

  const slices: DonutSlice[] = useMemo(() => {
    if (activeItemsForChart.length === 0 || totalChartAmount <= 0) {
      return [];
    }

    if (activeItemsForChart.length === 1) {
      const item = activeItemsForChart[0];
      const pathD =
        `M ${CX} ${(CY - R_OUTER).toFixed(2)} ` +
        `A ${R_OUTER} ${R_OUTER} 0 1 1 ${CX} ${(CY + R_OUTER).toFixed(2)} ` +
        `A ${R_OUTER} ${R_OUTER} 0 1 1 ${CX} ${(CY - R_OUTER).toFixed(2)} ` +
        `M ${CX} ${(CY - R_INNER).toFixed(2)} ` +
        `A ${R_INNER} ${R_INNER} 0 1 0 ${CX} ${(CY + R_INNER).toFixed(2)} ` +
        `A ${R_INNER} ${R_INNER} 0 1 0 ${CX} ${(CY - R_INNER).toFixed(2)} Z`;

      return [
        {
          id: item.id,
          name: item.name,
          description: item.description,
          amount: item.amount,
          rawAmount: item.rawAmount,
          pct: 100,
          startAngle: -Math.PI / 2,
          endAngle: 1.5 * Math.PI,
          fromColor: item.fromColor,
          toColor: item.toColor,
          dotHex: item.dotHex,
          pathD,
          isFullRing: true,
          gradCoords: {
            x1: CX - R_OUTER,
            y1: CY - R_OUTER,
            x2: CX + R_OUTER,
            y2: CY + R_OUTER,
          },
        },
      ];
    }

    const result: DonutSlice[] = [];
    let currentAngle = -Math.PI / 2;
    const gapAngle = 0.025;

    activeItemsForChart.forEach((item) => {
      const pct = (item.amount / totalChartAmount) * 100;
      const angleSpan = (item.amount / totalChartAmount) * (2 * Math.PI);
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSpan;

      const effStart = startAngle + gapAngle / 2;
      const effEnd = endAngle - gapAngle / 2;
      const effectiveSpan = Math.max(0.001, effEnd - effStart);

      const pOuterStart = {
        x: CX + R_OUTER * Math.cos(effStart),
        y: CY + R_OUTER * Math.sin(effStart),
      };
      const pOuterEnd = {
        x: CX + R_OUTER * Math.cos(effEnd),
        y: CY + R_OUTER * Math.sin(effEnd),
      };
      const pInnerEnd = {
        x: CX + R_INNER * Math.cos(effEnd),
        y: CY + R_INNER * Math.sin(effEnd),
      };
      const pInnerStart = {
        x: CX + R_INNER * Math.cos(effStart),
        y: CY + R_INNER * Math.sin(effStart),
      };

      const largeArcFlag = effectiveSpan > Math.PI ? 1 : 0;

      const pathD =
        `M ${pOuterStart.x.toFixed(2)} ${pOuterStart.y.toFixed(2)} ` +
        `A ${R_OUTER} ${R_OUTER} 0 ${largeArcFlag} 1 ${pOuterEnd.x.toFixed(2)} ${pOuterEnd.y.toFixed(2)} ` +
        `L ${pInnerEnd.x.toFixed(2)} ${pInnerEnd.y.toFixed(2)} ` +
        `A ${R_INNER} ${R_INNER} 0 ${largeArcFlag} 0 ${pInnerStart.x.toFixed(2)} ${pInnerStart.y.toFixed(2)} Z`;

      const gradCoords = {
        x1: Number((CX + R_MID * Math.cos(effStart)).toFixed(2)),
        y1: Number((CY + R_MID * Math.sin(effStart)).toFixed(2)),
        x2: Number((CX + R_MID * Math.cos(effEnd)).toFixed(2)),
        y2: Number((CY + R_MID * Math.sin(effEnd)).toFixed(2)),
      };

      result.push({
        id: item.id,
        name: item.name,
        description: item.description,
        amount: item.amount,
        rawAmount: item.rawAmount,
        pct,
        startAngle,
        endAngle,
        fromColor: item.fromColor,
        toColor: item.toColor,
        dotHex: item.dotHex,
        pathD,
        isFullRing: false,
        gradCoords,
      });

      currentAngle = endAngle;
    });

    return result;
  }, [activeItemsForChart, totalChartAmount]);

  const activeHoveredCategory = useMemo(() => {
    if (!hoveredCategoryId) return null;
    return categoriesList.find((c) => c.id === hoveredCategoryId) || null;
  }, [hoveredCategoryId, categoriesList]);

  // Date context label
  const dateContextLabel = resolvedPeriod?.label || selectedPeriod;

  // Percentage calculations
  const totalFlow = moneyIn + moneyOut;
  const incomePct = totalFlow > 0 ? Math.round((moneyIn / totalFlow) * 100) : 0;
  const expensePct = totalFlow > 0 ? Math.round((moneyOut / totalFlow) * 100) : 0;
  const savingsRate = moneyIn > 0 ? Math.round((moneySaved / moneyIn) * 100) : 0;

  // Separate default modes from custom created modes
  const customCreatedModes = useMemo(() => {
    return modes.filter((m) => m.isCustom || !['business', 'personal', 'combined'].includes(m.id));
  }, [modes]);

  return (
    <div className="bg-white dark:bg-[#070e24] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs dark:shadow-xl relative overflow-hidden flex flex-col transition-colors">
      {/* Background ambient lighting */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 dark:opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 40%, #15224a 0%, #080d1d 80%)',
        }}
      />

      {/* Header with Title and Mode indicator */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
            <span>Breakdown by Category</span>
            <span
              className="w-2 h-2 rounded-full shadow-[0_0_8px_#10b981]"
              style={{ backgroundColor: activeMode.color || '#10b981' }}
              title={`${activeMode.name} Mode Active`}
            />
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {activeMode.name} Mode · {dateContextLabel}
          </p>
        </div>

        {/* Action Controls: Rotation Badge + Active Mode Pill */}
        <div className="flex items-center gap-2">
          {/* Pause / 2x Speed Status Badge */}
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 px-2 py-0.5 rounded-full select-none flex items-center gap-1.5 shrink-0">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isChartHovered ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span>{isChartHovered ? 'Paused' : '2x Spin'}</span>
          </div>

          {/* Active Mode Pill */}
          <div
            className="text-[11px] font-bold text-white px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1.5 shrink-0"
            style={{ backgroundColor: activeMode.color || '#6558D3' }}
          >
            <span>{activeMode.name}</span>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs Strip inside Breakdown by Category:
          Displays default modes (Business, Personal, Combined) AND dynamically adds any
          custom mode created by the user ("only if we create")! */}
      <div className="relative z-10 pt-1 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
        {modes.map((m) => {
          const isSelected = activeModeId === m.id;
          const IconComp = getIconComponent(m.icon || 'Briefcase');
          const modeColor = m.color || '#6558D3';

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => switchMode(m.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900 dark:border-slate-700 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={`Switch Breakdown to ${m.name} Mode`}
            >
              <span
                className="w-4 h-4 rounded-md flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: isSelected ? modeColor : `${modeColor}25`,
                  color: isSelected ? '#ffffff' : modeColor,
                }}
              >
                <IconComp className="w-2.5 h-2.5" />
              </span>
              <span className="truncate">{m.name}</span>
              {m.isCustom && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold shrink-0">
                  Custom
                </span>
              )}
            </button>
          );
        })}

        {!isViewOnly && (
          <button
            type="button"
            onClick={openCreateModeModal}
            className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-medium text-slate-500 hover:text-[#6558D3] dark:text-slate-400 dark:hover:text-white bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-dashed border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            title="Create a new mode to add it to this breakdown"
          >
            <Plus className="w-3 h-3" />
            <span>New Mode</span>
          </button>
        )}
      </div>

      {/* Center Donut Chart Container */}
      <div className="relative z-10 my-3 flex items-center justify-center">
        <div
          className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center select-none"
          onMouseEnter={() => setIsChartHovered(true)}
          onMouseLeave={() => {
            setIsChartHovered(false);
            setHoveredCategoryId(null);
          }}
        >
          {/* Static Guide concentric rings */}
          <svg
            viewBox="0 0 320 320"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <circle
              cx={CX}
              cy={CY}
              r={140}
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1.2"
            />
            <circle
              cx={CX}
              cy={CY}
              r={60}
              fill="none"
              stroke="rgba(255, 255, 255, 0.04)"
              strokeWidth="1"
            />
          </svg>

          {/* Smooth rotating Donut SVG Ring */}
          <div
            className="w-full h-full animate-donut-spin"
            style={{
              animationPlayState: isChartHovered ? 'paused' : 'running',
              transformOrigin: 'center center',
            }}
          >
            <svg
              viewBox="0 0 320 320"
              className="w-full h-full overflow-visible"
              shapeRendering="geometricPrecision"
            >
              <defs>
                <filter id="crisp-hover-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.6" />
                </filter>

                {slices.map((slice, idx) => (
                  <linearGradient
                    key={`grad-${slice.id}-${idx}`}
                    id={`donut-grad-${idx}`}
                    x1={slice.gradCoords.x1}
                    y1={slice.gradCoords.y1}
                    x2={slice.gradCoords.x2}
                    y2={slice.gradCoords.y2}
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor={slice.fromColor} />
                    <stop offset="100%" stopColor={slice.toColor} />
                  </linearGradient>
                ))}

                <linearGradient id="empty-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#f97316" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Inner background disc */}
              <circle
                cx={CX}
                cy={CY}
                r={R_INNER - 1}
                className="fill-white dark:fill-[#080d1d] transition-colors"
              />

              {/* Empty placeholder track if all 3 values are zero */}
              {slices.length === 0 && (
                <circle
                  cx={CX}
                  cy={CY}
                  r={R_MID}
                  fill="none"
                  stroke="url(#empty-ring-grad)"
                  strokeWidth={R_OUTER - R_INNER}
                  strokeDasharray="6 4"
                  opacity={0.4}
                />
              )}

              {/* Slices Rendering */}
              {slices.map((slice, idx) => {
                const isHovered = hoveredCategoryId === slice.id;
                return (
                  <path
                    key={slice.id}
                    d={slice.pathD}
                    fill={`url(#donut-grad-${idx})`}
                    className="cursor-pointer transition-all duration-300"
                    style={{
                      opacity: hoveredCategoryId && !isHovered ? 0.45 : 1,
                      transform: isHovered ? 'scale(1.035)' : 'scale(1)',
                      transformOrigin: `${CX}px ${CY}px`,
                      filter: isHovered ? 'url(#crisp-hover-shadow)' : 'none',
                    }}
                    onMouseEnter={() => {
                      setIsChartHovered(true);
                      setHoveredCategoryId(slice.id);
                    }}
                    onMouseLeave={() => {
                      setIsChartHovered(false);
                      setHoveredCategoryId(null);
                    }}
                  />
                );
              })}
            </svg>
          </div>

          {/* Center Label Area (HTML Overlay, doesn't spin) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
            {activeHoveredCategory ? (
              <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
                <span
                  className="text-xs font-bold uppercase tracking-wider max-w-[170px] truncate"
                  style={{ color: activeHoveredCategory.dotHex }}
                >
                  {activeHoveredCategory.name}
                </span>

                <span
                  className={`text-2xl sm:text-3xl font-extrabold tracking-tight my-0.5 tabular-nums drop-shadow-xs dark:drop-shadow-md ${
                    activeHoveredCategory.id === 'money_in'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : activeHoveredCategory.id === 'money_out'
                      ? 'text-orange-600 dark:text-orange-400'
                      : activeHoveredCategory.rawAmount < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {formatCurrency(activeHoveredCategory.rawAmount)}
                </span>

                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full mt-1">
                  {activeHoveredCategory.description}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                  Money Saved
                </span>

                <span
                  className={`text-2xl sm:text-3xl font-extrabold tracking-tight my-0.5 tabular-nums drop-shadow-xs dark:drop-shadow-md ${
                    moneySaved < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {moneySaved > 0 ? `+${formatCurrency(moneySaved)}` : formatCurrency(moneySaved)}
                </span>

                <span className="text-[11px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                  {savingsRate}% saved · {activeMode.name} Mode
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* The Three Categories: Money In, Money Out, Money Saved */}
      <div className="relative z-10 mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 select-none">
        {categoriesList.map((item) => {
          const isHovered = hoveredCategoryId === item.id;
          const displayPct =
            item.id === 'money_in'
              ? incomePct
              : item.id === 'money_out'
              ? expensePct
              : savingsRate;

          return (
            <div
              key={item.id}
              onMouseEnter={() => {
                setIsChartHovered(true);
                setHoveredCategoryId(item.id);
              }}
              onMouseLeave={() => {
                setIsChartHovered(false);
                setHoveredCategoryId(null);
              }}
              className={`flex items-center justify-between text-xs p-2.5 rounded-xl transition-all cursor-pointer ${
                isHovered
                  ? 'bg-slate-100 dark:bg-slate-800/90 ring-1 ring-indigo-500/40 shadow-xs'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                {/* Dot with glow */}
                <span
                  className={`w-3 h-3 rounded-full shrink-0 shadow-sm transition-transform ${item.dotColorClass}`}
                  style={{
                    boxShadow: `0 0 6px ${item.dotGlow}`,
                    transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                  }}
                />
                <div className="truncate">
                  <span
                    className={`font-bold block truncate ${
                      isHovered ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-normal truncate">
                    {item.description}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`font-bold tabular-nums text-xs sm:text-sm ${
                    item.id === 'money_in'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : item.id === 'money_out'
                      ? 'text-orange-600 dark:text-orange-400'
                      : item.rawAmount < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {item.id === 'money_in' && item.rawAmount > 0 && '+'}
                  {item.id === 'money_out' && item.rawAmount > 0 && '-'}
                  {item.id === 'money_saved' && item.rawAmount > 0 && '+'}
                  {formatCurrency(item.rawAmount)}
                </span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: item.badgeBg,
                    color: item.badgeText,
                    border: `1px solid ${item.badgeBorder}`,
                  }}
                >
                  {item.id === 'money_saved' ? `${displayPct}% saved` : `${displayPct}%`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
