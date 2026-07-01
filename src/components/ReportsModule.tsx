import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Calendar, ShieldCheck, Scale, AlertTriangle, CheckCircle } from 'lucide-react';
import { LedgerEntry } from '../types';
import { r2, displayMoney, inPeriod, parseNum, formatCurrency } from '../utils/helpers';

interface ReportsModuleProps {
  ledger: LedgerEntry[];
  yearFilter: string;
  monthFilter: string;
  quarterFilter: string;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  ledger,
  yearFilter,
  monthFilter,
  quarterFilter
}) => {
  const [activeReport, setActiveReport] = useState<'Tax' | 'ARAging' | 'APAging' | 'AnnualSummary'>('Tax');

  const activeRows = ledger.filter(r => r.status !== 'Void' && inPeriod(r, yearFilter, monthFilter, quarterFilter));

  // 1. VAT Calculations (2550Q/M)
  const vatableSales = activeRows
    .filter(r => r.type === 'Sales' && r.taxType === 'Vatable')
    .reduce((sum, r) => sum + r2(parseNum(r.taxable)), 0);
  const vatSalesOutput = activeRows
    .filter(r => r.type === 'Sales' && r.taxType === 'Vatable')
    .reduce((sum, r) => sum + r2(parseNum(r.vat)), 0);

  const exemptSales = activeRows
    .filter(r => r.type === 'Sales' && r.taxType === 'Exempt')
    .reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);
  const zeroRatedSales = activeRows
    .filter(r => r.type === 'Sales' && r.taxType === 'Zero-Rated')
    .reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);

  // Purchases Input VAT
  const vatablePurchases = activeRows
    .filter(r => r.type === 'Expense' && r.taxType === 'Vatable')
    .reduce((sum, r) => sum + r2(parseNum(r.taxable)), 0);
  const vatPurchasesInput = activeRows
    .filter(r => r.type === 'Expense' && r.taxType === 'Vatable')
    .reduce((sum, r) => sum + r2(parseNum(r.vat)), 0);

  const netVatPayable = r2(vatSalesOutput - vatPurchasesInput);

  // 2. Percentage Tax (2551Q) - 1% rate as of PH legislation changes
  const grossNonVatSales = activeRows
    .filter(r => r.type === 'Sales' && r.taxType === 'Non-VAT')
    .reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);
  const percentageTaxDue = r2(grossNonVatSales * 0.01);

  // 3. Accounts Receivable (AR) & Accounts Payable (AP) Aging Calculations
  // Group by payor
  const arAgingMap: Record<string, { company: string; current: number; d1_30: number; d31_60: number; d61_plus: number; total: number }> = {};
  const apAgingMap: Record<string, { company: string; current: number; d1_30: number; d31_60: number; d61_plus: number; total: number }> = {};

  activeRows.forEach(r => {
    const payor = String(r.payor || '').trim() || 'General Customer';
    const amount = r2(parseNum(r.gross));
    if (amount <= 0) return;

    // Simulate due date vs date
    const txDate = new Date(r.date);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - txDate.getTime()) / (1000 * 3600 * 24));

    if (r.type === 'Sales' && r.terms && r.terms !== 'COD' && r.terms !== 'Cash') {
      // Uncollected (Receivables)
      if (!arAgingMap[payor]) {
        arAgingMap[payor] = { company: payor, current: 0, d1_30: 0, d31_60: 0, d61_plus: 0, total: 0 };
      }
      const client = arAgingMap[payor];
      if (diffDays <= 0) client.current = r2(client.current + amount);
      else if (diffDays <= 30) client.d1_30 = r2(client.d1_30 + amount);
      else if (diffDays <= 60) client.d31_60 = r2(client.d31_60 + amount);
      else client.d61_plus = r2(client.d61_plus + amount);
      client.total = r2(client.total + amount);
    } else if (r.type === 'Expense' && r.terms && r.terms !== 'COD' && r.terms !== 'Cash') {
      // Unpaid (Payables)
      if (!apAgingMap[payor]) {
        apAgingMap[payor] = { company: payor, current: 0, d1_30: 0, d31_60: 0, d61_plus: 0, total: 0 };
      }
      const vendor = apAgingMap[payor];
      if (diffDays <= 0) vendor.current = r2(vendor.current + amount);
      else if (diffDays <= 30) vendor.d1_30 = r2(vendor.d1_30 + amount);
      else if (diffDays <= 60) vendor.d31_60 = r2(vendor.d31_60 + amount);
      else vendor.d61_plus = r2(vendor.d61_plus + amount);
      vendor.total = r2(vendor.total + amount);
    }
  });

  const arAgingList = Object.values(arAgingMap);
  const apAgingList = Object.values(apAgingMap);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-sans">📈 BIR Compliance & Aging Schedules</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Verify eBIRForms VAT liability, compile percentage tax schedules, and analyze AR/AP outstanding age distributions.</p>
        </div>
      </div>

      <div className="flex border-b border-zinc-100 dark:border-zinc-800">
        <button
          onClick={() => setActiveReport('Tax')}
          className={`px-5 py-3 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors ${
            activeReport === 'Tax'
              ? 'border-blue-400 text-blue-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          BIR Tax Returns (2550Q / 2551Q)
        </button>
        <button
          onClick={() => setActiveReport('ARAging')}
          className={`px-5 py-3 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors ${
            activeReport === 'ARAging'
              ? 'border-blue-400 text-blue-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          AR Aging Schedule
        </button>
        <button
          onClick={() => setActiveReport('APAging')}
          className={`px-5 py-3 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors ${
            activeReport === 'APAging'
              ? 'border-blue-400 text-blue-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          AP Aging Schedule
        </button>
        <button
          onClick={() => setActiveReport('AnnualSummary')}
          className={`px-5 py-3 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors ${
            activeReport === 'AnnualSummary'
              ? 'border-blue-400 text-blue-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          Annual Tax Summary
        </button>
      </div>

      {activeReport === 'Tax' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Output VAT</span>
                <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{displayMoney(vatSalesOutput)}</div>
                <div className="text-xs text-zinc-400 font-medium">12% VAT charged on sales</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Input VAT Credit</span>
                <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{displayMoney(vatPurchasesInput)}</div>
                <div className="text-xs text-zinc-400 font-medium">12% VAT paid on capital/expenses</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
                <Scale className="w-5 h-5" />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Net VAT Payable</span>
                <div className={`text-lg font-extrabold ${netVatPayable >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {displayMoney(netVatPayable)}
                </div>
                <div className="text-xs text-zinc-400 font-medium">{netVatPayable >= 0 ? 'Due for payment' : 'Input VAT excess credit'}</div>
              </div>
              <div className={`p-2.5 rounded-xl ${netVatPayable >= 0 ? 'bg-red-50 dark:bg-red-950/40 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
            <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">BIR Form 2550Q VAT Summary</h3>
              <div className="space-y-3 text-xs text-zinc-500">
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                  <span>Vatable Sales (Net of VAT):</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(vatableSales)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                  <span>Output VAT Due (12%):</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(vatSalesOutput)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                  <span>Exempt Sales:</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(exemptSales)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                  <span>Zero-Rated Sales:</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(zeroRatedSales)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                  <span>Vatable Purchases (Net of VAT):</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(vatablePurchases)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                  <span>Input VAT Credit (12%):</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(vatPurchasesInput)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-zinc-900 dark:text-white pt-2">
                  <span>Net Tax Payable / (Excess Credit):</span>
                  <span className="font-mono">₱ {formatCurrency(netVatPayable)}</span>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">BIR Form 2551Q Percentage Tax Summary</h3>
              <p className="text-xs text-zinc-500">Applicable to small merchants and non-VAT registered taxpayers with gross annual sales below ₱ 3,000,000.</p>
              <div className="space-y-3 text-xs text-zinc-500 pt-2">
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                  <span>Gross Non-VAT Sales:</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(grossNonVatSales)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                  <span>Percentage Tax Rate (PH Legislative rate):</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-300">1.0%</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-zinc-900 dark:text-white pt-2">
                  <span>Form 2551Q Tax Due:</span>
                  <span className="font-mono text-red-500">₱ {formatCurrency(percentageTaxDue)}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {activeReport === 'ARAging' && (
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 dark:border-zinc-800 p-5 text-left">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Accounts Receivable (AR) Aging Summary</h3>
            <p className="text-xs text-zinc-500 mt-1">Listing customer outstanding receivables categorized by the age of uncollected invoice periods.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="px-5 py-3">Customer Company</th>
                  <th className="px-5 py-3 text-right">Current</th>
                  <th className="px-5 py-3 text-right">1 - 30 Days</th>
                  <th className="px-5 py-3 text-right">31 - 60 Days</th>
                  <th className="px-5 py-3 text-right">61+ Days</th>
                  <th className="px-5 py-3 text-right">Total Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {arAgingList.length ? arAgingList.map(item => (
                  <tr key={item.company} className="hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5 font-bold text-zinc-800 dark:text-zinc-200">{item.company}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-zinc-500">{displayMoney(item.current)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-zinc-700 dark:text-zinc-300">{displayMoney(item.d1_30)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-blue-500">{displayMoney(item.d31_60)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-red-500">{displayMoney(item.d61_plus)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-extrabold text-zinc-900 dark:text-white">{displayMoney(item.total)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-zinc-400 italic">No credit terms sales recorded. Add sales invoices with credit terms to populate aging.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeReport === 'APAging' && (
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 dark:border-zinc-800 p-5 text-left">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Accounts Payable (AP) Aging Summary</h3>
            <p className="text-xs text-zinc-500 mt-1">Listing outstanding obligations to suppliers categorized by unpaid lapse periods.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="px-5 py-3">Supplier Name</th>
                  <th className="px-5 py-3 text-right">Current</th>
                  <th className="px-5 py-3 text-right">1 - 30 Days</th>
                  <th className="px-5 py-3 text-right">31 - 60 Days</th>
                  <th className="px-5 py-3 text-right">61+ Days</th>
                  <th className="px-5 py-3 text-right">Total Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {apAgingList.length ? apAgingList.map(item => (
                  <tr key={item.company} className="hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5 font-bold text-zinc-800 dark:text-zinc-200">{item.company}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-zinc-500">{displayMoney(item.current)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-zinc-700 dark:text-zinc-300">{displayMoney(item.d1_30)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-blue-500">{displayMoney(item.d31_60)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-red-500">{displayMoney(item.d61_plus)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-extrabold text-zinc-900 dark:text-white">{displayMoney(item.total)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-zinc-400 italic">No credit terms expenses/purchases recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeReport === 'AnnualSummary' && (() => {
        const annualRows = ledger.filter(r => r.status !== 'Void' && r.date.startsWith(yearFilter));
        const totalSales = annualRows.filter(r => r.type === 'Sales').reduce((a, b) => a + r2(parseNum(b.gross)), 0);
        const totalExpenses = annualRows.filter(r => r.type === 'Expense').reduce((a, b) => a + r2(parseNum(b.gross)), 0);
        const annualOutputVat = annualRows.filter(r => r.type === 'Sales').reduce((a, b) => a + r2(parseNum(b.vat)), 0);
        const annualInputVat = annualRows.filter(r => r.type === 'Expense').reduce((a, b) => a + r2(parseNum(b.vat)), 0);
        const annualNetVat = annualOutputVat - annualInputVat;
        const annualNetIncome = totalSales - totalExpenses;

        return (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Annual Sales (Gross)</span>
                <span className="text-2xl font-extrabold text-emerald-500">{displayMoney(totalSales)}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Annual Expenses (Gross)</span>
                <span className="text-2xl font-extrabold text-red-500">{displayMoney(totalExpenses)}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Net Income</span>
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">{displayMoney(annualNetIncome)}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Annual Output VAT</span>
                <span className="text-2xl font-extrabold text-blue-500">{displayMoney(annualOutputVat)}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Annual Input VAT</span>
                <span className="text-2xl font-extrabold text-amber-500">{displayMoney(annualInputVat)}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Annual Net VAT Payable</span>
                <span className="text-2xl font-extrabold text-purple-500">{displayMoney(annualNetVat)}</span>
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-sm text-zinc-600 dark:text-zinc-400">
              <p><strong>Note:</strong> This annual summary aggregates all transactions for the selected Fiscal Year ({yearFilter}), ignoring any active month or quarter filters. Use this view for a high-level tax planning overview and quick reference during year-end income tax return filing (e.g., BIR Form 1702Q / 1702-RT).</p>
            </div>
          </motion.div>
        );
      })()}
    </motion.div>
  );
};
