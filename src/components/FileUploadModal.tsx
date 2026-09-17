import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  Download,
  AlertCircle,
  FileSpreadsheet,
  Loader2,
  Eye,
  Layers,
  X,
} from 'lucide-react';
import { parseCSVData, formatCurrency } from '../utils/csvHelper';
import { parsePDFData } from '../utils/pdfHelper';
import { Transaction } from '../types';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (transactions: Transaction[], fileName?: string) => void;
  currentCount: number;
  savedStatementsCount?: number;
  carriedOverNetTotal?: number;
  activeStatementName?: string;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  savedStatementsCount = 0,
  carriedOverNetTotal = 0,
  activeStatementName,
  currentCount,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diagnosticDetails, setDiagnosticDetails] = useState<string | null>(null);
  const [extractedPdfText, setExtractedPdfText] = useState<string | null>(null);
  const [showRawExtracted, setShowRawExtracted] = useState(false);
  const [isRawTextOpen, setIsRawTextOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state whenever modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setDiagnosticDetails(null);
      setExtractedPdfText(null);
      setShowRawExtracted(false);
      setIsRawTextOpen(false);
      setRawText('');
      setIsDragging(false);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  const processCSVContent = (content: string, fileName?: string) => {
    try {
      setErrorMessage(null);
      setDiagnosticDetails(null);
      const { transactions, errors } = parseCSVData(content);

      if (transactions.length === 0) {
        setErrorMessage('No valid transactions found. Please check your CSV column headers.');
        if (errors.length > 0) {
          setDiagnosticDetails(errors.join('\n'));
        }
        return;
      }

      onImportSuccess(transactions, fileName || 'Imported_Data.csv');
      onClose();
    } catch (err: any) {
      setErrorMessage(`Failed to parse CSV: ${err.message || 'Unknown error'}`);
    }
  };

  const processPDFContent = async (arrayBuffer: ArrayBuffer, fileName: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setDiagnosticDetails(null);
    setExtractedPdfText(null);
    setShowRawExtracted(false);

    try {
      const { transactions, errors, rawText, pageCount } = await parsePDFData(arrayBuffer);
      setExtractedPdfText(rawText);

      if (transactions.length === 0) {
        if (!rawText || rawText.trim().length === 0) {
          setErrorMessage(
            `Unable to extract text from "${fileName}". The PDF may be a scanned image or lack an embedded text layer.`
          );
          setDiagnosticDetails(
            `PDF Pages: ${pageCount}. No extractable text found on any page. If your statement is a scanned image, please export as CSV from Capital One or use an OCR text PDF.`
          );
        } else {
          setErrorMessage(
            `Could not detect transaction rows in "${fileName}". Total pages read: ${pageCount}.`
          );
          setDiagnosticDetails(
            errors.length > 0
              ? errors.join('\n')
              : `Extracted ${rawText.trim().split('\n').length} lines of text, but none matched standard date/card/amount patterns.`
          );
        }
        setShowRawExtracted(true);
        return;
      }

      onImportSuccess(transactions, fileName);
      onClose();
    } catch (err: any) {
      console.error('PDF parsing error:', err);
      setErrorMessage(`Failed to load PDF file: ${err.message || 'Unknown error'}`);
      setDiagnosticDetails(
        `Error Details: ${err.stack || err.name || err.toString()}.\nCheck if the PDF is password-protected or corrupted.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFile = (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        if (buffer) {
          processPDFContent(buffer, file.name);
        }
      };
      reader.onerror = () => {
        setErrorMessage('Could not read the selected PDF file.');
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          processCSVContent(text, file.name);
        }
      };
      reader.onerror = () => {
        setErrorMessage('Could not read the selected file.');
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDownloadTemplate = () => {
    const templateContent = `TransactionDate,PostedDate,Card No.,Description,Debit,Credit\n2026-08-01,2026-08-02,3810,Grocery Store,85.50,\n2026-08-03,2026-08-04,2642,Gas Station,45.00,\n2026-08-05,2026-08-06,6744,Coffee Shop,12.75,\n2026-08-07,2026-08-08,3810,Delta Air Travel Flight,350.00,\n2026-08-14,2026-08-14,2642,Payment from ALLY BANK ...8458,,1527.69\n2026-08-15,2026-08-15,3810,Payment from ALLY BANK ...6767,,650.00`;
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_transactions_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in"
      onClick={() => !isProcessing && onClose()}
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.pdf,text/csv,text/plain,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Upload Statement
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload or drag and drop your Capital One PDF or CSV statement
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Active Workspace Notice if transactions exist */}
          {currentCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Workspace Notice:</span> You currently have{' '}
                <strong>{currentCount} active transactions</strong> in &ldquo;{activeStatementName}&rdquo;.
                Uploading a new statement will replace these active transactions. (Make sure you save the current statement first if you want to keep its numbers in carried totals.)
              </div>
            </div>
          )}

          {/* Carried-Over Summary Banner if prior statements saved */}
          {savedStatementsCount > 0 && (
            <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-200">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-indigo-600 text-white shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold">
                    {savedStatementsCount} Prior Statement{savedStatementsCount > 1 ? 's' : ''} Saved:
                  </span>{' '}
                  <span>
                    <strong>{formatCurrency(carriedOverNetTotal)}</strong> net spend is carried over and will automatically apply to this new statement.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed py-8 px-6 transition-all flex flex-col items-center justify-center gap-3 text-center ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
            } ${isProcessing ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              {isProcessing ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : (
                <Upload className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-1 max-w-sm">
              {isProcessing ? (
                <p className="font-bold text-sm text-indigo-600 dark:text-indigo-400 animate-pulse">
                  Extracting pages &amp; detecting transaction rows...
                </p>
              ) : (
                <>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Drag and drop your file here, or{' '}
                    <span className="text-indigo-600 dark:text-indigo-400 underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Supports <strong className="text-slate-700 dark:text-slate-300">Capital One PDF statements</strong> or <strong className="text-slate-700 dark:text-slate-300">CSV transaction exports</strong>
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                PDF Statement
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                CSV Export
              </span>
            </div>
          </div>

          {/* Quick Tools: CSV Template & Paste Box */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download sample CSV format</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRawTextOpen(!isRawTextOpen)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isRawTextOpen ? 'Hide text box' : 'Paste raw text/CSV'}</span>
            </button>
          </div>

          {/* Paste Raw Text Section */}
          {isRawTextOpen && (
            <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 animate-fade-in">
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste raw CSV lines or copy-pasted statement rows here (e.g. Aug 10 SQ *SUMMIT GOLF CLUB $7.13)..."
                className="w-full p-2.5 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Comma-separated or whitespace-delimited rows
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (rawText.trim()) {
                      processCSVContent(rawText);
                      setRawText('');
                    }
                  }}
                  disabled={!rawText.trim()}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  Parse Text
                </button>
              </div>
            </div>
          )}

          {/* Error & Diagnostics */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 space-y-2 text-xs text-rose-800 dark:text-rose-200 animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <p className="font-semibold">{errorMessage}</p>
                </div>
                {extractedPdfText && (
                  <button
                    type="button"
                    onClick={() => setShowRawExtracted(!showRawExtracted)}
                    className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 underline"
                  >
                    <Eye className="w-3 h-3" />
                    <span>{showRawExtracted ? 'Hide PDF Text' : 'View Extracted Text'}</span>
                  </button>
                )}
              </div>

              {diagnosticDetails && (
                <div className="p-2 rounded bg-rose-100/70 dark:bg-rose-900/40 text-[11px] font-mono text-rose-900 dark:text-rose-200 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {diagnosticDetails}
                </div>
              )}

              {showRawExtracted && extractedPdfText && (
                <div className="mt-2 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 block">
                    Raw Text Extracted from PDF:
                  </span>
                  <pre className="p-2 rounded bg-slate-900 text-slate-100 text-[10px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-700">
                    {extractedPdfText || '(No text characters were extracted from this PDF)'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Files are processed locally in your browser</span>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-1.5 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
