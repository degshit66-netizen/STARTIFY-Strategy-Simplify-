import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, 
  FileText, 
  Download, 
  Printer, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  DollarSign, 
  FileSpreadsheet, 
  Info,
  ChevronDown,
  Search,
  BookOpen
} from 'lucide-react';
import { LedgerEntry, CompanyConfig } from '../types';
import { r2, displayMoney, formatCurrency, cleanDate, inPeriod, parseNum } from '../utils/helpers';
import { getCoaDetails } from '../data/chartOfAccounts';

interface BooksModuleProps {
  ledger: LedgerEntry[];
  yearFilter: string;
  monthFilter: string;
  quarterFilter: string;
  companyConfig: CompanyConfig;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type BookType = 
  | 'GeneralJournal' 
  | 'GeneralLedger' 
  | 'CashReceipts' 
  | 'CashDisbursements' 
  | 'SalesJournal' 
  | 'PurchasesJournal';

interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export const BooksModule: React.FC<BooksModuleProps> = ({
  ledger,
  yearFilter,
  monthFilter,
  quarterFilter,
  companyConfig,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'books' | 'relief'>('books');
  const [selectedBook, setSelectedBook] = useState<BookType>('GeneralJournal');
  
  // RELIEF Exporter States
  const [reliefQuarter, setReliefQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q2');
  const [reliefYear, setReliefYear] = useState<string>('2026');
  const [reliefType, setReliefType] = useState<'Sales' | 'Purchases'>('Sales');
  const [reliefSearch, setReliefSearch] = useState<string>('');

  const monthsMap: Record<string, string[]> = {
    Q1: ['JANUARY', 'FEBRUARY', 'MARCH'],
    Q2: ['APRIL', 'MAY', 'JUNE'],
    Q3: ['JULY', 'AUGUST', 'SEPTEMBER'],
    Q4: ['OCTOBER', 'NOVEMBER', 'DECEMBER']
  };

  const quarterEndDate: Record<string, string> = {
    Q1: '03/31',
    Q2: '06/30',
    Q3: '09/30',
    Q4: '12/31'
  };

  // 1. Double-Entry Generator for Loose-leaf Ledger & Journal
  const getJournalLines = (row: LedgerEntry): JournalLine[] => {
    const lines: JournalLine[] = [];
    const coa = getCoaDetails(row.category, row.type);
    const accName = coa.name;
    const accCode = row.accountCode || '9999';

    const gross = r2(parseNum(row.gross));
    const ewt = r2(parseNum(row.ewt));
    const cash = (row.cash !== undefined && row.cash !== null && String(row.cash) !== '') ? r2(parseNum(row.cash)) : r2(gross - ewt);
    const vat = (row.taxType === 'Exempt' || row.taxType === 'Zero-Rated' || row.taxType === 'ZeroRated') ? 0 : r2(parseNum(row.vat));
    const net = (row.taxType === 'Exempt' || row.taxType === 'Zero-Rated' || row.taxType === 'ZeroRated') ? gross : r2(parseNum(row.net) || (gross - vat));

    if (row.type === 'Setup') {
      const isDebitSetup = coa.normal === 'Debit';
      if (isDebitSetup) {
        lines.push({ accountCode: accCode, accountName: accName, debit: gross, credit: 0 });
        lines.push({ accountCode: '3010', accountName: "Owner's Capital", debit: 0, credit: gross });
      } else {
        lines.push({ accountCode: '3010', accountName: "Owner's Capital", debit: gross, credit: 0 });
        lines.push({ accountCode: accCode, accountName: accName, debit: 0, credit: gross });
      }
    } 
    else if (row.type === 'Sales') {
      // Sales Debit: Cash or Receivables
      if (cash > 0) {
        lines.push({ accountCode: '1010', accountName: 'Cash in Bank / on Hand', debit: cash, credit: 0 });
      }
      const arAmount = r2(gross - cash - ewt);
      if (arAmount > 0) {
        lines.push({ accountCode: '1020', accountName: 'Accounts Receivable', debit: arAmount, credit: 0 });
      }
      if (ewt > 0) {
        lines.push({ accountCode: '1080', accountName: 'Creditable Withholding Tax (CWT)', debit: ewt, credit: 0 });
      }
      // Sales Credit: Revenue & Output VAT
      lines.push({ accountCode: accCode, accountName: accName, debit: 0, credit: net });
      if (vat > 0) {
        lines.push({ accountCode: '2110', accountName: 'Output VAT Payable', debit: 0, credit: vat });
      }
    } 
    else if (row.type === 'Expense') {
      // Expense Debit: Cost/Expense & Input VAT
      lines.push({ accountCode: accCode, accountName: accName, debit: net, credit: 0 });
      if (vat > 0) {
        lines.push({ accountCode: '1070', accountName: 'Input VAT', debit: vat, credit: 0 });
      }
      // Expense Credit: Cash or Payables
      if (cash > 0) {
        lines.push({ accountCode: '1010', accountName: 'Cash in Bank / on Hand', debit: 0, credit: cash });
      }
      const apAmount = r2(gross - cash - ewt);
      if (apAmount > 0) {
        lines.push({ accountCode: '2010', accountName: 'Accounts Payable', debit: 0, credit: apAmount });
      }
      if (ewt > 0) {
        lines.push({ accountCode: '2111', accountName: 'EWT Payable', debit: 0, credit: ewt });
      }
    } 
    else if (row.type === 'Closing') {
      const isDebitClose = coa.normal === 'Credit';
      if (isDebitClose) {
        lines.push({ accountCode: accCode, accountName: accName, debit: gross, credit: 0 });
        lines.push({ accountCode: '3100', accountName: 'Retained Earnings', debit: 0, credit: gross });
      } else {
        lines.push({ accountCode: '3100', accountName: 'Retained Earnings', debit: gross, credit: 0 });
        lines.push({ accountCode: accCode, accountName: accName, debit: 0, credit: gross });
      }
    }
    return lines;
  };

  // Helper to filter active ledger rows
  const filteredLedger = useMemo(() => {
    return ledger.filter(r => r.status !== 'Void' && inPeriod(r, yearFilter, monthFilter, quarterFilter));
  }, [ledger, yearFilter, monthFilter, quarterFilter]);

  // 2. Build the Books of Account Lists
  const booksData = useMemo(() => {
    // A. General Journal rows
    const journalEntries = filteredLedger.map(row => {
      const entryLines = getJournalLines(row);
      const totalDebit = entryLines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = entryLines.reduce((sum, l) => sum + l.credit, 0);
      return {
        id: row.id,
        date: row.date,
        ref: row.ref || `TX-${row.id}`,
        particulars: row.particulars,
        lines: entryLines,
        totalDebit,
        totalCredit
      };
    });

    // B. General Ledger rows (grouped by Account Code)
    const ledgerGroups: Record<string, { code: string; name: string; begBalance: number; entries: any[] }> = {};
    
    // Aggregate past balances to compute Beginning Balance
    const pastLedger = ledger.filter(r => {
      if (r.status === 'Void') return false;
      const cleanDateStr = cleanDate(r.date);
      const recYear = cleanDateStr.substring(0, 4);
      const rowMonth = String(r.month || '').toUpperCase();

      if (yearFilter !== 'ALL' && recYear < yearFilter) return true;
      if (yearFilter !== 'ALL' && recYear === yearFilter) {
        if (monthFilter !== 'ALL') {
          const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
          const targetIdx = monthNames.indexOf(monthFilter);
          const rowIdx = monthNames.indexOf(rowMonth);
          return rowIdx < targetIdx;
        }
        if (quarterFilter !== 'ALL') {
          const qMonths = monthsMap[quarterFilter] || [];
          const rowIdx = (monthsMap.Q1.concat(monthsMap.Q2, monthsMap.Q3, monthsMap.Q4)).indexOf(rowMonth);
          const qStartIdx = (monthsMap.Q1.concat(monthsMap.Q2, monthsMap.Q3, monthsMap.Q4)).indexOf(qMonths[0]);
          return rowIdx < qStartIdx;
        }
      }
      return false;
    });

    // Hydrate beginning balances
    pastLedger.forEach(row => {
      const lines = getJournalLines(row);
      lines.forEach(l => {
        if (!ledgerGroups[l.accountCode]) {
          ledgerGroups[l.accountCode] = { code: l.accountCode, name: l.accountName, begBalance: 0, entries: [] };
        }
        const coa = getCoaDetails(l.accountName, row.type);
        const change = coa.normal === 'Debit' ? (l.debit - l.credit) : (l.credit - l.debit);
        ledgerGroups[l.accountCode].begBalance += change;
      });
    });

    // Add current entries
    filteredLedger.forEach(row => {
      const lines = getJournalLines(row);
      lines.forEach(l => {
        if (!ledgerGroups[l.accountCode]) {
          ledgerGroups[l.accountCode] = { code: l.accountCode, name: l.accountName, begBalance: 0, entries: [] };
        }
        ledgerGroups[l.accountCode].entries.push({
          date: row.date,
          ref: row.ref || `TX-${row.id}`,
          particulars: row.particulars,
          debit: l.debit,
          credit: l.credit
        });
      });
    });

    // C. Cash Receipts Journal
    const cashReceipts = filteredLedger.filter(row => {
      const lines = getJournalLines(row);
      return lines.some(l => l.accountCode === '1010' && l.debit > 0);
    }).map(row => {
      const lines = getJournalLines(row);
      const cashDebit = lines.find(l => l.accountCode === '1010')?.debit || 0;
      const salesCredit = lines.find(l => l.accountCode === '4010' || l.accountCode === '4011')?.credit || 0;
      const vatCredit = lines.find(l => l.accountCode === '2110' || l.accountCode === '2070')?.credit || 0;
      const arCredit = lines.find(l => l.accountCode === '1020')?.credit || 0;
      
      const otherLines = lines.filter(l => l.accountCode !== '1010' && l.accountCode !== '1020' && l.accountCode !== '2110' && l.accountCode !== '4010' && l.accountCode !== '4011');
      return {
        date: row.date,
        ref: row.ref || `OR-${row.id}`,
        payor: row.payor,
        particulars: row.particulars,
        cashDebit,
        arCredit,
        salesCredit,
        vatCredit,
        other: otherLines.map(o => `${o.accountName} (${o.debit > 0 ? 'Dr' : 'Cr'} ${formatCurrency(o.debit || o.credit)})`).join(', ')
      };
    });

    // D. Cash Disbursements Journal
    const cashDisbursements = filteredLedger.filter(row => {
      const lines = getJournalLines(row);
      return lines.some(l => l.accountCode === '1010' && l.credit > 0);
    }).map(row => {
      const lines = getJournalLines(row);
      const cashCredit = lines.find(l => l.accountCode === '1010')?.credit || 0;
      const apDebit = lines.find(l => l.accountCode === '2010')?.debit || 0;
      const purchaseDebit = lines.find(l => l.accountCode === '5010' || l.accountCode.startsWith('6'))?.debit || 0;
      const vatDebit = lines.find(l => l.accountCode === '1070')?.debit || 0;

      const otherLines = lines.filter(l => l.accountCode !== '1010' && l.accountCode !== '2010' && l.accountCode !== '1070' && l.accountCode !== '5010' && !l.accountCode.startsWith('6'));
      return {
        date: row.date,
        ref: row.ref || `CV-${row.id}`,
        payee: row.payor,
        particulars: row.particulars,
        cashCredit,
        apDebit,
        purchaseDebit,
        vatDebit,
        other: otherLines.map(o => `${o.accountName} (${o.debit > 0 ? 'Dr' : 'Cr'} ${formatCurrency(o.debit || o.credit)})`).join(', ')
      };
    });

    // E. Sales Journal
    const salesJournal = filteredLedger.filter(row => row.type === 'Sales').map(row => {
      const gross = r2(parseNum(row.gross));
      const vat = (row.taxType === 'Exempt' || row.taxType === 'Zero-Rated' || row.taxType === 'ZeroRated') ? 0 : r2(parseNum(row.vat));
      const net = gross - vat;
      const isCreditSales = row.terms !== 'COD' && row.terms !== 'Cash';
      return {
        date: row.date,
        ref: row.ref || `SI-${row.id}`,
        customer: row.payor,
        tin: row.tin || 'N/A',
        gross,
        taxable: row.taxType === 'Vatable' ? net : 0,
        exempt: row.taxType === 'Exempt' ? gross : 0,
        zeroRated: (row.taxType === 'Zero-Rated' || row.taxType === 'ZeroRated') ? gross : 0,
        vat,
        arDebit: isCreditSales ? gross : 0,
        cashDebit: !isCreditSales ? gross : 0
      };
    });

    // F. Purchases Journal
    const purchasesJournal = filteredLedger.filter(row => row.type === 'Expense').map(row => {
      const gross = r2(parseNum(row.gross));
      const vat = (row.taxType === 'Exempt' || row.taxType === 'Zero-Rated' || row.taxType === 'ZeroRated') ? 0 : r2(parseNum(row.vat));
      const net = gross - vat;
      const isCreditPurch = row.terms !== 'COD' && row.terms !== 'Cash';
      return {
        date: row.date,
        ref: row.ref || `RR-${row.id}`,
        vendor: row.payor,
        tin: row.tin || 'N/A',
        gross,
        taxable: row.taxType === 'Vatable' ? net : 0,
        exempt: row.taxType === 'Exempt' ? gross : 0,
        zeroRated: (row.taxType === 'Zero-Rated' || row.taxType === 'ZeroRated') ? gross : 0,
        vat,
        apCredit: isCreditPurch ? gross : 0,
        cashCredit: !isCreditPurch ? gross : 0
      };
    });

    return {
      journalEntries,
      ledgerGroups,
      cashReceipts,
      cashDisbursements,
      salesJournal,
      purchasesJournal
    };
  }, [filteredLedger, ledger, yearFilter, monthFilter, quarterFilter]);

  // Compute flattened GL entries with correct running balance
  const flattenedGLEntries = useMemo(() => {
    const result: any[] = [];
    Object.keys(booksData.ledgerGroups).sort().forEach(code => {
      const g = booksData.ledgerGroups[code];
      const coa = getCoaDetails(g.name, 'Setup');
      const isDebitNormal = coa.normal === 'Debit';
      let currentBalance = g.begBalance;
      
      const sortedEntries = [...g.entries].sort((a, b) => a.date.localeCompare(b.date));
      sortedEntries.forEach(entry => {
        if (isDebitNormal) {
          currentBalance = currentBalance + entry.debit - entry.credit;
        } else {
          currentBalance = currentBalance + entry.credit - entry.debit;
        }
        result.push({
          accountTitle: `${code} - ${g.name}`,
          date: entry.date,
          ref: entry.ref,
          debit: entry.debit,
          credit: entry.credit,
          runningBalance: currentBalance
        });
      });
    });
    return result;
  }, [booksData.ledgerGroups]);

  // Calculate dynamic rows count for each book
  const totalRowsCount = useMemo(() => {
    switch (selectedBook) {
      case 'GeneralJournal':
        return booksData.journalEntries.reduce((sum, entry) => sum + entry.lines.length, 0);
      case 'GeneralLedger':
        return flattenedGLEntries.length;
      case 'SalesJournal':
        return booksData.salesJournal.length;
      case 'PurchasesJournal':
        return booksData.purchasesJournal.length;
      case 'CashReceipts':
        return booksData.cashReceipts.length;
      case 'CashDisbursements':
        return booksData.cashDisbursements.length;
      default:
        return 0;
    }
  }, [selectedBook, booksData, flattenedGLEntries]);

  // RELIEF Exporter Data
  const reliefRows = useMemo(() => {
    const qMonths = monthsMap[reliefQuarter] || [];
    return ledger.filter(row => {
      if (row.status === 'Void') return false;
      const cleanDateStr = cleanDate(row.date);
      const recYear = cleanDateStr.substring(0, 4);
      const rowMonth = String(row.month || '').toUpperCase();

      if (recYear !== reliefYear) return false;
      if (!qMonths.includes(rowMonth)) return false;

      if (reliefType === 'Sales') {
        return row.type === 'Sales';
      } else {
        return row.type === 'Expense';
      }
    });
  }, [ledger, reliefQuarter, reliefYear, reliefType]);

  // Filtered RELIEF detail preview
  const filteredRelief = useMemo(() => {
    if (!reliefSearch) return reliefRows;
    const q = reliefSearch.toLowerCase();
    return reliefRows.filter(r => 
      String(r.payor || '').toLowerCase().includes(q) || 
      String(r.tin || '').includes(q) || 
      String(r.particulars || '').toLowerCase().includes(q)
    );
  }, [reliefRows, reliefSearch]);

  const rawCompanyTin = companyConfig.tin.replace(/[^0-9]/g, '');

  // RELIEF DAT File Generator
  const handleDownloadReliefDat = () => {
    if (reliefRows.length === 0) {
      alert('Walang data na makukuha para sa napiling quarter at taon.');
      return;
    }

    const qCode = reliefQuarter;
    const endMMDDYYYY = quarterEndDate[qCode] + '/' + reliefYear;
    
    // Header Line
    // H, [Sales/Purch: S/P], [TIN (9-12 digits)], [Registered Name], [Trade Name], [Address], [Contact], [Quarter End Date], [Year]
    const headerName = companyConfig.companyName.replace(/,/g, ' ');
    const headerAddr = companyConfig.address.replace(/,/g, ' ');
    const hType = reliefType === 'Sales' ? 'S' : 'P';
    
    let datContent = `H,${hType},${rawCompanyTin},"${headerName}","${headerName}","${headerAddr}","",${endMMDDYYYY},${reliefYear}\r\n`;

    // Detail Lines
    reliefRows.forEach(row => {
      const gross = r2(parseNum(row.gross));
      const vat = (row.taxType === 'Exempt' || row.taxType === 'Zero-Rated' || row.taxType === 'ZeroRated') ? 0 : r2(parseNum(row.vat));
      const net = gross - vat;

      const entityName = (row.payor || 'General Customer').replace(/,/g, ' ');
      const entityAddr = (row.address || 'Philippines').replace(/,/g, ' ');
      const entityTin = (row.tin || '000-000-000-000').replace(/[^0-9]/g, '').padEnd(12, '0').slice(0, 12);

      let exempt = 0;
      let zeroRated = 0;
      let taxable = 0;

      if (row.taxType === 'Exempt') exempt = gross;
      else if (row.taxType === 'Zero-Rated' || row.taxType === 'ZeroRated') zeroRated = gross;
      else taxable = net;

      if (reliefType === 'Sales') {
        // D, S, TIN, REGISTERED NAME, OWNER LAST, FIRST, MIDDLE, ADDRESS, GROSS, EXEMPT, ZERO-RATED, TAXABLE, OUTPUT VAT
        datContent += `D,S,${entityTin},"${entityName}","","","","${entityAddr}",${gross.toFixed(2)},${exempt.toFixed(2)},${zeroRated.toFixed(2)},${taxable.toFixed(2)},${vat.toFixed(2)}\r\n`;
      } else {
        // D, P, TIN, REGISTERED NAME, OWNER LAST, FIRST, MIDDLE, ADDRESS, GROSS, EXEMPT, ZERO-RATED, TAXABLE, INPUT VAT
        datContent += `D,P,${entityTin},"${entityName}","","","","${entityAddr}",${gross.toFixed(2)},${exempt.toFixed(2)},${zeroRated.toFixed(2)},${taxable.toFixed(2)},${vat.toFixed(2)}\r\n`;
      }
    });

    const blob = new Blob([datContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    
    // Official File Naming Protocol
    // TIN_S_MMYYYY.DAT or TIN_P_MMYYYY.DAT
    const mm = quarterEndDate[qCode].split('/')[0];
    const filename = `${rawCompanyTin}${hType}${mm}${reliefYear}.DAT`;
    
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Looseleaf 6 Books Text Formatter
  const handleDownloadLooseleafText = () => {
    let output = '';
    const addHeader = (title: string, pageNum: number) => {
      return `================================================================================
BUSINESS NAME : ${companyConfig.companyName}
TIN           : ${companyConfig.tin}
ADDRESS       : ${companyConfig.address}
PTU NUMBER    : ${companyConfig.ptuNo}

OFFICIAL LOOSE-LEAF BOOK : ${title.toUpperCase()}
PERIOD COVERED           : ${monthFilter === 'ALL' ? `FULL YEAR ${yearFilter}` : `${monthFilter} ${yearFilter}`}
PAGE NUMBER              : PAGE ${pageNum}
================================================================================\r\n\r\n`;
    };

    if (selectedBook === 'GeneralJournal') {
      let pageNum = 1;
      output += addHeader('General Journal (Jurnal na Pangkalahatan)', pageNum);
      output += String('DATE').padEnd(12) + ' ' + String('REF').padEnd(12) + ' ' + String('ACCOUNT CODE & TITLE').padEnd(36) + ' ' + String('DEBIT (PHP)').padStart(15) + ' ' + String('CREDIT (PHP)').padStart(15) + '\r\n';
      output += '-'.repeat(96) + '\r\n';

      booksData.journalEntries.forEach(row => {
        row.lines.forEach((l, idx) => {
          const dateCol = idx === 0 ? row.date : '';
          const refCol = idx === 0 ? row.ref : '';
          const codeAndTitle = `  ${l.accountCode} - ${l.accountName}`;
          const drStr = l.debit > 0 ? l.debit.toFixed(2) : '';
          const crStr = l.credit > 0 ? l.credit.toFixed(2) : '';
          
          output += dateCol.padEnd(12) + ' ' + refCol.padEnd(12) + ' ' + codeAndTitle.padEnd(36) + ' ' + drStr.padStart(15) + ' ' + crStr.padStart(15) + '\r\n';
        });
        output += `Particulars: ${row.particulars}\r\n`;
        output += '-'.repeat(96) + '\r\n';
      });
    } 
    else if (selectedBook === 'GeneralLedger') {
      let pageNum = 1;
      output += addHeader('General Ledger (Aklat na Pangkalahatan)', pageNum);
      
      Object.keys(booksData.ledgerGroups).sort().forEach(code => {
        const g = booksData.ledgerGroups[code];
        output += `\r\nACCOUNT: ${g.code} - ${g.name.toUpperCase()}\r\n`;
        output += `BEGINNING BALANCE: ${formatCurrency(g.begBalance)}\r\n`;
        output += '-'.repeat(96) + '\r\n';
        output += String('DATE').padEnd(12) + ' ' + String('REF').padEnd(12) + ' ' + String('PARTICULARS').padEnd(36) + ' ' + String('DEBIT (DR)').padStart(15) + ' ' + String('CREDIT (CR)').padStart(15) + '\r\n';
        output += '-'.repeat(96) + '\r\n';

        let runBal = g.begBalance;
        const normal = getCoaDetails(g.name, 'Setup').normal;
        
        g.entries.forEach(e => {
          const drStr = e.debit > 0 ? e.debit.toFixed(2) : '';
          const crStr = e.credit > 0 ? e.credit.toFixed(2) : '';
          output += e.date.padEnd(12) + ' ' + e.ref.padEnd(12) + ' ' + e.particulars.slice(0, 35).padEnd(36) + ' ' + drStr.padStart(15) + ' ' + crStr.padStart(15) + '\r\n';
        });
        output += '-'.repeat(96) + '\r\n\r\n';
      });
    }
    else if (selectedBook === 'CashReceipts') {
      let pageNum = 1;
      output += addHeader('Cash Receipts Journal', pageNum);
      output += String('DATE').padEnd(10) + ' ' + String('REF').padEnd(10) + ' ' + String('PAYOR').padEnd(20) + ' ' + String('CASH DR').padStart(11) + ' ' + String('AR CR').padStart(11) + ' ' + String('SALES CR').padStart(11) + ' ' + String('VAT CR').padStart(11) + '\r\n';
      output += '-'.repeat(96) + '\r\n';

      booksData.cashReceipts.forEach(r => {
        output += r.date.padEnd(10) + ' ' + r.ref.padEnd(10) + ' ' + r.payor.slice(0,18).padEnd(20) + ' ' + 
                  (r.cashDebit > 0 ? r.cashDebit.toFixed(2) : '0.00').padStart(11) + ' ' +
                  (r.arCredit > 0 ? r.arCredit.toFixed(2) : '0.00').padStart(11) + ' ' +
                  (r.salesCredit > 0 ? r.salesCredit.toFixed(2) : '0.00').padStart(11) + ' ' +
                  (r.vatCredit > 0 ? r.vatCredit.toFixed(2) : '0.00').padStart(11) + '\r\n';
      });
    }
    else if (selectedBook === 'CashDisbursements') {
      let pageNum = 1;
      output += addHeader('Cash Disbursements Journal', pageNum);
      output += String('DATE').padEnd(10) + ' ' + String('REF').padEnd(10) + ' ' + String('PAYEE').padEnd(20) + ' ' + String('CASH CR').padStart(11) + ' ' + String('AP DR').padStart(11) + ' ' + String('PURCH DR').padStart(11) + ' ' + String('VAT DR').padStart(11) + '\r\n';
      output += '-'.repeat(96) + '\r\n';

      booksData.cashDisbursements.forEach(r => {
        output += r.date.padEnd(10) + ' ' + r.ref.padEnd(10) + ' ' + r.payee.slice(0,18).padEnd(20) + ' ' + 
                  (r.cashCredit > 0 ? r.cashCredit.toFixed(2) : '0.00').padStart(11) + ' ' +
                  (r.apDebit > 0 ? r.apDebit.toFixed(2) : '0.00').padStart(11) + ' ' +
                  (r.purchaseDebit > 0 ? r.purchaseDebit.toFixed(2) : '0.00').padStart(11) + ' ' +
                  (r.vatDebit > 0 ? r.vatDebit.toFixed(2) : '0.00').padStart(11) + '\r\n';
      });
    }
    else if (selectedBook === 'SalesJournal') {
      let pageNum = 1;
      output += addHeader('Sales Journal', pageNum);
      output += String('DATE').padEnd(10) + ' ' + String('REF').padEnd(10) + ' ' + String('CUSTOMER').padEnd(20) + ' ' + String('GROSS').padStart(11) + ' ' + String('TAXABLE').padStart(11) + ' ' + String('EXEMPT').padStart(11) + ' ' + String('OUTPUT VAT').padStart(11) + '\r\n';
      output += '-'.repeat(96) + '\r\n';

      booksData.salesJournal.forEach(r => {
        output += r.date.padEnd(10) + ' ' + r.ref.padEnd(10) + ' ' + r.customer.slice(0,18).padEnd(20) + ' ' + 
                  r.gross.toFixed(2).padStart(11) + ' ' +
                  r.taxable.toFixed(2).padStart(11) + ' ' +
                  r.exempt.toFixed(2).padStart(11) + ' ' +
                  r.vat.toFixed(2).padStart(11) + '\r\n';
      });
    }
    else if (selectedBook === 'PurchasesJournal') {
      let pageNum = 1;
      output += addHeader('Purchases Journal', pageNum);
      output += String('DATE').padEnd(10) + ' ' + String('REF').padEnd(10) + ' ' + String('VENDOR').padEnd(20) + ' ' + String('GROSS').padStart(11) + ' ' + String('TAXABLE').padStart(11) + ' ' + String('EXEMPT').padStart(11) + ' ' + String('INPUT VAT').padStart(11) + '\r\n';
      output += '-'.repeat(96) + '\r\n';

      booksData.purchasesJournal.forEach(r => {
        output += r.date.padEnd(10) + ' ' + r.ref.padEnd(10) + ' ' + r.vendor.slice(0,18).padEnd(20) + ' ' + 
                  r.gross.toFixed(2).padStart(11) + ' ' +
                  r.taxable.toFixed(2).padStart(11) + ' ' +
                  r.exempt.toFixed(2).padStart(11) + ' ' +
                  r.vat.toFixed(2).padStart(11) + '\r\n';
      });
    }

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedBook}_${yearFilter}_${monthFilter}.TXT`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handlePrintBook = () => {
    if (showToast) {
      showToast('Opening Print Dialog... If your browser blocks it inside this iframe preview, please click the "Open in new tab" icon on the top right to print successfully!', 'info');
    }
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 no-print">
        <div>
          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Book className="w-6 h-6 text-blue-500" />
            <span>BIR Compliance Hub</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Generate official Loose-leaf Books of Accounts, BIR RELIEF DAT Files, and audit-ready outputs.</p>
        </div>
        
        {/* Module Subtabs */}
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/30">
          <button
            onClick={() => setActiveTab('books')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'books'
                ? 'bg-white dark:bg-zinc-850 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-850'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>6 Books of Accounts</span>
          </button>
          <button
            onClick={() => setActiveTab('relief')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'relief'
                ? 'bg-white dark:bg-zinc-850 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-850'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>BIR RELIEF DAT Exporter</span>
          </button>
        </div>
      </div>

      {/* COMPLIANCE ALERT WARNINGS (NO-PRINT) */}
      <div className="no-print bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex gap-3 items-start">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-left space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">BIR Strict Loose-leaf Requirements</h4>
            <p className="text-[11px] text-zinc-400 max-w-2xl leading-relaxed">
              Under BIR Revenue Memorandum Circular (RMC) No. 13-2016, users of Loose-leaf Books must bind their generated sheets chronologically and submit an Affidavit of Charakter (Annex C) within 15 days after the close of each taxable year to avoid penalties.
            </p>
          </div>
        </div>
        <div className="text-[10px] text-zinc-400 font-mono bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800">
          <span>PTU NO: </span>
          <span className="text-emerald-400 font-bold">{companyConfig.ptuNo || 'PTU-PENDING'}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'books' ? (
          <motion.div
            key="books"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            
            {/* Book Selector Grid (NO-PRINT) */}
            <div className="no-print grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { id: 'GeneralJournal', label: 'General Journal', desc: 'Jurnal na Pangkalahatan' },
                { id: 'GeneralLedger', label: 'General Ledger', desc: 'Aklat na Pangkalahatan' },
                { id: 'CashReceipts', label: 'Cash Receipts', desc: 'Koleksyon ng Cash' },
                { id: 'CashDisbursements', label: 'Cash Disbursements', desc: 'Pagbayad ng Cash' },
                { id: 'SalesJournal', label: 'Sales Journal', desc: 'Journal ng Benta' },
                { id: 'PurchasesJournal', label: 'Purchases Journal', desc: 'Journal ng Pagbili' }
              ].map(bk => {
                const isSel = selectedBook === bk.id;
                return (
                  <button
                    key={bk.id}
                    onClick={() => setSelectedBook(bk.id as BookType)}
                    className={`p-3.5 text-left rounded-2xl border transition-all ${
                      isSel 
                        ? 'bg-blue-400/10 border-blue-400 text-blue-500' 
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                    }`}
                  >
                    <h5 className="text-xs font-bold truncate">{bk.label}</h5>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{bk.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Print/Download controls (NO-PRINT) */}
            <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
              <div className="text-left">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Active Target Book</span>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase mt-0.5">
                  {selectedBook.replace(/([A-Z])/g, ' $1').trim()} Loose-leaf Report
                </h3>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDownloadLooseleafText}
                  className="flex items-center gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-850 text-white font-bold px-4 py-2.5 rounded-xl transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Looseleaf TXT</span>
                </button>
                <button
                  onClick={handlePrintBook}
                  className="flex items-center gap-1.5 text-xs bg-blue-400 hover:bg-blue-300 text-zinc-950 font-bold px-4 py-2.5 rounded-xl transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Book Report</span>
                </button>
              </div>
            </div>

            {/* THE LOOSELEAF SHEET (Beautiful Print Render matching BIR screenshots) */}
            <div 
              id="looseleafPrintContainer" 
              className="bg-white dark:bg-zinc-900 border-2 border-zinc-950 dark:border-zinc-150 rounded-none shadow-sm p-6 sm:p-8 space-y-6 text-zinc-900 dark:text-zinc-100 text-left relative font-sans"
            >
              {/* Internal self-contained print overrides block */}
              <style>{`
                @media print {
                  /* Hide all default layout margins, banners, sidebars, buttons, headers */
                  body * {
                    visibility: hidden !important;
                  }
                  #looseleafPrintContainer, #looseleafPrintContainer * {
                    visibility: visible !important;
                  }
                  #looseleafPrintContainer {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 1.5in 0.8in 0.8in 0.8in !important;
                    border: 2px solid #000000 !important;
                    box-shadow: none !important;
                    background: white !important;
                    color: black !important;
                  }
                  /* Page breaks, margins, etc */
                  @page {
                    size: portrait;
                    margin: 0.5in;
                  }
                  /* Enforce sharp black solid borders */
                  #looseleafPrintContainer th,
                  #looseleafPrintContainer td {
                    border-color: #000000 !important;
                    color: #000000 !important;
                    background-color: transparent !important;
                  }
                  #looseleafPrintContainer table {
                    border-color: #000000 !important;
                  }
                  #looseleafPrintContainer .bg-zinc-50,
                  #looseleafPrintContainer .bg-zinc-100,
                  #looseleafPrintContainer .bg-zinc-950,
                  #looseleafPrintContainer .bg-zinc-900 {
                    background-color: #f4f4f5 !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                }
              `}</style>
              
              {/* Official stamp/authority header */}
              <div className="flex justify-between items-start border-b-2 border-zinc-950 dark:border-zinc-700 pb-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-black uppercase tracking-wider font-sans text-zinc-950 dark:text-white leading-none">
                    {companyConfig.companyName || "COMPANY NAME"}
                  </h2>
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    TIN: <span className="font-extrabold">{companyConfig.tin || "000-000-000-000"}</span> | PTU: ________________
                  </p>
                  <p className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                    {companyConfig.address || "Business Address"}
                  </p>
                </div>
                <div className="border-2 border-zinc-950 dark:border-zinc-300 text-center font-mono w-28 py-2 px-3 bg-zinc-50 dark:bg-zinc-950 shrink-0">
                  <span className="text-[9px] uppercase font-bold tracking-wider block text-zinc-500 dark:text-zinc-450">BOOK CODE</span>
                  <span className="text-2xl font-black text-zinc-900 dark:text-white block mt-0.5">
                    {selectedBook === 'GeneralJournal' && 'GJ'}
                    {selectedBook === 'GeneralLedger' && 'GL'}
                    {selectedBook === 'SalesJournal' && 'SJ'}
                    {selectedBook === 'PurchasesJournal' && 'PJ'}
                    {selectedBook === 'CashReceipts' && 'CRJ'}
                    {selectedBook === 'CashDisbursements' && 'CDJ'}
                  </span>
                </div>
              </div>

              {/* Title Header */}
              <div className="text-center space-y-1.5 py-1">
                <h3 className="text-lg font-black uppercase tracking-widest text-zinc-950 dark:text-white font-sans">
                  {selectedBook === 'GeneralJournal' && 'GENERAL JOURNAL'}
                  {selectedBook === 'GeneralLedger' && 'GENERAL LEDGER'}
                  {selectedBook === 'SalesJournal' && 'SALES JOURNAL'}
                  {selectedBook === 'PurchasesJournal' && 'PURCHASE JOURNAL'}
                  {selectedBook === 'CashReceipts' && 'CASH RECEIPTS JOURNAL'}
                  {selectedBook === 'CashDisbursements' && 'CASH DISBURSEMENTS JOURNAL'}
                </h3>
                <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Loose Leaf / BIR Compliance Printout • For the Period: {monthFilter === 'ALL' ? `Year ${yearFilter}` : `${monthFilter} ${yearFilter}`}
                </p>
              </div>

              {/* Parametrical metadata table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-zinc-950 dark:border-zinc-700 text-[11px] text-left font-sans">
                  <tbody>
                    <tr className="border-b-2 border-zinc-950 dark:border-zinc-700">
                      <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 font-bold w-[15%] bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">Company</td>
                      <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 w-[35%] font-black text-zinc-900 dark:text-zinc-100">{companyConfig.companyName}</td>
                      <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 font-bold w-[15%] bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">Prepared</td>
                      <td className="px-3 py-1.5 w-[35%] font-medium text-zinc-850 dark:text-zinc-200">
                        {new Date().toLocaleString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })}
                      </td>
                    </tr>
                    <tr className="border-b-2 border-zinc-950 dark:border-zinc-700">
                      <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">Book</td>
                      <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 font-black text-zinc-900 dark:text-zinc-100">
                        {selectedBook === 'GeneralJournal' && 'General Journal'}
                        {selectedBook === 'GeneralLedger' && 'General Ledger'}
                        {selectedBook === 'SalesJournal' && 'Sales Journal'}
                        {selectedBook === 'PurchasesJournal' && 'Purchase Journal'}
                        {selectedBook === 'CashReceipts' && 'Cash Receipts Journal'}
                        {selectedBook === 'CashDisbursements' && 'Cash Disbursements Journal'}
                      </td>
                      <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">Authority / PTU</td>
                      <td className="px-3 py-1.5 font-bold text-zinc-850 dark:text-zinc-200">{companyConfig.ptuNo || '________________'}</td>
                    </tr>
                    <tr>
                      <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">Rows</td>
                      <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 font-mono font-bold text-zinc-900 dark:text-zinc-100">{totalRowsCount}</td>
                      <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">Source</td>
                      <td className="px-3 py-1.5 font-bold text-zinc-850 dark:text-zinc-200">Saved transactions</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Dynamic Book Content Grid Rendering */}
              <div className="overflow-x-auto min-w-0">
                {selectedBook === 'GeneralJournal' && (
                  <table className="w-full border-collapse border-2 border-zinc-950 dark:border-zinc-700 text-xs font-mono">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-950/40 border-b-2 border-zinc-950 dark:border-zinc-700 font-bold text-zinc-800 dark:text-zinc-300 text-left">
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-center w-24 uppercase tracking-wider text-[10px]">DATE</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-center w-28 uppercase tracking-wider text-[10px]">REF</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 uppercase tracking-wider text-[10px]">ACCOUNT TITLE</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right w-36 uppercase tracking-wider text-[10px]">DEBIT</th>
                        <th className="px-3 py-2 text-right w-36 uppercase tracking-wider text-[10px]">CREDIT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-950 dark:divide-zinc-700">
                      {booksData.journalEntries.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-400 font-sans italic border-b border-zinc-950">Walang journal entries sa napiling panahon.</td>
                        </tr>
                      ) : (
                        booksData.journalEntries.map(row => (
                          <React.Fragment key={row.id}>
                            {row.lines.map((l, lIdx) => (
                              <tr key={`${row.id}-${lIdx}`} className="hover:bg-zinc-50/50">
                                <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 font-sans text-center text-zinc-650 dark:text-zinc-400">
                                  {lIdx === 0 ? row.date : ''}
                                </td>
                                <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-center text-zinc-650 dark:text-zinc-400 font-mono font-bold">
                                  {lIdx === 0 ? row.ref : ''}
                                </td>
                                <td className={`border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 ${l.credit > 0 ? 'pl-8 text-zinc-700 dark:text-zinc-400' : 'font-semibold text-zinc-900 dark:text-zinc-200'}`}>
                                  {l.accountCode} - {l.accountName}
                                </td>
                                <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-right font-mono font-bold">
                                  {l.debit > 0 ? formatCurrency(l.debit) : '0.00'}
                                </td>
                                <td className="px-3 py-1.5 text-right font-mono font-bold">
                                  {l.credit > 0 ? formatCurrency(l.credit) : '0.00'}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      )}
                      {/* Total row matching page 1 */}
                      <tr className="font-black bg-zinc-50 dark:bg-zinc-950 border-t-2 border-zinc-950 dark:border-zinc-700">
                        <td colSpan={3} className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right uppercase tracking-wider text-[10px]">TOTAL</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right font-mono">
                          {formatCurrency(booksData.journalEntries.reduce((sum, e) => sum + e.totalDebit, 0))}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatCurrency(booksData.journalEntries.reduce((sum, e) => sum + e.totalCredit, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {selectedBook === 'GeneralLedger' && (
                  <table className="w-full border-collapse border-2 border-zinc-950 dark:border-zinc-700 text-xs font-mono">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-950/40 border-b-2 border-zinc-950 dark:border-zinc-700 font-bold text-zinc-800 dark:text-zinc-300 text-left">
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 uppercase tracking-wider text-[10px]">ACCOUNT TITLE</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-center w-24 uppercase tracking-wider text-[10px]">DATE</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-center w-28 uppercase tracking-wider text-[10px]">REF</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right w-32 uppercase tracking-wider text-[10px]">DEBIT</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right w-32 uppercase tracking-wider text-[10px]">CREDIT</th>
                        <th className="px-3 py-2 text-right w-36 uppercase tracking-wider text-[10px]">RUNNING BALANCE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-950 dark:divide-zinc-700">
                      {flattenedGLEntries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-zinc-400 font-sans italic border-b border-zinc-950">Walang ledger entries sa napiling panahon.</td>
                        </tr>
                      ) : (
                        flattenedGLEntries.map((e, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/50">
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 font-sans font-bold text-zinc-900 dark:text-zinc-200 text-[11px]">
                              {e.accountTitle}
                            </td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-center font-sans text-zinc-650 dark:text-zinc-400">
                              {e.date}
                            </td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-center text-zinc-650 dark:text-zinc-400 font-mono font-bold">
                              {e.ref}
                            </td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-right font-mono">
                              {e.debit > 0 ? formatCurrency(e.debit) : '0.00'}
                            </td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-right font-mono">
                              {e.credit > 0 ? formatCurrency(e.credit) : '0.00'}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-200">
                              {formatCurrency(e.runningBalance)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {selectedBook === 'CashReceipts' && (
                  <table className="w-full border-collapse border-2 border-zinc-950 dark:border-zinc-700 text-xs font-mono">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-950/40 border-b-2 border-zinc-950 dark:border-zinc-700 font-bold text-zinc-800 dark:text-zinc-300 text-left">
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-center w-24 uppercase tracking-wider text-[10px]">DATE</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-center w-28 uppercase tracking-wider text-[10px]">OR/REF NO.</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 uppercase tracking-wider text-[10px]">RECEIVED FROM</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 uppercase tracking-wider text-[10px]">PARTICULARS</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right w-32 uppercase tracking-wider text-[10px]">DEBIT CASH</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right w-32 uppercase tracking-wider text-[10px]">DEBIT CWT</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right w-32 uppercase tracking-wider text-[10px]">CREDIT SALES</th>
                        <th className="px-3 py-2 text-right w-32 uppercase tracking-wider text-[10px]">CREDIT OUTPUT VAT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-950 dark:divide-zinc-700">
                      {booksData.cashReceipts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-zinc-400 font-sans italic border-b border-zinc-950">Walang cash receipts sa napiling panahon.</td>
                        </tr>
                      ) : (
                        booksData.cashReceipts.map((r, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/50 border-b border-zinc-950 dark:border-zinc-700">
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-center font-sans">{r.date}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-center font-mono font-bold text-zinc-500">{r.ref}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 font-sans font-bold text-zinc-900 dark:text-zinc-200">{r.payor}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 font-sans text-zinc-650 dark:text-zinc-400">{r.particulars}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{r.cashDebit > 0 ? formatCurrency(r.cashDebit) : '0.00'}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-right font-mono">{r.ewtDebit > 0 ? formatCurrency(r.ewtDebit) : '0.00'}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-right font-mono">{r.salesCredit > 0 ? formatCurrency(r.salesCredit) : '0.00'}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-blue-600 dark:text-blue-400">{r.vatCredit > 0 ? formatCurrency(r.vatCredit) : '0.00'}</td>
                          </tr>
                        ))
                      )}
                      {/* CRJ Total row matching page 5 */}
                      <tr className="font-black bg-zinc-50 dark:bg-zinc-950 border-t-2 border-zinc-950 dark:border-zinc-700">
                        <td colSpan={4} className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right uppercase tracking-wider text-[10px]">TOTAL</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right font-mono">{formatCurrency(booksData.cashReceipts.reduce((sum, r) => sum + r.cashDebit, 0))}</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right font-mono">{formatCurrency(booksData.cashReceipts.reduce((sum, r) => sum + r.ewtDebit, 0))}</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right font-mono">{formatCurrency(booksData.cashReceipts.reduce((sum, r) => sum + r.salesCredit, 0))}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(booksData.cashReceipts.reduce((sum, r) => sum + r.vatCredit, 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {selectedBook === 'CashDisbursements' && (
                  <table className="w-full border-collapse border-2 border-zinc-950 dark:border-zinc-700 text-xs font-mono">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-950/40 border-b-2 border-zinc-950 dark:border-zinc-700 font-bold text-zinc-800 dark:text-zinc-300 text-left">
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-center w-24 uppercase tracking-wider text-[10px]">DATE</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-center w-28 uppercase tracking-wider text-[10px]">VOUCHER/REF NO.</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 uppercase tracking-wider text-[10px]">PAID TO</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 uppercase tracking-wider text-[10px]">PARTICULARS</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right w-32 uppercase tracking-wider text-[10px]">DEBIT EXPENSE</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right w-32 uppercase tracking-wider text-[10px]">DEBIT INPUT VAT</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right w-32 uppercase tracking-wider text-[10px]">CREDIT CASH</th>
                        <th className="px-3 py-2 text-right w-32 uppercase tracking-wider text-[10px]">CREDIT EWT PAYABLE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-950 dark:divide-zinc-700">
                      {booksData.cashDisbursements.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-zinc-400 font-sans italic border-b border-zinc-950">Walang cash disbursements sa napiling panahon.</td>
                        </tr>
                      ) : (
                        booksData.cashDisbursements.map((r, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/50 border-b border-zinc-950 dark:border-zinc-700">
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-center font-sans">{r.date}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-center font-mono font-bold text-zinc-500">{r.ref}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 font-sans font-bold text-zinc-900 dark:text-zinc-200">{r.payee}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 font-sans text-zinc-650 dark:text-zinc-400">{r.particulars}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-right font-mono font-bold">{r.purchaseDebit > 0 ? formatCurrency(r.purchaseDebit) : '0.00'}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">{r.vatDebit > 0 ? formatCurrency(r.vatDebit) : '0.00'}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-1.5 text-right font-mono text-red-600 dark:text-red-400">{r.cashCredit > 0 ? formatCurrency(r.cashCredit) : '0.00'}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-zinc-600 dark:text-zinc-300">{r.ewtCredit > 0 ? formatCurrency(r.ewtCredit) : '0.00'}</td>
                          </tr>
                        ))
                      )}
                      {/* CDJ Total row matching page 6 */}
                      <tr className="font-black bg-zinc-50 dark:bg-zinc-950 border-t-2 border-zinc-950 dark:border-zinc-700">
                        <td colSpan={4} className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right uppercase tracking-wider text-[10px]">TOTAL</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right font-mono">{formatCurrency(booksData.cashDisbursements.reduce((sum, r) => sum + r.purchaseDebit, 0))}</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right font-mono">{formatCurrency(booksData.cashDisbursements.reduce((sum, r) => sum + r.vatDebit, 0))}</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-3 py-2 text-right font-mono">{formatCurrency(booksData.cashDisbursements.reduce((sum, r) => sum + r.cashCredit, 0))}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(booksData.cashDisbursements.reduce((sum, r) => sum + r.ewtCredit, 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {selectedBook === 'SalesJournal' && (
                  <table className="w-full border-collapse border-2 border-zinc-950 dark:border-zinc-700 text-[10px] font-mono">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-950/40 border-b-2 border-zinc-950 dark:border-zinc-700 font-bold text-zinc-800 dark:text-zinc-300 text-left">
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-center w-16 uppercase tracking-wider">DATE</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-center w-20 uppercase tracking-wider">INVOICE NO.</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 uppercase tracking-wider">CUSTOMER NAME</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-center w-24 uppercase tracking-wider">TIN</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 uppercase tracking-wider">ADDRESS</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 uppercase tracking-wider">PARTICULARS</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right w-24 uppercase tracking-wider">GROSS SALES</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right w-24 uppercase tracking-wider">VATABLE SALES</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right w-20 uppercase tracking-wider">OUTPUT VAT</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right w-20 uppercase tracking-wider">EXEMPT SALES</th>
                        <th className="px-2 py-2 text-right w-20 uppercase tracking-wider font-bold">ZERO RATED SALES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-950 dark:divide-zinc-700">
                      {booksData.salesJournal.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-zinc-400 font-sans italic border-b border-zinc-950">Walang record ng benta sa napiling panahon.</td>
                        </tr>
                      ) : (
                        booksData.salesJournal.map((r, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/50 border-b border-zinc-950 dark:border-zinc-700">
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-center font-sans">{r.date}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-center font-mono font-bold text-zinc-500">{r.ref}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 font-sans font-bold text-zinc-900 dark:text-zinc-200">{r.customer}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-center">{r.tin}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 font-sans text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]" title={r.address}>{r.address}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 font-sans text-zinc-650 dark:text-zinc-400 truncate max-w-[100px]" title={r.particulars}>{r.particulars}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-right font-mono font-bold">{formatCurrency(r.gross)}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-right font-mono">{r.taxable > 0 ? formatCurrency(r.taxable) : '0.00'}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-right font-mono text-blue-600 dark:text-blue-400">{r.vat > 0 ? formatCurrency(r.vat) : '0.00'}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-right font-mono text-zinc-500">{r.exempt > 0 ? formatCurrency(r.exempt) : '0.00'}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-zinc-500">{r.zeroRated > 0 ? formatCurrency(r.zeroRated) : '0.00'}</td>
                          </tr>
                        ))
                      )}
                      {/* SJ Total row matching page 3 */}
                      <tr className="font-black bg-zinc-50 dark:bg-zinc-950 border-t-2 border-zinc-950 dark:border-zinc-700">
                        <td colSpan={6} className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right uppercase tracking-wider text-[9px]">TOTAL</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right font-mono">{formatCurrency(booksData.salesJournal.reduce((sum, r) => sum + r.gross, 0))}</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right font-mono">{formatCurrency(booksData.salesJournal.reduce((sum, r) => sum + r.taxable, 0))}</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right font-mono">{formatCurrency(booksData.salesJournal.reduce((sum, r) => sum + r.vat, 0))}</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right font-mono">{formatCurrency(booksData.salesJournal.reduce((sum, r) => sum + r.exempt, 0))}</td>
                        <td className="px-2 py-2 text-right font-mono">{formatCurrency(booksData.salesJournal.reduce((sum, r) => sum + r.zeroRated, 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {selectedBook === 'PurchasesJournal' && (
                  <table className="w-full border-collapse border-2 border-zinc-950 dark:border-zinc-700 text-[10px] font-mono">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-950/40 border-b-2 border-zinc-950 dark:border-zinc-700 font-bold text-zinc-800 dark:text-zinc-300 text-left">
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-center w-16 uppercase tracking-wider">DATE</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-center w-20 uppercase tracking-wider">REFERENCE</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 uppercase tracking-wider">SUPPLIER NAME</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-center w-24 uppercase tracking-wider">TIN</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 uppercase tracking-wider">ADDRESS</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 uppercase tracking-wider font-bold">PARTICULARS</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right w-24 uppercase tracking-wider">GROSS PURCHASE</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right w-24 uppercase tracking-wider">VATABLE PURCHASE</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right w-20 uppercase tracking-wider">INPUT VAT</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right w-20 uppercase tracking-wider">EXEMPT PURCHASE</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right w-20 uppercase tracking-wider">ZERO RATED</th>
                        <th className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right w-16 uppercase tracking-wider">EWT</th>
                        <th className="px-2 py-2 text-left w-24 uppercase tracking-wider">EXPENSE CATEGORY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-950 dark:divide-zinc-700">
                      {booksData.purchasesJournal.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="py-8 text-center text-zinc-400 font-sans italic border-b border-zinc-950">Walang record ng pagbili sa napiling panahon.</td>
                        </tr>
                      ) : (
                        booksData.purchasesJournal.map((r, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/50 border-b border-zinc-950 dark:border-zinc-700">
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-center font-sans">{r.date}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-center font-mono font-bold text-zinc-500">{r.ref}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 font-sans font-bold text-zinc-900 dark:text-zinc-200">{r.vendor}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-center">{r.tin}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 font-sans text-zinc-600 dark:text-zinc-400 truncate max-w-[100px]" title={r.address}>{r.address}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 font-sans text-zinc-650 dark:text-zinc-400 truncate max-w-[100px]" title={r.particulars}>{r.particulars}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-right font-mono font-bold">{formatCurrency(r.gross)}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-right font-mono">{r.taxable > 0 ? formatCurrency(r.taxable) : '0.00'}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">{r.vat > 0 ? formatCurrency(r.vat) : '0.00'}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-right font-mono text-zinc-500">{r.exempt > 0 ? formatCurrency(r.exempt) : '0.00'}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-right font-mono text-zinc-500">{r.zeroRated > 0 ? formatCurrency(r.zeroRated) : '0.00'}</td>
                            <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-1.5 text-right font-mono text-red-600 dark:text-red-400">{r.ewt > 0 ? formatCurrency(r.ewt) : '0.00'}</td>
                            <td className="px-2 py-1.5 font-sans font-semibold text-zinc-600 dark:text-zinc-400 truncate max-w-[100px]" title={r.category}>{r.category}</td>
                          </tr>
                        ))
                      )}
                      {/* PJ Total row matching page 4 */}
                      <tr className="font-black bg-zinc-50 dark:bg-zinc-950 border-t-2 border-zinc-950 dark:border-zinc-700">
                        <td colSpan={6} className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right uppercase tracking-wider text-[9px]">TOTAL</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right font-mono">{formatCurrency(booksData.purchasesJournal.reduce((sum, r) => sum + r.gross, 0))}</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right font-mono">{formatCurrency(booksData.purchasesJournal.reduce((sum, r) => sum + r.taxable, 0))}</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right font-mono">{formatCurrency(booksData.purchasesJournal.reduce((sum, r) => sum + r.vat, 0))}</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right font-mono">{formatCurrency(booksData.purchasesJournal.reduce((sum, r) => sum + r.exempt, 0))}</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right font-mono">{formatCurrency(booksData.purchasesJournal.reduce((sum, r) => sum + r.zeroRated, 0))}</td>
                        <td className="border-r border-zinc-950 dark:border-zinc-700 px-2 py-2 text-right font-mono">{formatCurrency(booksData.purchasesJournal.reduce((sum, r) => sum + r.ewt, 0))}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              {/* Prepared/PTU/Page signature footer matching screenshots */}
              <div className="border-t-2 border-zinc-950 dark:border-zinc-750 pt-4 flex flex-col sm:flex-row justify-between items-center text-[10px] font-sans font-bold text-zinc-800 dark:text-zinc-200">
                <div>Prepared by: <span className="font-extrabold">{companyConfig.companyName}</span></div>
                <div>PTU: ________________</div>
                <div>Page ___ of ___</div>
              </div>

            </div>

          </motion.div>
        ) : (
          <motion.div
            key="relief"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            
            {/* RELIEF Control Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm text-left">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Select Quarter</label>
                <div className="relative">
                  <select
                    value={reliefQuarter}
                    onChange={(e) => setReliefQuarter(e.target.value as any)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold py-2.5 px-3 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  >
                    <option value="Q1">1st Quarter (Jan - Mar)</option>
                    <option value="Q2">2nd Quarter (Apr - Jun)</option>
                    <option value="Q3">3rd Quarter (Jul - Sep)</option>
                    <option value="Q4">4th Quarter (Oct - Dec)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Taxable Year</label>
                <div className="relative">
                  <select
                    value={reliefYear}
                    onChange={(e) => setReliefYear(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold py-2.5 px-3 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Transaction Scope</label>
                <div className="relative">
                  <select
                    value={reliefType}
                    onChange={(e) => setReliefType(e.target.value as any)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold py-2.5 px-3 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  >
                    <option value="Sales">Quarterly List of Sales (QLS)</option>
                    <option value="Purchases">Quarterly List of Purchases (QLP)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleDownloadReliefDat}
                  className="w-full bg-blue-400 hover:bg-blue-300 text-zinc-950 font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download BIR .DAT File</span>
                </button>
              </div>

            </div>

            {/* Preview of DAT format records */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden text-left">
              <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                    RELIEF .DAT File Compilation Preview
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Target Filename: <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{rawCompanyTin}{reliefType === 'Sales' ? 'S' : 'P'}{quarterEndDate[reliefQuarter].split('/')[0]}{reliefYear}.DAT</span>
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={reliefSearch}
                    onChange={(e) => setReliefSearch(e.target.value)}
                    placeholder="Maghanap gamit ang customer, supplier, o TIN..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs py-2 pl-9 pr-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* DAT preview table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-700 dark:text-zinc-300 text-left">
                      <th className="py-3 px-4 w-12">Rec</th>
                      <th className="py-3 px-4 w-32">Entity TIN</th>
                      <th className="py-3 px-4">Corporate / Registered Name</th>
                      <th className="py-3 px-4 text-right">Gross (PHP)</th>
                      <th className="py-3 px-4 text-right">Exempt (PHP)</th>
                      <th className="py-3 px-4 text-right">Zero-Rated</th>
                      <th className="py-3 px-4 text-right">Taxable Sales/Purch</th>
                      <th className="py-3 px-4 text-right">Output/Input VAT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
                    {filteredRelief.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-zinc-400 font-sans italic">
                          Walang kaukulang transactional records para sa kwarter na ito.
                        </td>
                      </tr>
                    ) : (
                      filteredRelief.map((r, index) => {
                        const gross = r2(parseNum(r.gross));
                        const vat = (r.taxType === 'Exempt' || r.taxType === 'Zero-Rated' || r.taxType === 'ZeroRated') ? 0 : r2(parseNum(r.vat));
                        const net = gross - vat;

                        const entityName = r.payor || 'General Client';
                        const entityTin = r.tin || '000-000-000-000';

                        let exempt = 0;
                        let zeroRated = 0;
                        let taxable = 0;

                        if (r.taxType === 'Exempt') exempt = gross;
                        else if (r.taxType === 'Zero-Rated' || r.taxType === 'ZeroRated') zeroRated = gross;
                        else taxable = net;

                        return (
                          <tr key={r.id} className="hover:bg-zinc-50/50">
                            <td className="py-2.5 px-4 text-zinc-400 text-[10px]">{index + 1}</td>
                            <td className="py-2.5 px-4 font-bold text-zinc-900 dark:text-white">{entityTin}</td>
                            <td className="py-2.5 px-4 font-sans font-semibold text-zinc-800 dark:text-zinc-200">{entityName}</td>
                            <td className="py-2.5 px-4 text-right">{formatCurrency(gross)}</td>
                            <td className="py-2.5 px-4 text-right text-zinc-500">{exempt > 0 ? formatCurrency(exempt) : ''}</td>
                            <td className="py-2.5 px-4 text-right text-zinc-500">{zeroRated > 0 ? formatCurrency(zeroRated) : ''}</td>
                            <td className="py-2.5 px-4 text-right">{formatCurrency(taxable)}</td>
                            <td className={`py-2.5 px-4 text-right font-bold ${reliefType === 'Sales' ? 'text-blue-600' : 'text-emerald-600'}`}>
                              {vat > 0 ? formatCurrency(vat) : ''}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
