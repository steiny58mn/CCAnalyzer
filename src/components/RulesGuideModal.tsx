import React from 'react';
import { X, Sparkles, CheckCircle2, CreditCard, Tag, ArrowRight, ShieldCheck } from 'lucide-react';

interface RulesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReapplyDefaults: () => void;
}

export const RulesGuideModal: React.FC<RulesGuideModalProps> = ({
  isOpen,
  onClose,
  onReapplyDefaults,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 animate-scale-in">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Default Categorization Rules
              </h3>
              <p className="text-xs text-slate-500">How incoming transactions are classified</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
          {/* Rule 1: Credits & Payments */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
              $
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                  Credits &amp; Payments
                </span>
                <span className="text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-md">
                  Applied to Names
                </span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                Credits, statement offsets, and payments are applied directly to the designated name (e.g. <strong>Ally 6767</strong> &rarr; <strong>Rachel</strong>, <strong>Ally 8458</strong> &rarr; <strong>Andrew</strong>, or based on card number/category). You can reassign any credit to any person at any time using the category dropdown.
              </p>
            </div>
          </div>

          {/* Rule 2: Leisure (Travel & Fee/Interest Charge) */}
          <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
              L
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-sky-900 dark:text-sky-200 uppercase tracking-wide">
                  Leisure Category
                </span>
                <span className="text-[11px] font-bold bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200 px-2 py-0.5 rounded-md">
                  Travel &amp; Fee/Interest Charge
                </span>
              </div>
              <p className="text-xs text-sky-800 dark:text-sky-300 mt-1">
                Transactions in the <strong>"Fee/Interest Charge"</strong> category (fees, interest, annual charges) or with <strong>"Travel"</strong> in description/category default to <strong>Leisure</strong>. Capital One Travel entries are labeled with title <strong>"Travel"</strong> instead of a card number.
              </p>
            </div>
          </div>

          {/* Rule 3: Rachel */}
          <div className="p-3.5 rounded-2xl bg-pink-50/60 dark:bg-pink-950/30 border border-pink-200/60 dark:border-pink-900/40 flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-pink-400 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
              R
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-pink-800 dark:text-pink-200 uppercase tracking-wide">
                  Rachel Category
                </span>
                <span className="text-[11px] font-mono font-bold bg-pink-100/80 dark:bg-pink-900 text-pink-700 dark:text-pink-200 px-2 py-0.5 rounded-md">
                  Card 3810
                </span>
              </div>
              <p className="text-xs text-pink-700 dark:text-pink-300 mt-1">
                Every transaction with Card No. <strong>3810</strong> automatically defaults to <strong>Rachel</strong>.
              </p>
            </div>
          </div>

          {/* Rule 4: Andrew/Natalie */}
          <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
              A
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-purple-900 dark:text-purple-200 uppercase tracking-wide">
                  Andrew/Natalie Category
                </span>
                <span className="text-[11px] font-mono font-bold bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-md">
                  Cards 2642 &amp; 6744
                </span>
              </div>
              <p className="text-xs text-purple-800 dark:text-purple-300 mt-1">
                Every transaction with Card No. <strong>2642</strong> (Andrew) or <strong>6744</strong> (Natalie) automatically defaults to <strong>Andrew/Natalie</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0">📌</span>
            <span><strong>Payments &amp; Credits</strong> are automatically organized at the <strong>bottom of the list</strong>.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">💳</span>
            <span><strong>Manual Credit Overrides</strong>: In the Analytics section, you can enter custom dollar credit overrides for each bucket or use quick presets (Even 3-Way Split, All-to-One, or Revert to Auto).</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">💾</span>
            <span><strong>Manual changes are remembered</strong>: Whenever you reassign a transaction, the app tracks and retains your override on subsequent PDF/CSV loads.</span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              onReapplyDefaults();
              onClose();
            }}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Re-apply Rules to All
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
