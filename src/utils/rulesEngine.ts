import { CategoryType, CreditOverrides, Transaction } from '../types';

export const MANUAL_OVERRIDES_KEY = 'credit_card_analyzer_manual_overrides';
export const CREDIT_OVERRIDES_KEY = 'credit_card_analyzer_credit_overrides';

/**
 * Retrieves stored manual credit overrides for each bucket
 */
export function getCreditOverrides(): CreditOverrides {
  try {
    const raw = localStorage.getItem(CREDIT_OVERRIDES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading credit overrides from localStorage:', e);
  }
  return {};
}

/**
 * Saves manual credit overrides for buckets
 */
export function saveCreditOverrides(overrides: CreditOverrides): void {
  try {
    localStorage.setItem(CREDIT_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('Error saving credit overrides:', e);
  }
}

/**
 * Clears all manual credit overrides (reverts to auto transaction amounts)
 */
export function clearCreditOverrides(): void {
  try {
    localStorage.removeItem(CREDIT_OVERRIDES_KEY);
  } catch (e) {
    console.warn('Error clearing credit overrides:', e);
  }
}

/**
 * Normalizes text for consistent matching across statements
 */
export function normalizeText(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a transaction represents a payment, statement credit, refund, or reward offset
 */
export function isPaymentOrCredit(t: {
  credit?: number;
  debit?: number;
  description?: string;
  rawCategory?: string;
}): boolean {
  const descLower = (t.description || '').toLowerCase();
  const rawCatLower = (t.rawCategory || '').toLowerCase();

  return (
    (typeof t.credit === 'number' && t.credit > 0) ||
    (typeof t.debit === 'number' && t.debit < 0) ||
    rawCatLower.includes('payment') ||
    rawCatLower.includes('credit') ||
    rawCatLower.includes('refund') ||
    descLower.includes('payment') ||
    descLower.includes('statement credit') ||
    descLower.includes('refund') ||
    descLower.includes('reward credit') ||
    descLower.includes('cashback') ||
    descLower.includes('ally bank') ||
    descLower.includes('autopay')
  );
}

/**
 * Retrieves all stored manual overrides from localStorage
 */
export function getManualOverrides(): Record<string, CategoryType> {
  try {
    const raw = localStorage.getItem(MANUAL_OVERRIDES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading manual overrides from localStorage:', e);
  }
  return {};
}

/**
 * Saves a single transaction manual category change for future PDF/CSV imports
 */
export function saveManualOverride(
  tx: Partial<Transaction>,
  newCategory: CategoryType
): void {
  try {
    const overrides = getManualOverrides();
    const descNorm = normalizeText(tx.description || '');
    const cardNorm = normalizeText(tx.cardNumber || '');
    const dateStr = tx.transactionDate || tx.postedDate || '';
    const debitStr = (tx.debit || 0).toFixed(2);
    const creditStr = (tx.credit || 0).toFixed(2);

    if (descNorm) {
      // 1. Merchant / description level
      overrides[`desc:${descNorm}`] = newCategory;

      // 2. Card + description level
      if (cardNorm) {
        overrides[`card_desc:${cardNorm}_${descNorm}`] = newCategory;
      }

      // 3. Exact signature level
      if (dateStr) {
        overrides[`sig:${dateStr}_${cardNorm}_${descNorm}_${debitStr}_${creditStr}`] = newCategory;
      }
    }

    localStorage.setItem(MANUAL_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('Error saving manual override:', e);
  }
}

/**
 * Saves multiple manual category changes at once
 */
export function saveManualOverrides(
  txList: Partial<Transaction>[],
  newCategory: CategoryType
): void {
  try {
    const overrides = getManualOverrides();
    txList.forEach((tx) => {
      const descNorm = normalizeText(tx.description || '');
      const cardNorm = normalizeText(tx.cardNumber || '');
      const dateStr = tx.transactionDate || tx.postedDate || '';
      const debitStr = (tx.debit || 0).toFixed(2);
      const creditStr = (tx.credit || 0).toFixed(2);

      if (descNorm) {
        overrides[`desc:${descNorm}`] = newCategory;
        if (cardNorm) {
          overrides[`card_desc:${cardNorm}_${descNorm}`] = newCategory;
        }
        if (dateStr) {
          overrides[`sig:${dateStr}_${cardNorm}_${descNorm}_${debitStr}_${creditStr}`] = newCategory;
        }
      }
    });

    localStorage.setItem(MANUAL_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('Error saving batch manual overrides:', e);
  }
}

/**
 * Clears all stored manual overrides
 */
export function clearManualOverrides(): void {
  try {
    localStorage.removeItem(MANUAL_OVERRIDES_KEY);
  } catch (e) {
    console.warn('Error clearing manual overrides:', e);
  }
}

/**
 * Checks if a transaction has a remembered manual override
 */
export function matchManualOverride(tx: {
  cardNumber?: string;
  description?: string;
  transactionDate?: string;
  postedDate?: string;
  debit?: number;
  credit?: number;
}): CategoryType | null {
  const overrides = getManualOverrides();
  const descNorm = normalizeText(tx.description || '');
  const cardNorm = normalizeText(tx.cardNumber || '');
  const dateStr = tx.transactionDate || tx.postedDate || '';
  const debitStr = (tx.debit || 0).toFixed(2);
  const creditStr = (tx.credit || 0).toFixed(2);

  // 1. Match exact transaction signature
  if (dateStr && descNorm) {
    const sigKey = `sig:${dateStr}_${cardNorm}_${descNorm}_${debitStr}_${creditStr}`;
    if (overrides[sigKey]) return overrides[sigKey];
  }

  // 2. Match Card + Description
  if (cardNorm && descNorm) {
    const cardDescKey = `card_desc:${cardNorm}_${descNorm}`;
    if (overrides[cardDescKey]) return overrides[cardDescKey];
  }

  // 3. Match Description
  if (descNorm) {
    const descKey = `desc:${descNorm}`;
    if (overrides[descKey]) return overrides[descKey];
  }

  return null;
}

/**
 * Determines transaction category, prioritizing saved manual overrides first, then default rules
 */
export function determineCategoryWithOverrides(
  cardNumber: string,
  description: string,
  rawCategory?: string,
  credit?: number,
  debit?: number,
  transactionDate?: string,
  postedDate?: string
): { category: CategoryType; isManuallyChanged: boolean } {
  const rememberedCategory = matchManualOverride({
    cardNumber,
    description,
    transactionDate,
    postedDate,
    debit,
    credit,
  });

  if (rememberedCategory) {
    return {
      category: rememberedCategory,
      isManuallyChanged: true,
    };
  }

  const defaultCategory = determineDefaultCategory(
    cardNumber,
    description,
    rawCategory,
    credit,
    debit
  );

  return {
    category: defaultCategory,
    isManuallyChanged: false,
  };
}

/**
 * Determines default category based on business rules:
 * 1. Specific payment/credit rules:
 *    - Ally Bank 6767 -> Rachel
 *    - Ally Bank 8458 -> Andrew
 * 2. Travel check (Card Travel, or description/category with "Travel") -> Leisure
 * 3. "Fee/Interest Charge" -> Leisure
 * 4. Card No. 3810 (or refunds/credits on 3810) -> Rachel
 * 5. Card No. 2642 or 6744 (or refunds/credits on 2642/6744) -> Andrew
 * 6. Credits on unassigned cards -> Andrew
 * 7. Fallback -> Leisure
 */
export function determineDefaultCategory(
  cardNumber: string,
  description: string,
  rawCategory?: string,
  credit?: number,
  debit?: number
): CategoryType {
  const descLower = (description || '').toLowerCase();
  const rawCatLower = (rawCategory || '').toLowerCase();
  const cardClean = (cardNumber || '').replace(/[^0-9]/g, '');
  const hasCredit =
    (typeof credit === 'number' && credit > 0) ||
    (typeof debit === 'number' && debit < 0) ||
    descLower.includes('refund') ||
    descLower.includes('statement credit') ||
    descLower.includes('payment') ||
    descLower.includes('reward credit');

  // 1. Ally Bank specific payment rules
  if (
    descLower.includes('6767') ||
    descLower.includes('ally bank ...6767') ||
    descLower.includes('ally ...6767') ||
    descLower.includes('ally bank 6767')
  ) {
    return 'Rachel';
  }
  if (
    descLower.includes('8458') ||
    descLower.includes('ally bank ...8458') ||
    descLower.includes('ally ...8458') ||
    descLower.includes('ally bank 8458')
  ) {
    return 'Andrew';
  }

  // 2. Travel check takes priority or applies when "travel" is in category or description or card is Travel
  if (
    cardClean.toLowerCase() === 'travel' ||
    cardNumber.toLowerCase().includes('travel') ||
    rawCatLower.includes('travel') ||
    descLower.includes('travel') ||
    /capit[oa]l\s*one\s*travel/i.test(description) ||
    /cap\s*one\s*travel/i.test(description)
  ) {
    return 'Leisure';
  }

  // 3. "Fee/Interest Charge" category or description -> Leisure
  if (
    rawCatLower.includes('fee/interest charge') ||
    rawCatLower.includes('fee/interest') ||
    rawCatLower.includes('interest charge') ||
    rawCatLower.includes('fee') ||
    descLower.includes('fee/interest charge') ||
    descLower.includes('fee/interest') ||
    descLower.includes('interest charge') ||
    descLower.includes('annual membership fee') ||
    descLower.includes('membership fee') ||
    descLower.includes('annual fee') ||
    descLower.includes('late fee') ||
    descLower.includes('finance charge') ||
    descLower.includes('foreign transaction fee')
  ) {
    return 'Leisure';
  }

  // Common travel-related keywords
  if (
    descLower.includes('airbnb') ||
    descLower.includes('expedia') ||
    descLower.includes('booking.com') ||
    descLower.includes('delta air') ||
    descLower.includes('united air') ||
    descLower.includes('hotel') ||
    descLower.includes('resort') ||
    descLower.includes('flight') ||
    descLower.includes('vacation')
  ) {
    return 'Leisure';
  }

  // 4. Card No. 3810 -> Rachel (both debits and credits)
  if (cardClean.endsWith('3810') || cardNumber.includes('3810')) {
    return 'Rachel';
  }

  // 5. Card No. 2642 or 6744 -> Andrew (both debits and credits)
  if (
    cardClean.endsWith('2642') ||
    cardNumber.includes('2642') ||
    cardClean.endsWith('6744') ||
    cardNumber.includes('6744')
  ) {
    return 'Andrew';
  }

  // 6. If credit on an unassigned card or payment, default to Andrew
  if (hasCredit) {
    return 'Andrew';
  }

  // Default fallback if neither matched
  return 'Leisure';
}

export const CATEGORY_COLORS: Record<
  CategoryType,
  {
    color: string;
    bg: string;
    border: string;
    text: string;
    fill: string;
    hoverFill: string;
    badgeBg: string;
    badgeText: string;
    gradient: string;
  }
> = {
  Andrew: {
    color: '#9333ea',
    bg: 'bg-purple-600',
    border: 'border-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    fill: '#9333ea',
    hoverFill: '#7e22ce',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    badgeText: 'text-purple-700 dark:text-purple-300',
    gradient: 'from-purple-500 to-indigo-600',
  },
  Rachel: {
    color: '#f472b6',
    bg: 'bg-pink-400',
    border: 'border-pink-200',
    text: 'text-pink-500 dark:text-pink-300',
    fill: '#f472b6',
    hoverFill: '#ec4899',
    badgeBg: 'bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-300 border-pink-200 dark:border-pink-800',
    badgeText: 'text-pink-600 dark:text-pink-300',
    gradient: 'from-pink-300 to-pink-400',
  },
  Leisure: {
    color: '#0ea5e9',
    bg: 'bg-sky-500',
    border: 'border-sky-400',
    text: 'text-sky-600 dark:text-sky-400',
    fill: '#0ea5e9',
    hoverFill: '#0284c7',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    badgeText: 'text-sky-700 dark:text-sky-300',
    gradient: 'from-sky-400 to-cyan-500',
  },
};
