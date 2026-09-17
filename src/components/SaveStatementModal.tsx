import React, { useState, useEffect } from 'react';
import {
  Save,
  CheckCircle2,
  X,
  FileText,
  DollarSign,
  Layers,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { SavedStatementTotals } from '../types';
import { formatCurrency } from '../utils/csvHelper';

interface SaveStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName: string;
  totals: SavedStatementTotals;
  transactionCount: number;
  onSave: (statementName: string, openUploadNext?: boolean) => void;
  onOpenNextPdfPicker?: () => void;
}

export const SaveStatementModal: React.FC<SaveStatementModalProps> = ({
  isOpen,
  onClose,
  defaultName,
  totals,
  transactionCount,
  onSave,
  onOpenNextPdfPicker,
}) => {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    setName(defaultName);
  }, [defaultName, isOpen]);

  if (!isOpen) return null;

  const handleConfirmSaveAndUploadNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), true);
    onOpenNextPdfPicker?.();
  };

  const handleSaveOnly = () => {
    if (!name.trim()) return;
    onSave(name.trim(), false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <form onSubmit={handleConfirmSaveAndUploadNext} className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Save Statement &amp; Carry Over Totals
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Lock this statement's categorized totals so they are carried over as your next PDF statement is processed.
              </p>
            </div>
          </div>

          {/* Statement Label / Name Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Statement Name / Label
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. July 2026 Statement"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
          </div>

          {/* Statement Summary Breakdown to be locked */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Transactions: <strong>{transactionCount} records</strong></span>
              <span>Gross: {formatCurrency(totals.totalDebit)} | Credits: -{formatCurrency(totals.totalAllocatedCredit)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-center">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40">
                <div className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase">
                  Andrew/Nat
                </div>
                <div className="text-sm font-extrabold text-purple-900 dark:text-purple-100 mt-0.5">
                  {formatCurrency(totals.andrew.netSpend)}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-pink-50 dark:bg-pink-950/40 border border-pink-200/60 dark:border-pink-800/40">
                <div className="text-[10px] font-bold text-pink-700 dark:text-pink-300 uppercase">
                  Rachel
                </div>
                <div className="text-sm font-extrabold text-pink-900 dark:text-pink-100 mt-0.5">
                  {formatCurrency(totals.rachel.netSpend)}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40">
                <div className="text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase">
                  Leisure
                </div>
                <div className="text-sm font-extrabold text-sky-900 dark:text-sky-100 mt-0.5">
                  {formatCurrency(totals.leisure.netSpend)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Statement Net Total:</span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(totals.totalNetSpend)}
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveOnly}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-center"
            >
              Save Only
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Save &amp; Upload Next Statement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
