import React, { useState, useEffect } from 'react';
import {
  Coins,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
  User,
  Palmtree,
} from 'lucide-react';
import { CategoryType, CreditAllocations } from '../types';
import { formatCurrency } from '../utils/csvHelper';

interface CreditAllocationSectionProps {
  grossByCategory: Record<CategoryType, number>;
  csvTotalCredit: number;
  creditAllocations: CreditAllocations;
  onUpdateAllocations: (allocations: CreditAllocations) => void;
}

export const CreditAllocationSection: React.FC<CreditAllocationSectionProps> = ({
  grossByCategory,
  csvTotalCredit,
  creditAllocations,
  onUpdateAllocations,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Local string representation for inputs to allow clean typing with strict 2-decimal-place limit
  const [localInputs, setLocalInputs] = useState<Record<string, string>>({
    Andrew: (creditAllocations.Andrew || 0).toFixed(2),
    Rachel: (creditAllocations.Rachel || 0).toFixed(2),
    Leisure: (creditAllocations.Leisure || 0).toFixed(2),
  });

  // Track if an input is currently focused so we don't clobber active typing
  const [focusedBucket, setFocusedBucket] = useState<CategoryType | null>(null);

  // Synchronize local input strings when allocations change from parent (e.g. quick buttons, reset, import)
  useEffect(() => {
    setLocalInputs((prev) => ({
      Andrew: focusedBucket === 'Andrew' ? prev.Andrew : (creditAllocations.Andrew || 0).toFixed(2),
      Rachel: focusedBucket === 'Rachel' ? prev.Rachel : (creditAllocations.Rachel || 0).toFixed(2),
      Leisure: focusedBucket === 'Leisure' ? prev.Leisure : (creditAllocations.Leisure || 0).toFixed(2),
    }));
  }, [creditAllocations.Andrew, creditAllocations.Rachel, creditAllocations.Leisure, focusedBucket]);

  // Total Available Credits pool comes directly from the imported file
  const totalAvailableCredit = csvTotalCredit > 0 ? csvTotalCredit : 0;

  // Sum of currently allocated credits
  const totalAllocated =
    (creditAllocations.Andrew || 0) +
    (creditAllocations.Rachel || 0) +
    (creditAllocations.Leisure || 0);

  const remainingCredit = totalAvailableCredit - totalAllocated;
  const isOverAllocated = remainingCredit < -0.01;
  const isFullyAllocated = Math.abs(remainingCredit) < 0.01 && totalAvailableCredit > 0;

  // Handle single bucket input change strictly limiting to 2 decimal places
  const handleBucketChange = (category: CategoryType, rawStr: string) => {
    // If empty, allow clearing temporarily while typing
    if (rawStr === '') {
      setLocalInputs((prev) => ({ ...prev, [category]: '' }));
      onUpdateAllocations({
        ...creditAllocations,
        [category]: 0,
      });
      return;
    }

    // Keep numbers and at most one decimal point
    let clean = rawStr.replace(/[^0-9.]/g, '');
    
    // Prevent multiple dots
    const dotIndex = clean.indexOf('.');
    if (dotIndex !== -1) {
      clean = clean.substring(0, dotIndex + 1) + clean.substring(dotIndex + 1).replace(/\./g, '');
    }

    // Limit to 2 decimal places
    const parts = clean.split('.');
    if (parts.length > 1 && parts[1].length > 2) {
      clean = parts[0] + '.' + parts[1].substring(0, 2);
    }

    setLocalInputs((prev) => ({ ...prev, [category]: clean }));

    const val = parseFloat(clean);
    const num = isNaN(val) ? 0 : Math.round(Math.max(0, val) * 100) / 100;

    onUpdateAllocations({
      ...creditAllocations,
      [category]: num,
    });
  };

  // On blur, strictly format to 2 decimal places (e.g. 50 -> 50.00, 50.5 -> 50.50, empty -> 0.00)
  const handleBucketBlur = (category: CategoryType) => {
    setFocusedBucket(null);
    const currentVal = localInputs[category] || '';
    const parsed = parseFloat(currentVal);
    const num = isNaN(parsed) ? 0 : Math.max(0, parsed);
    const formatted = num.toFixed(2);

    setLocalInputs((prev) => ({ ...prev, [category]: formatted }));
    onUpdateAllocations({
      ...creditAllocations,
      [category]: parseFloat(formatted),
    });
  };

  // Quick adjust helper (add delta)
  const handleQuickDelta = (category: CategoryType, delta: number) => {
    const current = creditAllocations[category] || 0;
    const updated = Math.round(Math.max(0, current + delta) * 100) / 100;
    setLocalInputs((prev) => ({ ...prev, [category]: updated.toFixed(2) }));
    onUpdateAllocations({
      ...creditAllocations,
      [category]: updated,
    });
  };

  // Assign remaining unallocated credit to a specific bucket
  const handleAssignRemainingTo = (category: CategoryType) => {
    const current = creditAllocations[category] || 0;
    const additional = Math.round(Math.max(0, remainingCredit) * 100) / 100;
    const updated = Math.round((current + additional) * 100) / 100;
    setLocalInputs((prev) => ({ ...prev, [category]: updated.toFixed(2) }));
    onUpdateAllocations({
      ...creditAllocations,
      [category]: updated,
    });
  };

  // Reset allocations to 0
  const handleResetAllocations = () => {
    setLocalInputs({
      Andrew: '0.00',
      Rachel: '0.00',
      Leisure: '0.00',
    });
    onUpdateAllocations({
      Andrew: 0,
      Rachel: 0,
      Leisure: 0,
    });
  };

  // Core bucket configurations
  const buckets: {
    category: CategoryType;
    label: string;
    sublabel: string;
    bgBadge: string;
    textColor: string;
    borderColor: string;
    icon: React.ReactNode;
  }[] = [
    {
      category: 'Andrew',
      label: 'Andrew/Natalie',
      sublabel: 'Cards 2642 / 6744',
      bgBadge: 'bg-purple-50 dark:bg-purple-950/60',
      textColor: 'text-purple-700 dark:text-purple-300',
      borderColor: 'border-purple-200 dark:border-purple-800',
      icon: <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
    },
    {
      category: 'Rachel',
      label: 'Rachel',
      sublabel: 'Card 3810',
      bgBadge: 'bg-pink-50 dark:bg-pink-950/50',
      textColor: 'text-pink-600 dark:text-pink-300',
      borderColor: 'border-pink-200 dark:border-pink-800',
      icon: <User className="w-4 h-4 text-pink-400 dark:text-pink-300" />,
    },
    {
      category: 'Leisure',
      label: 'Leisure',
      sublabel: 'Leisure',
      bgBadge: 'bg-sky-50 dark:bg-sky-950/60',
      textColor: 'text-sky-700 dark:text-sky-300',
      borderColor: 'border-sky-200 dark:border-sky-800',
      icon: <Palmtree className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
    },
  ];

  // Calculate percentages for the allocation visual bar
  const andrewPct = totalAvailableCredit > 0 ? ((creditAllocations.Andrew || 0) / totalAvailableCredit) * 100 : 0;
  const rachelPct = totalAvailableCredit > 0 ? ((creditAllocations.Rachel || 0) / totalAvailableCredit) * 100 : 0;
  const leisurePct = totalAvailableCredit > 0 ? ((creditAllocations.Leisure || 0) / totalAvailableCredit) * 100 : 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-gradient-to-tr from-emerald-500 to-indigo-500 text-white rounded-xl shadow-md shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Credit Offset & Bucket Allocation
              </h3>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Subtracted from Bucket Totals
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Total credit pool is calculated directly from your imported file. Manually enter the credit offset split across Andrew/Natalie, Rachel, and Leisure below.
            </p>
          </div>
        </div>

        {/* Total Credit Pool Overview Pills */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/10 text-right">
            <span className="block text-[10px] uppercase font-semibold text-slate-300">Imported Credit Pool</span>
            <span className="text-base font-extrabold text-emerald-300">
              {formatCurrency(totalAvailableCredit)}
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/10 text-right">
            <span className="block text-[10px] uppercase font-semibold text-slate-300">Allocated</span>
            <span className="text-base font-extrabold text-white">
              {formatCurrency(totalAllocated)}
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors self-center"
            title={isExpanded ? 'Collapse Section' : 'Expand Section'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Body */}
      {isExpanded && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Allocation Progress Bar & Status Header */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-700 dark:text-slate-300">Allocation Status:</span>
                {totalAvailableCredit === 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    No Credits in Imported File ($0.00)
                  </span>
                ) : isFullyAllocated ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    100% Balanced ({formatCurrency(totalAllocated)})
                  </span>
                ) : isOverAllocated ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    Over-allocated by {formatCurrency(Math.abs(remainingCredit))}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    {formatCurrency(remainingCredit)} Unassigned Remaining
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {totalAvailableCredit > 0 ? ((totalAllocated / totalAvailableCredit) * 100).toFixed(0) : 0}% Assigned
                </span>

                <button
                  onClick={handleResetAllocations}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors flex items-center gap-1 border border-rose-200 dark:border-rose-900/60"
                  title="Reset all credit offsets to $0"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset ($0)</span>
                </button>
              </div>
            </div>

            {/* Visual Multi-Color Allocation Meter */}
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
              {andrewPct > 0 && (
                <div
                  style={{ width: `${Math.min(100, andrewPct)}%` }}
                  className="bg-purple-600 h-full transition-all duration-300"
                  title={`Andrew/Natalie: ${formatCurrency(creditAllocations.Andrew || 0)} (${andrewPct.toFixed(1)}%)`}
                />
              )}
              {rachelPct > 0 && (
                <div
                  style={{ width: `${Math.min(100, rachelPct)}%` }}
                  className="bg-pink-400 h-full transition-all duration-300"
                  title={`Rachel: ${formatCurrency(creditAllocations.Rachel || 0)} (${rachelPct.toFixed(1)}%)`}
                />
              )}
              {leisurePct > 0 && (
                <div
                  style={{ width: `${Math.min(100, leisurePct)}%` }}
                  className="bg-sky-500 h-full transition-all duration-300"
                  title={`Leisure: ${formatCurrency(creditAllocations.Leisure || 0)} (${leisurePct.toFixed(1)}%)`}
                />
              )}
            </div>
          </div>

          {/* Interactive Bucket Cards Grid for Manual Input */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {buckets.map((b) => {
              const gross = grossByCategory[b.category] || 0;
              const creditAmount = creditAllocations[b.category] || 0;
              const netSpend = gross - creditAmount;
              const shareOfCredit = totalAvailableCredit > 0 ? (creditAmount / totalAvailableCredit) * 100 : 0;
              const currentInputVal = localInputs[b.category] ?? '';

              return (
                <div
                  key={b.category}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-xs ${
                    creditAmount > 0
                      ? 'border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-200 dark:ring-indigo-900/40'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Bucket Header */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${b.bgBadge} border ${b.borderColor}`}>
                          {b.icon}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-900 dark:text-white block">
                            {b.label}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {b.sublabel}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${b.bgBadge} ${b.textColor} border ${b.borderColor}`}
                      >
                        {shareOfCredit.toFixed(0)}% of Credit
                      </span>
                    </div>

                    {/* Gross Spend Display */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Gross Charges:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(gross)}
                        </span>
                      </div>
                    </div>

                    {/* Credit Input Field (Manual Entry - strictly 2 decimal places max) */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Enter Credit Offset</span>
                        {remainingCredit > 0.01 && (
                          <button
                            type="button"
                            onClick={() => handleAssignRemainingTo(b.category)}
                            className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            + Fill Rem. ({formatCurrency(remainingCredit)})
                          </button>
                        )}
                      </label>

                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-emerald-600 dark:text-emerald-400 font-bold text-sm pointer-events-none">
                          -$
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={currentInputVal}
                          onFocus={(e) => {
                            setFocusedBucket(b.category);
                            e.target.select();
                          }}
                          onChange={(e) => handleBucketChange(b.category, e.target.value)}
                          onBlur={() => handleBucketBlur(b.category)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-16 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm font-extrabold text-slate-900 dark:text-white transition-all text-right font-mono"
                        />
                        <span className="absolute right-3 text-xs text-slate-400 font-medium pointer-events-none">
                          USD
                        </span>
                      </div>

                      {/* Quick Stepper Buttons */}
                      <div className="flex items-center gap-1 pt-1 justify-end">
                        <button
                          type="button"
                          onClick={() => handleQuickDelta(b.category, -50)}
                          disabled={creditAmount <= 0}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 disabled:opacity-40"
                        >
                          -$50
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickDelta(b.category, 50)}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                        >
                          +$50
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickDelta(b.category, 100)}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                        >
                          +$100
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subtraction Result / Adjusted Net Spend Calculation */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Calculation:</span>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {formatCurrency(gross)} - {formatCurrency(creditAmount)}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Adjusted Net Spend:
                      </span>
                      <span
                        className={`text-base font-black ${
                          netSpend < 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {formatCurrency(netSpend)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Educational Note Callout */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p>
              <strong>Live Bucket Subtraction:</strong> Assigned credits are immediately subtracted from each bucket's total and update the KPI metric cards, donut visualizations, and downloadable CSV summary reports.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
