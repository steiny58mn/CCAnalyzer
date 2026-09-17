import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Transaction } from '../types';
import { determineCategoryWithOverrides } from './rulesEngine';

// Configure worker for pdfjs-dist
try {
  if (pdfjsWorker) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  } else {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.2.108'}/build/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn('PDF.js worker setup fallback:', e);
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@6.2.108/build/pdf.worker.min.mjs`;
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Parses date strings:
 * - "Pending" -> Current date (YYYY-MM-DD)
 * - "Aug 15", "Aug 08", "Aug 24" -> "2026-08-24" (using year inferred from document or current year)
 * - "08/15/2026" or "8/15/26" -> "2026-08-15"
 */
function parseTransactionDate(dateStr: string, documentYear: number): string {
  const clean = dateStr.trim();
  const today = new Date().toISOString().split('T')[0];

  if (clean.toLowerCase().includes('pending')) {
    return today;
  }

  // Check for Month name + day: e.g. "Aug 15", "Aug 08", "August 7", "Aug 24"
  const monthNameMatch = clean.match(/^([a-zA-Z]{3,9})\s+(\d{1,2})$/i);
  if (monthNameMatch) {
    const monthKey = monthNameMatch[1].toLowerCase().substring(0, 3);
    const monthNum = MONTH_MAP[monthKey] || '08';
    const dayNum = monthNameMatch[2].padStart(2, '0');
    return `${documentYear}-${monthNum}-${dayNum}`;
  }

  // Check for MM/DD/YYYY or MM/DD/YY
  const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slashMatch) {
    const m = slashMatch[1].padStart(2, '0');
    const d = slashMatch[2].padStart(2, '0');
    let y = slashMatch[3] ? parseInt(slashMatch[3], 10) : documentYear;
    if (y < 100) y += 2000;
    return `${y}-${m}-${d}`;
  }

  return today;
}

interface RawTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Extracts all text items with coordinates from a PDF file
 */
async function extractPdfTextItems(fileArrayBuffer: ArrayBuffer): Promise<{ itemsByPage: RawTextItem[][]; fullText: string }> {
  const loadingTask = pdfjsLib.getDocument({ data: fileArrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const itemsByPage: RawTextItem[][] = [];
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageItems: RawTextItem[] = [];

    for (const item of textContent.items) {
      if ('str' in item && item.str.trim()) {
        const x = item.transform[4];
        const y = item.transform[5];
        pageItems.push({
          text: item.str,
          x,
          y,
          width: item.width,
          height: item.height,
        });
        fullText += item.str + ' ';
      }
    }
    itemsByPage.push(pageItems);
    fullText += '\n';
  }

  return { itemsByPage, fullText };
}

const KNOWN_CATEGORIES = [
  'Gas/Automotive',
  'Gas / Automotive',
  'Automotive',
  'Grocery',
  'Merchandise',
  'Dining',
  'Entertainment',
  'Other Services',
  'Other Travel',
  'Travel',
  'Payment',
  'Fee',
  'Fee/Interest Charge',
  'Interest Charge',
  'Other',
  'Healthcare',
  'Phone/Cable',
  'Services',
];

export interface PDFParseResult {
  transactions: Transaction[];
  errors: string[];
  rawText: string;
  pageCount: number;
}

/**
 * Parse PDF files following Capital One transaction statement/activity formats:
 * - Activity exports (Columns: DATE | DESCRIPTION | CATEGORY | CARD | AMOUNT)
 * - Monthly Billing Statements (Trans Date | Post Date | Description | Category | Amount)
 * - Account section breakdowns (Andrew S ...2642, Rachel D ...3810, Natalie S ...6744)
 */
export async function parsePDFData(fileArrayBuffer: ArrayBuffer): Promise<PDFParseResult> {
  const { itemsByPage, fullText } = await extractPdfTextItems(fileArrayBuffer);
  const transactions: Transaction[] = [];
  const errors: string[] = [];

  // 1. Detect Document Year from headers (e.g. "Filter By: 08/04/2026" or "8/25/26" or statement dates)
  let docYear = new Date().getFullYear();
  const yearMatch = fullText.match(/\b20(2[0-9]|1[5-9])\b/);
  if (yearMatch) {
    docYear = parseInt(yearMatch[0], 10);
  }

  const isDateToken = (text: string) => {
    const clean = text.trim();
    return /^(Pending|[a-zA-Z]{3}\s+\d{1,2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)$/i.test(clean);
  };

  // Strategy 1: Spatial band extraction per page
  for (let pIndex = 0; pIndex < itemsByPage.length; pIndex++) {
    const pageItems = itemsByPage[pIndex];
    if (pageItems.length === 0) continue;

    // Filter out header and footer items
    const contentItems = pageItems.filter((it) => {
      const t = it.text.trim();
      if (
        t.includes('Capital One') ||
        t.includes('Filter By:') ||
        t.includes('Account Ending in') ||
        t.includes('DATE') ||
        t.includes('DESCRIPTION') ||
        t.includes('CATEGORY') ||
        t.includes('CARD') ||
        t.includes('AMOUNT') ||
        t.includes('http') ||
        t.includes('printTransactionsModal') ||
        /^\d+\s+of\s+\d+$/i.test(t)
      ) {
        return false;
      }
      return true;
    });

    // Find all Date tokens (left column: x < 150)
    const dateItems = contentItems
      .filter((it) => it.x < 150 && isDateToken(it.text))
      .sort((a, b) => b.y - a.y); // top to bottom

    if (dateItems.length > 0) {
      for (let i = 0; i < dateItems.length; i++) {
        const currentDateItem = dateItems[i];
        const nextDateItem = dateItems[i + 1];

        const topY = currentDateItem.y + 7;
        const bottomY = nextDateItem ? nextDateItem.y + 7 : -9999;

        // Collect all items in this transaction band
        const bandItems = contentItems.filter((it) => it.y <= topY && it.y > bottomY);

        // Sort items inside band: top-to-bottom, left-to-right
        bandItems.sort((a, b) => b.y - a.y || a.x - b.x);

        const dateStr = currentDateItem.text.trim();

        // Extract Amount from band items
        let rawAmountStr = '';
        let amountDebit = 0;
        let amountCredit = 0;

        const amountItems = bandItems.filter(
          (it) => /[–-]?\s*\$?\s*[\d,]+\.\d{2}(?:\s*CR)?/i.test(it.text) || it.text === '-' || it.text === '–' || it.text.toUpperCase() === 'CR'
        );

        if (amountItems.length > 0) {
          rawAmountStr = amountItems.map((it) => it.text.trim()).join(' ');
        } else {
          // Fallback: search across all band items
          const fullBandText = bandItems.map((it) => it.text.trim()).join(' ');
          const amtMatch = fullBandText.match(/([–-]?\s*\$?\s*[\d,]+\.\d{2}(?:\s*CR)?|\(\$?\s*[\d,]+\.\d{2}\))/i);
          if (amtMatch) {
            rawAmountStr = amtMatch[1];
          }
        }

        if (rawAmountStr) {
          const isNegative =
            rawAmountStr.includes('-') ||
            rawAmountStr.includes('–') ||
            rawAmountStr.includes('(') ||
            rawAmountStr.toUpperCase().includes('CR');
          const numAmount = parseFloat(rawAmountStr.replace(/[^0-9.]/g, '')) || 0;
          if (isNegative) {
            amountCredit = numAmount;
            amountDebit = 0;
          } else {
            amountDebit = numAmount;
            amountCredit = 0;
          }
        }

        // Extract Card Number (...XXXX or 4 digits) or "Travel" for Capital One Travel entries
        let cardNumber = '2642'; // default fallback
        const bandText = bandItems.map((it) => it.text.trim()).join(' ');
        const cardMatch = bandText.match(/\.\.\.(\d{4})/g);

        const isCapOneTravel =
          /capit[oa]l\s*one\s*travel/i.test(bandText) ||
          /cap\s*one\s*travel/i.test(bandText) ||
          /c1\s*travel/i.test(bandText);

        if (isCapOneTravel) {
          cardNumber = 'Travel';
        } else if (cardMatch && cardMatch.length > 0) {
          const lastMatch = cardMatch[cardMatch.length - 1];
          const digits = lastMatch.replace(/[^0-9]/g, '');
          if (digits.length === 4) {
            cardNumber = digits;
          }
        } else {
          // Check for cardholder names
          if (/rachel/i.test(bandText)) cardNumber = '3810';
          else if (/natalie/i.test(bandText)) cardNumber = '6744';
          else if (/andrew/i.test(bandText)) cardNumber = '2642';
        }

        // Extract Category
        let rawCategory = 'Other';
        for (const cat of KNOWN_CATEGORIES) {
          const catRegex = new RegExp(`\\b${cat.replace('/', '\\/')}\\b`, 'i');
          if (catRegex.test(bandText)) {
            rawCategory = cat;
            break;
          }
        }

        // If Category is Payment and debit > 0, make it credit
        if (rawCategory.toLowerCase() === 'payment' && amountDebit > 0 && amountCredit === 0) {
          amountCredit = amountDebit;
          amountDebit = 0;
        }

        // Extract Description: Items from the Description column (typically 75 <= x < 350)
        // Strictly exclude Date, Category tokens, Card Number/Holder tokens, and Amount tokens
        const descItems = bandItems.filter((it) => {
          if (it === currentDateItem) return false;
          if (it.x < 75) return false; // Left Date column
          if (it.x >= 450) return false; // Right Amount column

          const t = it.text.trim();
          if (!t) return false;

          // Exclude amount patterns
          if (/[–-]?\s*\$?\s*[\d,]+\.\d{2}/.test(t)) return false;
          if (t === '-' || t === '–' || t.toUpperCase() === 'CR') return false;

          // Exclude cardholder names
          if (/^(Andrew S\.|Rachel D\.|Natalie S\.|Andrew|Rachel|Natalie)$/i.test(t)) return false;

          // Exclude card numbers (...XXXX, 4-digit card tokens in card column)
          if (/^\.\.\.\d{4}$/.test(t) || (it.x >= 350 && /^\d{4}$/.test(t))) return false;

          // Exclude standalone category names if positioned in category column (x >= 270)
          if (it.x >= 270 && KNOWN_CATEGORIES.some((c) => c.toLowerCase() === t.toLowerCase())) return false;

          // Exclude "Capital One Travel" if positioned in card column (x >= 350)
          if (it.x >= 350 && /^(Capital One Travel|Travel)$/i.test(t)) return false;

          return true;
        });

        let description = descItems.map((it) => it.text.trim()).join(' ');

        // Fallback: if empty, gather text excluding date, amounts, and card indicators
        if (!description) {
          description = bandItems
            .map((it) => it.text.trim())
            .filter(
              (t) =>
                !isDateToken(t) &&
                !/[–-]?\s*\$?\s*[\d,]+\.\d{2}/.test(t) &&
                !/^(Andrew S\.|Rachel D\.|Natalie S\.|Andrew|Rachel|Natalie)$/i.test(t) &&
                !/^\.\.\.\d{4}$/.test(t) &&
                !KNOWN_CATEGORIES.some((c) => c.toLowerCase() === t.toLowerCase())
            )
            .join(' ');
        }

        // Clean up any remaining card number suffixes or cardholder prefixes
        description = description
          .replace(/\.\.\.\d{4}/g, '')
          .replace(/\b(2642|3810|6744)\b/g, '')
          .replace(/Andrew S\.|Rachel D\.|Natalie S\./gi, '')
          .replace(/\s+/g, ' ')
          .trim();

        if (!description && cardNumber === 'Travel') {
          description = 'Capital One Travel';
        }

        if (amountDebit > 0 || amountCredit > 0) {
          const txDate = parseTransactionDate(dateStr, docYear);
          const { category: assignedCategory, isManuallyChanged } = determineCategoryWithOverrides(
            cardNumber,
            description,
            rawCategory,
            amountCredit,
            amountDebit,
            txDate,
            txDate
          );

          transactions.push({
            id: `pdf-${Date.now()}-${pIndex}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            transactionDate: txDate,
            postedDate: txDate,
            cardNumber,
            description: description || 'Transaction',
            debit: amountDebit,
            credit: amountCredit,
            category: assignedCategory,
            rawCategory,
            isManuallyChanged,
          });
        }
      }
    }
  }

  // Strategy 2: If spatial extraction yielded 0 transactions, parse raw text lines & statements
  if (transactions.length === 0) {
    const streamTransactions = parseTransactionsFromRawTextStream(fullText, docYear);
    transactions.push(...streamTransactions);
  }

  // Strategy 3: Multi-format Monthly Statement block parser
  if (transactions.length === 0) {
    const monthlyTransactions = parseMonthlyStatementText(fullText, docYear);
    transactions.push(...monthlyTransactions);
  }

  if (transactions.length === 0 && fullText.trim().length === 0) {
    errors.push('No readable text layer was found in this PDF (it may be an image or scanned document).');
  }

  return {
    transactions,
    errors,
    rawText: fullText,
    pageCount: itemsByPage.length,
  };
}

/**
 * Strategy 2: Stream parser for transaction activity format
 */
function parseTransactionsFromRawTextStream(fullText: string, docYear: number): Transaction[] {
  const transactions: Transaction[] = [];
  const txRegex = /(Pending|[a-zA-Z]{3}\s+\d{1,2}|\d{1,2}\/\d{1,2})\s+([\s\S]+?)\s+(Gas\/Automotive|Grocery|Merchandise|Dining|Other|Entertainment|Payment|Other Services|Other Travel|Fee|Fee\/Interest Charge|Travel)\s+(?:(?:[a-zA-Z\s.]*)\.\.\.(\d{4})|Capital One Travel|Travel)\s+([–-]?\s*\$?\s*[\d,]+\.\d{2}(?:\s*CR)?)/gi;

  let match;
  while ((match = txRegex.exec(fullText)) !== null) {
    const rawDate = match[1];
    let rawDesc = match[2].replace(/\s+/g, ' ').trim();
    const rawCat = match[3];
    const cardDigits = match[4] || '';
    const rawAmount = match[5];

    let card = cardDigits;
    const isCapOneTravel =
      /capit[oa]l\s*one\s*travel/i.test(rawDesc) ||
      /cap\s*one\s*travel/i.test(rawDesc) ||
      /c1\s*travel/i.test(rawDesc) ||
      rawCat.toLowerCase().includes('travel') ||
      !cardDigits;

    if (isCapOneTravel) {
      card = 'Travel';
    }

    // Clean description to remove any cardholder names or card digits
    rawDesc = rawDesc
      .replace(/\.\.\.\d{4}/g, '')
      .replace(/\b(2642|3810|6744)\b/g, '')
      .replace(/Andrew S\.|Rachel D\.|Natalie S\./gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!rawDesc && card === 'Travel') {
      rawDesc = 'Capital One Travel';
    }

    const isNeg =
      rawAmount.includes('-') ||
      rawAmount.includes('–') ||
      rawAmount.includes('(') ||
      rawAmount.toUpperCase().includes('CR');
    const amountVal = parseFloat(rawAmount.replace(/[^0-9.]/g, '')) || 0;
    let debit = isNeg ? 0 : amountVal;
    let credit = isNeg ? amountVal : 0;

    if (rawCat.toLowerCase() === 'payment' && debit > 0 && credit === 0) {
      credit = debit;
      debit = 0;
    }

    const txDate = parseTransactionDate(rawDate, docYear);
    const { category: assignedCategory, isManuallyChanged } = determineCategoryWithOverrides(
      card,
      rawDesc,
      rawCat,
      credit,
      debit,
      txDate,
      txDate
    );

    transactions.push({
      id: `pdf-stream-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      transactionDate: txDate,
      postedDate: txDate,
      cardNumber: card,
      description: rawDesc || 'Transaction',
      debit,
      credit,
      category: assignedCategory,
      rawCategory: rawCat,
      isManuallyChanged,
    });
  }

  return transactions;
}

/**
 * Strategy 3: Standard Monthly Statement Line Parser
 * Handles lines with two dates (Trans Date, Post Date) or single date,
 * e.g., "Aug 10 Aug 11 SQ *THE SUMMIT GOLF CLUB Entertainment $7.13"
 * e.g., "08/10 08/11 HY-VEE GAS Gas/Automotive $45.00"
 */
function parseMonthlyStatementText(fullText: string, docYear: number): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = fullText.split(/\r?\n/);

  let currentCard = '2642';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for cardholder headers in monthly statements
    if (/capit[oa]l\s*one\s*travel/i.test(trimmed) || /^travel$/i.test(trimmed)) {
      currentCard = 'Travel';
      continue;
    } else if (trimmed.includes('3810') || /rachel/i.test(trimmed)) {
      currentCard = '3810';
      continue;
    } else if (trimmed.includes('6744') || /natalie/i.test(trimmed)) {
      currentCard = '6744';
      continue;
    } else if (trimmed.includes('2642') || /andrew/i.test(trimmed)) {
      currentCard = '2642';
      continue;
    }

    // Match statement transaction lines: Date [Date] Description Amount
    const match = trimmed.match(
      /^(Pending|[a-zA-Z]{3}\s+\d{1,2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(?:[a-zA-Z]{3}\s+\d{1,2}\s+|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s+)?(.+?)\s+([–-]?\s*\$?\s*[\d,]+\.\d{2}(?:\s*CR)?|\(\$?\s*[\d,]+\.\d{2}\))$/i
    );

    if (match) {
      const rawDate = match[1];
      let desc = match[2].trim();
      const rawAmt = match[3].trim();

      // Check for card in desc
      const cardMatch = desc.match(/\.\.\.(\d{4})|\b(2642|3810|6744)\b/);
      let card = currentCard;
      if (cardMatch) {
        card = cardMatch[1] || cardMatch[2];
        desc = desc.replace(cardMatch[0], '').trim();
      }

      // Check if entry itself is Capital One Travel
      if (
        /capit[oa]l\s*one\s*travel/i.test(desc) ||
        /cap\s*one\s*travel/i.test(desc) ||
        /c1\s*travel/i.test(desc) ||
        currentCard.toLowerCase() === 'travel'
      ) {
        card = 'Travel';
      }

      // Check for category
      let category = 'Other';
      for (const cat of KNOWN_CATEGORIES) {
        const catRe = new RegExp(`\\b${cat.replace('/', '\\/')}\\b`, 'i');
        if (catRe.test(desc)) {
          category = cat;
          desc = desc.replace(catRe, '').trim();
          break;
        }
      }

      // Clean description to remove any remaining card numbers or cardholder names
      desc = desc
        .replace(/\.\.\.\d{4}/g, '')
        .replace(/\b(2642|3810|6744)\b/g, '')
        .replace(/Andrew S\.|Rachel D\.|Natalie S\./gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!desc && card === 'Travel') {
        desc = 'Capital One Travel';
      }

      const isNeg =
        rawAmt.includes('-') ||
        rawAmt.includes('–') ||
        rawAmt.includes('(') ||
        rawAmt.toUpperCase().includes('CR');
      const amtVal = parseFloat(rawAmt.replace(/[^0-9.]/g, '')) || 0;

      let debit = isNeg ? 0 : amtVal;
      let credit = isNeg ? amtVal : 0;

      if (category.toLowerCase() === 'payment' && debit > 0 && credit === 0) {
        credit = debit;
        debit = 0;
      }

      const txDate = parseTransactionDate(rawDate, docYear);
      const { category: assignedCategory, isManuallyChanged } = determineCategoryWithOverrides(
        card,
        desc,
        category,
        credit,
        debit,
        txDate,
        txDate
      );

      transactions.push({
        id: `pdf-monthly-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        transactionDate: txDate,
        postedDate: txDate,
        cardNumber: card,
        description: desc || 'Transaction',
        debit,
        credit,
        category: assignedCategory,
        rawCategory: category,
        isManuallyChanged,
      });
    }
  }

  return transactions;
}
