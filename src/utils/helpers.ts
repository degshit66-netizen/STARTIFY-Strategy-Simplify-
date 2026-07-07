import { LedgerEntry } from '../types';

export function parseNum(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function r2(num: number): number {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(num: number): string {
  if (isNaN(num) || !isFinite(num)) return "0.00";
  const parsed = r2(num);
  if (parsed < 0) {
    return "(" + Math.abs(parsed).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ")";
  }
  return parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function displayMoney(n: number): string {
  return "₱ " + formatCurrency(n);
}

export function formatQtyForDisplay(qty: number): string {
  if (!isFinite(qty)) return '0';
  return Number.isInteger(qty) ? String(qty) : r2(qty).toFixed(2);
}

export function cleanDate(d: any): string {
  const s = String(d || '');
  return s.includes('T') ? s.split('T')[0] : s;
}

export const MONTH_NAMES = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
];

export function monthFromDateStr(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return MONTH_NAMES[d.getMonth()];
}

export function inPeriod(row: LedgerEntry, year: string, month: string, quarter: string = 'ALL'): boolean {
  const d = cleanDate(row.date);
  if (year !== 'ALL' && (!d || !String(d).includes(year))) return false;
  if (month !== 'ALL' && String(row.month || '').toUpperCase() !== String(month).toUpperCase()) return false;
  if (quarter !== 'ALL') {
    const quarterMonths: Record<string, string[]> = {
      Q1: ['JANUARY', 'FEBRUARY', 'MARCH'],
      Q2: ['APRIL', 'MAY', 'JUNE'],
      Q3: ['JULY', 'AUGUST', 'SEPTEMBER'],
      Q4: ['OCTOBER', 'NOVEMBER', 'DECEMBER']
    };
    const rowMonth = String(row.month || '').toUpperCase();
    const qMonths = quarterMonths[quarter] || [];
    if (!qMonths.includes(rowMonth)) return false;
  }
  return true;
}

export function isMonthLocked(
  monthStr: string,
  dateStr: string,
  lockedQuarters?: Record<string, boolean>,
  lockedMonths?: Record<string, boolean>
): boolean {
  if (!dateStr) return false;
  const year = String(dateStr).substring(0, 4);
  const m = String(monthStr || '').toUpperCase();
  let q = '';
  if (['JANUARY', 'FEBRUARY', 'MARCH'].includes(m)) q = 'Q1';
  else if (['APRIL', 'MAY', 'JUNE'].includes(m)) q = 'Q2';
  else if (['JULY', 'AUGUST', 'SEPTEMBER'].includes(m)) q = 'Q3';
  else if (['OCTOBER', 'NOVEMBER', 'DECEMBER'].includes(m)) q = 'Q4';
  return (lockedQuarters?.[q + '_' + year] === true) || (lockedMonths?.[`${m}_${year}`] === true);
}

const NON_CASH_POSTING_NATURES = new Set(['Noncash', 'Accrual', 'Reversal', 'Adjusting']);

export function isCashPostingNature(nature: string): boolean {
  return !NON_CASH_POSTING_NATURES.has(String(nature || 'Cash Transaction').trim());
}

export function deriveCashImpact(type: string, nature: string, gross: number, ewt: number): number {
  if (String(type || '').trim() === 'Setup') return 0;
  if (!isCashPostingNature(nature)) return 0;
  return r2(parseNum(gross) - parseNum(ewt));
}
