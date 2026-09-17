import React from 'react';
import { AlertCircle, BookmarkCheck, ArrowRight, X, AlertTriangle } from 'lucide-react';
import { SavedStatement } from '../types';

interface ReopenConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetStatement: SavedStatement | null;
  currentCount: number;
  currentStatementName: string;
  onConfirmSaveAndOpen: () => void;
  onConfirmDiscardAndOpen: () => void;
}

export const ReopenConfirmModal: React.FC<ReopenConfirmModalProps> = ({
  isOpen,
  onClose,
  targetStatement,
  currentCount,
  currentStatementName,
  onConfirmSaveAndOpen,
  onConfirmDiscardAndOpen,
}) => {
  if (!isOpen || !targetStatement) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Edit &ldquo;{targetStatement.name}&rdquo;?
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You have active transactions in your current workspace
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
              <span>Active Workspace:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{currentStatementName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Active Transactions:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{currentCount} records</span>
            </div>
          </div>

          <p className="leading-relaxed">
            Opening <strong className="text-slate-900 dark:text-white">&ldquo;{targetStatement.name}&rdquo;</strong> into the active editor will load its {targetStatement.transactions.length} transactions and credit allocations. How would you like to handle your current active workspace?
          </p>

          <div className="space-y-2.5 pt-2">
            {/* Option 1: Save Active First, then Open */}
            <button
              type="button"
              onClick={onConfirmSaveAndOpen}
              className="w-full p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-between group transition-all shadow-xs"
            >
              <div className="flex items-center gap-2.5 text-left">
                <BookmarkCheck className="w-4 h-4 text-indigo-200 group-hover:scale-110 transition-transform shrink-0" />
                <div>
                  <div className="text-xs font-bold">Save Current Statement &amp; Open &ldquo;{targetStatement.name}&rdquo;</div>
                  <div className="text-[11px] text-indigo-200 font-normal">
                    Preserves your active transactions into saved history first
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            {/* Option 2: Replace / Discard Active without saving */}
            <button
              type="button"
              onClick={onConfirmDiscardAndOpen}
              className="w-full p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold flex items-center justify-between group transition-all border border-slate-200 dark:border-slate-700"
            >
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Discard Active &amp; Open &ldquo;{targetStatement.name}&rdquo;
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                  Replaces current workspace with this saved statement
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
