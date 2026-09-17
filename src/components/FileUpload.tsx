import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileType,
  Loader2,
  Eye,
  RefreshCw,
  HelpCircle,
  Layers,
  Save,
} from 'lucide-react';
import { parseCSVData, formatCurrency } from '../utils/csvHelper';
import { parsePDFData } from '../utils/pdfHelper';
import { Transaction } from '../types';

interface FileUploadProps {
  onImportSuccess: (transactions: Transaction[], fileName?: string) => void;
  onClearAll?: () => void;
  currentCount: number;
  savedStatementsCount?: number;
  carriedOverNetTotal?: number;
  activeStatementName?: string;
  onSaveCurrentStatement?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onImportSuccess,
  savedStatementsCount = 0,
  carriedOverNetTotal = 0,
  activeStatementName,
  onSaveCurrentStatement,
  currentCount,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diagnosticDetails, setDiagnosticDetails] = useState<string | null>(null);
  const [extractedPdfText, setExtractedPdfText] = useState<string | null>(null);
  const [showRawExtracted, setShowRawExtracted] = useState(false);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [isRawTextOpen, setIsRawTextOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setSuccessInfo(
        `Successfully loaded ${transactions.length} transactions from "${fileName || 'CSV'}"! Default categories applied.`
      );

      if (errors.length > 0) {
        console.warn('CSV Parse notices:', errors);
      }
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
    setSuccessInfo(null);

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
              : `Extracted ${rawText.trim().split('\n').length} lines of text, but none matched the standard date/card/amount patterns.`
          );
        }
        setShowRawExtracted(true);
        return;
      }

      onImportSuccess(transactions, fileName);
      setSuccessInfo(
        `Successfully imported ${transactions.length} transactions from PDF "${fileName}" (${pageCount} page${pageCount > 1 ? 's' : ''})! Review categories below, then save before loading your next PDF.`
      );

      if (errors.length > 0) {
        console.warn('PDF Parse notices:', errors);
      }
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
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.pdf,text/csv,text/plain,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Import Statement
              </h2>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  CSV
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  PDF
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Supports Capital One PDF activity statements, monthly billing PDFs, and CSV exports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentCount > 0 && onSaveCurrentStatement && (
            <button
              onClick={onSaveCurrentStatement}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
              title="Save current categories and totals before loading another statement"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save &amp; Carry Over</span>
            </button>
          )}

          <button
            onClick={handleDownloadTemplate}
            type="button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
            title="Download CSV template format"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Template</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRawTextOpen(!isRawTextOpen)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isRawTextOpen ? 'Hide Box' : 'Paste Text'}</span>
          </button>
        </div>
      </div>

      {/* Carryover status banner if prior statements are saved */}
      {savedStatementsCount > 0 && (
        <div className="mt-3 p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-indigo-600 text-white shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold">
                {savedStatementsCount} Prior Statement{savedStatementsCount > 1 ? 's' : ''} Saved:
              </span>{' '}
              <span>
                <strong>{formatCurrency(carriedOverNetTotal)}</strong> net spend is carried over. When you load the next PDF, its totals will add directly to this grand total!
              </span>
            </div>
          </div>
          {currentCount > 0 && activeStatementName && (
            <span className="shrink-0 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[11px] font-semibold border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300">
              Active: {activeStatementName}
            </span>
          )}
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`mt-3 cursor-pointer rounded-xl border-2 border-dashed py-3 px-4 transition-all flex items-center justify-center gap-3 text-center ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
        } ${isProcessing ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        </div>
        <div className="text-left sm:text-center">
          {isProcessing ? (
            <span className="font-semibold text-xs text-indigo-600 dark:text-indigo-400">
              Reading PDF statement pages and extracting transactions...
            </span>
          ) : (
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
              Drag & drop <strong className="text-indigo-600 dark:text-indigo-400 font-bold">CSV or PDF</strong> statement here, or <span className="text-indigo-600 dark:text-indigo-400 underline font-bold">browse</span>
            </span>
          )}
        </div>
      </div>

      {/* Paste CSV / Statement raw text area */}
      {isRawTextOpen && (
        <div className="mt-3 space-y-2 animate-fade-in">
          <textarea
            rows={4}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste raw CSV lines or copy-pasted statement rows here (e.g. Aug 10 SQ *SUMMIT GOLF CLUB $7.13)..."
            className="w-full p-2.5 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Supports CSV comma-separated or tab/space delimited statement lines
            </span>
            <button
              type="button"
              onClick={() => {
                if (rawText.trim()) {
                  processCSVContent(rawText);
                  setRawText('');
                  setIsRawTextOpen(false);
                }
              }}
              disabled={!rawText.trim()}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              Parse Pasted Text
            </button>
          </div>
        </div>
      )}

      {/* Error & Diagnostic Notices */}
      {errorMessage && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 space-y-2 text-xs text-rose-800 dark:text-rose-200">
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

      {successInfo && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <p className="font-medium">{successInfo}</p>
        </div>
      )}
    </div>
  );
};

