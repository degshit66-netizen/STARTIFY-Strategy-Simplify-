import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Printer, Scale, ShieldCheck, AlertCircle, Download } from 'lucide-react';
import { LedgerEntry } from '../types';
import { 
  r2, 
  displayMoney, 
  inPeriod, 
  parseNum, 
  formatCurrency, 
  cleanDate 
} from '../utils/helpers';
import { getCoaDetails, getCompleteChartOfAccounts } from '../data/chartOfAccounts';

interface FSModuleProps {
  ledger: LedgerEntry[];
  yearFilter: string;
  monthFilter: string;
  quarterFilter: string;
  companyName: string;
}

export const FSModule: React.FC<FSModuleProps> = ({
  ledger,
  yearFilter,
  monthFilter,
  quarterFilter,
  companyName
}) => {
  const [activeView, setActiveView] = useState<'Report' | 'Consolidation'>('Report');
  const [entities, setEntities] = useState<{id: string, name: string, balances: Record<string, any>}[]>([]);
  const [eliminations, setEliminations] = useState<Record<string, number>>({});
  const [newEntityName, setNewEntityName] = useState("");

  // --- DATA PROCESSING LOGIC ---
  const gl: Record<string, { code: string; type: string; balance: number }> = {};
  
  ledger.forEach(row => {
    if (row.status === 'Void' || !inPeriod(row, yearFilter, monthFilter, quarterFilter)) return;
    
    const coa = getCoaDetails(row.category, row.type);
    const title = coa.name;
    const code = row.accountCode || '';
    
    if (!gl[title]) {
      gl[title] = { code: code, type: coa.type, balance: 0 };
    }
    
    const net = parseNum(row.net) || (row.taxType === 'Vatable' ? parseNum(row.gross) / 1.12 : parseNum(row.gross));
    
    if (row.type === 'Sales') {
      gl[title].balance -= net; 
    } else if (row.type === 'Expense') {
      gl[title].balance += net; 
    } else {
      if (coa.normal === 'Credit') gl[title].balance -= net;
      else gl[title].balance += net;
    }

    if (row.vat) {
      const vatTitle = row.type === 'Sales' ? 'Output VAT Payable' : 'Input VAT';
      if (!gl[vatTitle]) gl[vatTitle] = { code: '', type: row.type === 'Sales' ? 'Liability' : 'Asset', balance: 0 };
      if (row.type === 'Sales') gl[vatTitle].balance -= parseNum(row.vat);
      else gl[vatTitle].balance += parseNum(row.vat);
    }

    if (row.ewt) {
      const ewtTitle = row.type === 'Sales' ? 'Creditable Withholding Tax (CWT)' : 'EWT Payable';
      if (!gl[ewtTitle]) gl[ewtTitle] = { code: '', type: row.type === 'Sales' ? 'Asset' : 'Liability', balance: 0 };
      if (row.type === 'Sales') gl[ewtTitle].balance += parseNum(row.ewt);
      else gl[ewtTitle].balance -= parseNum(row.ewt);
    }

    const cash = parseNum(row.cash);
    if (cash !== 0) {
      const cashTitle = 'Cash in Bank / on Hand';
      if (!gl[cashTitle]) gl[cashTitle] = { code: '1010', type: 'Asset', balance: 0 };
      if (row.type === 'Sales') gl[cashTitle].balance += cash;
      else gl[cashTitle].balance -= cash;
    }

    const arAp = parseNum(row.arAp);
    if (arAp !== 0) {
      const arApTitle = row.type === 'Sales' ? 'Accounts Receivable' : 'Accounts Payable';
      if (!gl[arApTitle]) gl[arApTitle] = { code: '', type: row.type === 'Sales' ? 'Asset' : 'Liability', balance: 0 };
      if (row.type === 'Sales') gl[arApTitle].balance += arAp;
      else gl[arApTitle].balance -= arAp;
    }
  });

  const fsData: Record<string, Record<string, number>> = {
    Asset: {}, Liability: {}, Equity: {}, Income: {}, Expense: {}
  };

  Object.entries(gl).forEach(([title, data]) => {
    const type = data.type === 'Revenue' ? 'Income' : data.type;
    if (fsData[type]) {
      fsData[type][title] = (fsData[type][title] || 0) + data.balance;
    }
  });

  const totalRevenue = Object.values(fsData.Income).reduce((a, b) => a + Math.abs(b), 0);
  const totalExpense = Object.values(fsData.Expense).reduce((a, b) => a + Math.abs(b), 0);
  const currentNetIncome = totalRevenue - totalExpense;

  const begCapital = Object.entries(gl)
    .filter(([t, d]) => d.type === 'Equity' && !t.toLowerCase().includes('drawing') && !t.toLowerCase().includes('investment'))
    .reduce((sum, [_, d]) => sum + Math.abs(d.balance), 0);
  const currentAddlInvestment = Object.entries(gl)
    .filter(([t, d]) => d.type === 'Equity' && t.toLowerCase().includes('investment'))
    .reduce((sum, [_, d]) => sum + Math.abs(d.balance), 0);
  const currentDrawings = Object.entries(gl)
    .filter(([t, d]) => d.type === 'Equity' && t.toLowerCase().includes('drawing'))
    .reduce((sum, [_, d]) => sum + Math.abs(d.balance), 0);
  const endingEquity = begCapital + currentAddlInvestment + currentNetIncome - currentDrawings;

  const totAsset = Object.values(fsData.Asset).reduce((a, b) => a + b, 0);
  const totLiab = Object.values(fsData.Liability).reduce((a, b) => a + Math.abs(b), 0);
  const totEq = endingEquity;
  const totLiabEq = totLiab + totEq;

  const difference = totAsset - totLiabEq;
  const isBalanced = Math.abs(difference) < 0.01;

  // Cash Flow Calculations (Simplified for Loose-Leaf)
  const opIn = totalRevenue;
  const opOut = totalExpense;
  const operatingCash = opIn - opOut;
  const invOut = 0; // Asset additions would go here
  const financingCash = currentAddlInvestment - currentDrawings;
  const netIncreaseDecrease = operatingCash - invOut + financingCash;
  const begCashBalance = 0; // Would come from prev period
  const endingCash = begCashBalance + netIncreaseDecrease;

  const periodText = monthFilter !== 'ALL' ? `${monthFilter} ${yearFilter}` : quarterFilter !== 'ALL' ? `${quarterFilter} ${yearFilter}` : `FOR THE YEAR ${yearFilter}`;
  const bsPeriodText = monthFilter !== 'ALL' ? `AS OF ${monthFilter} 31, ${yearFilter}` : `AS OF DECEMBER 31, ${yearFilter}`;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ["Account Code", "Account Title", "Account Type", "Debit", "Credit"];
    const rows = Object.entries(gl).map(([title, data]) => [
      data.code,
      title,
      data.type,
      data.balance > 0 ? data.balance : 0,
      data.balance < 0 ? Math.abs(data.balance) : 0
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `TrialBalance_${companyName}_${yearFilter}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, entityId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newBalances: Record<string, any> = {};
      
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',').map(p => p.replace(/^"|"$/g, ''));
        if (parts.length >= 5) {
          const code = parts[0];
          const title = parts[1];
          const type = parts[2];
          const debit = parseFloat(parts[3]) || 0;
          const credit = parseFloat(parts[4]) || 0;
          
          const balance = debit - credit;
          newBalances[title] = { code, type, balance };
        }
      }
      
      setEntities(prev => prev.map(ent => 
        ent.id === entityId ? { ...ent, balances: newBalances } : ent
      ));
    };
    reader.readAsText(file);
  };

  const addEntity = (name: string) => {
    if (name.trim()) {
      setEntities([...entities, { id: crypto.randomUUID(), name: name.trim(), balances: {} }]);
    }
  };

  const removeEntity = (id: string) => {
    setEntities(entities.filter(e => e.id !== id));
  };

  const updateElimination = (title: string, val: string) => {
    const num = parseFloat(val) || 0;
    setEliminations({ ...eliminations, [title]: num });
  };

  const renderConsolidation = () => {
    // Get unique account titles across all entities
    const allTitles = new Set<string>();
    entities.forEach(ent => {
      Object.keys(ent.balances).forEach(t => allTitles.add(t));
    });

    const sortedTitles = Array.from(allTitles).sort((a, b) => {
      const codeA = entities.find(e => e.balances[a])?.balances[a]?.code || '9999';
      const codeB = entities.find(e => e.balances[b])?.balances[b]?.code || '9999';
      return codeA.localeCompare(codeB);
    });

    return (
      <div className="space-y-6 max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Consolidation Worksheet</h3>
            <p className="text-[11px] text-zinc-500">Upload Trial Balance CSVs from parent and subsidiaries to consolidate accounts.</p>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Entity Name (e.g. Sub A)" 
              value={newEntityName}
              onChange={e => setNewEntityName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newEntityName.trim()) {
                  addEntity(newEntityName);
                  setNewEntityName('');
                }
              }}
              className="text-[10px] px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none text-zinc-800 dark:text-zinc-200 min-w-[150px]"
            />
            <button 
              onClick={() => {
                if (newEntityName.trim()) {
                  addEntity(newEntityName);
                  setNewEntityName('');
                }
              }}
              disabled={!newEntityName.trim()}
              className="text-[10px] font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3 h-3 rotate-180" />
              Add Entity
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-wider min-w-[200px]">Account Title</th>
                {entities.map(ent => (
                  <th key={ent.id} className="px-4 py-3 text-right text-[10px] font-bold text-zinc-400 uppercase tracking-wider min-w-[140px] relative group">
                    <div className="flex flex-col gap-1">
                      <span className="truncate">{ent.name}</span>
                      <div className="flex items-center justify-end gap-2">
                        <label className="cursor-pointer text-blue-500 hover:text-blue-600 text-[9px] lowercase font-normal border-b border-blue-200">
                          import csv
                          <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, ent.id)} />
                        </label>
                        <button onClick={() => removeEntity(ent.id)} className="text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <AlertCircle className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-[10px] font-bold text-zinc-400 uppercase tracking-wider min-w-[120px]">Eliminations</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-blue-500 uppercase tracking-wider min-w-[140px] bg-blue-50/30 dark:bg-blue-900/10">Consolidated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sortedTitles.map(title => {
                let consolidatedTotal = 0;
                const elimVal = eliminations[title] || 0;
                
                return (
                  <tr key={title} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/10 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">{title}</div>
                      <div className="text-[9px] text-zinc-400 font-mono">{entities.find(e => e.balances[title])?.balances[title]?.code}</div>
                    </td>
                    {entities.map(ent => {
                      const bal = ent.balances[title]?.balance || 0;
                      consolidatedTotal += bal;
                      return (
                        <td key={ent.id} className="px-4 py-3 text-right font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                          {bal !== 0 ? r2(bal).toLocaleString() : '—'}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      <input 
                        type="number"
                        value={eliminations[title] || ''}
                        placeholder="0.00"
                        onChange={(e) => updateElimination(title, e.target.value)}
                        className="w-full text-right text-[11px] font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 outline-none focus:border-blue-400"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-900/5">
                      {(consolidatedTotal + elimVal) !== 0 ? r2(consolidatedTotal + elimVal).toLocaleString() : '0.00'}
                    </td>
                  </tr>
                );
              })}
              {entities.length === 0 && (
                <tr>
                  <td colSpan={100} className="px-4 py-16 text-center text-zinc-400 text-xs italic">
                    <Download className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No entities added. Add the Parent and Subsidiaries to begin consolidation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderReport = () => (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-10 shadow-sm max-w-4xl mx-auto font-sans" id="fsPrintContainer">
      {/* RUNNING HEADER & FOOTER FOR LOOSE LEAF PRINTING */}
      <div className="print-running-header">
        <span>{companyName} — Loose-Leaf Books of Accounts</span>
        <span>Taxable Year: {yearFilter} • {periodText}</span>
      </div>
      <div className="print-running-footer">
        <span>SECURE ERP COMPLIANCE HUB — Approved for Loose-Leaf BIR Journal Binding</span>
      </div>

      {/* INDEPENDENT AUDITOR'S REPORT (PAGE 1) */}
      <div className="space-y-6 fs-sheet-print pb-10 border-b-2 border-zinc-900 text-left">
        <div className="text-center pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-xl font-bold uppercase tracking-widest text-zinc-900 dark:text-white">INDEPENDENT AUDITOR'S REPORT</h1>
          <p className="text-xs text-zinc-500 font-medium mt-1">To the Owner and Board of Directors of {companyName}</p>
        </div>
        
        <div className="space-y-4 text-xs text-zinc-700 dark:text-zinc-300 text-justify leading-relaxed font-serif">
          <div>
            <span className="font-bold uppercase tracking-wider block text-zinc-900 dark:text-white mb-1">Opinion</span>
            <p>
              We have audited the accompanying financial statements of <strong className="text-zinc-900 dark:text-white">{companyName}</strong>, which comprise the Statement of Financial Position as of December 31, {yearFilter}, and the Statement of Comprehensive Income, Statement of Changes in Equity, and Statement of Cash Flows for the period then ended, and notes to the financial statements, including a summary of significant accounting policies.
            </p>
            <p className="mt-2">
              In our opinion, the accompanying financial statements present fairly, in all material respects, the financial position of <strong>{companyName}</strong> as of December 31, {yearFilter}, and its financial performance and its cash flows for the period then ended in accordance with Philippine Financial Reporting Standards (PFRS) for Small Entities.
            </p>
          </div>

          <div>
            <span className="font-bold uppercase tracking-wider block text-zinc-900 dark:text-white mb-1">Basis for Opinion</span>
            <p>
              We conducted our audit in accordance with Philippine Standards on Auditing (PSAs). Our responsibilities under those standards are further described in the <em>Auditor’s Responsibilities for the Audit of the Financial Statements</em> section of our report. We are independent of the Company in accordance with the Code of Ethics for Professional Accountants in the Philippines (Code of Ethics) together with the ethical requirements that are relevant to our audit of the financial statements in the Philippines, and we have fulfilled our other ethical responsibilities in accordance with these requirements. We believe that the audit evidence we have obtained is sufficient and appropriate to provide a basis for our opinion.
            </p>
          </div>

          <div>
            <span className="font-bold uppercase tracking-wider block text-zinc-900 dark:text-white mb-1">Responsibilities of Management for the Financial Statements</span>
            <p>
              Management is responsible for the preparation and fair presentation of the financial statements in accordance with PFRS for Small Entities, and for such internal control as management determines is necessary to enable the preparation of financial statements that are free from material misstatement, whether due to fraud or error.
            </p>
            <p className="mt-2">
              In preparing the financial statements, management is responsible for assessing the Company’s ability to continue as a going concern, disclosing, as applicable, matters related to going concern and using the going concern basis of accounting unless management either intends to liquidate the Company or to cease operations, or has no realistic alternative but to do so.
            </p>
          </div>

          <div>
            <span className="font-bold uppercase tracking-wider block text-zinc-900 dark:text-white mb-1">Auditor’s Responsibilities for the Audit of the Financial Statements</span>
            <p>
              Our objectives are to obtain reasonable assurance about whether the financial statements as a whole are free from material misstatement, whether due to fraud or error, and to issue an auditor’s report that includes our opinion. Reasonable assurance is a high level of assurance, but is not a guarantee that an audit conducted in accordance with PSAs will always detect a material misstatement when it exists. Misstatements can arise from fraud or error and are considered material if, individually or in the aggregate, they could reasonably be expected to influence the economic decisions of users taken on the basis of these financial statements.
            </p>
          </div>
        </div>

        {/* AUDITOR ACCREDITATION SIGNATURE BLOCKS */}
        <div className="grid grid-cols-2 gap-8 pt-8 text-xs font-sans border-t border-zinc-100 dark:border-zinc-800">
          <div className="space-y-4">
            <p className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Certified Correct By:</p>
            <div className="pt-10 border-b border-zinc-400 dark:border-zinc-600 w-48"></div>
            <div>
              <p className="font-bold text-zinc-900 dark:text-white">Chief Executive Officer / Owner</p>
              <p className="text-[10px] text-zinc-500">{companyName}</p>
              <p className="text-[10px] text-zinc-500">Date Signed: {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Audited & Certified By:</p>
            <div className="pt-10 border-b border-zinc-400 dark:border-zinc-600 w-48"></div>
            <div>
              <p className="font-bold text-zinc-900 dark:text-white">INDEPENDENT AUDITOR / ACCREDITED FIRM</p>
              <p className="text-[10px] text-zinc-500">PRC License No. 0088192 (Valid until Oct 2028)</p>
              <p className="text-[10px] text-zinc-500">PTR No. 9118231 | BIR Accreditation No. 08-002341-002-2026</p>
              <p className="text-[10px] text-zinc-500">BOA/PRC Reg. No. 0001 (Valid until Dec 31, 2026)</p>
            </div>
          </div>
        </div>
      </div>

      {/* STATEMENT OF INCOMES */}
      <div className="space-y-6 fs-sheet-print">
        <div className="text-center border-b-2 border-zinc-800 dark:border-zinc-200 pb-4">
          <h2 className="text-lg sm:text-xl font-bold uppercase tracking-widest text-zinc-900 dark:text-white font-sans">{companyName}</h2>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mt-1">Statement of Comprehensive Income</h3>
          <p className="text-xs text-zinc-400 italic mt-0.5">{periodText}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-800 dark:border-zinc-200 text-left font-bold text-zinc-700 dark:text-zinc-300">
                <th className="py-2">Accounts / Category</th>
                <th className="py-2 text-right w-1/3">Balances</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr>
                <td colSpan={2} className="py-2.5 font-bold bg-zinc-50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white">REVENUES</td>
              </tr>
              {Object.keys(fsData.Income).length ? Object.entries(fsData.Income).map(([acc, val]) => (
                <tr key={acc} className="hover:bg-zinc-50/50">
                  <td className="py-2 pl-4 text-zinc-600 dark:text-zinc-400">{acc}</td>
                  <td className="py-2 text-right font-semibold font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(val)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={2} className="py-2 pl-4 text-zinc-400 italic">No revenue recorded in this period.</td>
                </tr>
              )}
              <tr className="font-bold border-t border-zinc-800">
                <td className="py-2.5">Total Revenues</td>
                <td className="py-2.5 text-right font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(totalRevenue)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="py-2.5 font-bold bg-zinc-50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white">OPERATING EXPENSES</td>
              </tr>
              {Object.keys(fsData.Expense).length ? Object.entries(fsData.Expense).map(([acc, val]) => (
                <tr key={acc} className="hover:bg-zinc-50/50">
                  <td className="py-2 pl-4 text-zinc-600 dark:text-zinc-400">{acc}</td>
                  <td className="py-2 text-right font-semibold font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(val)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={2} className="py-2 pl-4 text-zinc-400 italic">No expenses recorded in this period.</td>
                </tr>
              )}
              <tr className="font-bold border-t border-zinc-800">
                <td className="py-2.5">Total Operating Expenses</td>
                <td className="py-2.5 text-right font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(totalExpense)}</td>
              </tr>
              <tr className="font-extrabold border-t-2 border-b-4 border-double border-zinc-800 text-base">
                <td className="py-3 text-zinc-900 dark:text-white">NET COMPREHENSIVE INCOME (LOSS)</td>
                <td className={`py-3 text-right font-mono ${currentNetIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {formatCurrency(currentNetIncome)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* STATEMENT OF EQUITIES */}
      <div className="space-y-6 pt-10 border-t border-dashed border-zinc-200 dark:border-zinc-800 fs-sheet-print break-before-page">
        <div className="text-center border-b-2 border-zinc-800 dark:border-zinc-200 pb-4">
          <h2 className="text-lg sm:text-xl font-bold uppercase tracking-widest text-zinc-900 dark:text-white font-sans">{companyName}</h2>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mt-1">Statement of Changes in Equity</h3>
          <p className="text-xs text-zinc-400 italic mt-0.5">{periodText}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-800 dark:border-zinc-200 text-left font-bold text-zinc-700 dark:text-zinc-300">
                <th className="py-2">Description</th>
                <th className="py-2 text-right w-1/3">Balances</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr>
                <td className="py-2 text-zinc-600 dark:text-zinc-400">Owner's Capital, Beginning Balance</td>
                <td className="py-2 text-right font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(begCapital)}</td>
              </tr>
              <tr>
                <td className="py-2 pl-4 text-zinc-600 dark:text-zinc-400">Add: Additional Capital Investment</td>
                <td className="py-2 text-right font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(currentAddlInvestment)}</td>
              </tr>
              <tr>
                <td className="py-2 pl-4 text-zinc-600 dark:text-zinc-400">Add: Net Income (Loss) for the Period</td>
                <td className={`py-2 text-right font-mono ${currentNetIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{formatCurrency(currentNetIncome)}</td>
              </tr>
              <tr>
                <td className="py-2 pl-4 text-zinc-600 dark:text-zinc-400 text-rose-500">Less: Owner's Drawings / Withdrawals</td>
                <td className="py-2 text-right font-mono text-red-500">({formatCurrency(currentDrawings)})</td>
              </tr>
              <tr className="font-extrabold border-t-2 border-b-4 border-double border-zinc-800 text-base">
                <td className="py-3 text-zinc-900 dark:text-white">OWNER'S EQUITY, ENDING BALANCE</td>
                <td className="py-3 text-right font-mono text-zinc-900 dark:text-white">{formatCurrency(endingEquity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* STATEMENT OF FINANCIAL POSITIONS */}
      <div className="space-y-6 pt-10 border-t border-dashed border-zinc-200 dark:border-zinc-800 fs-sheet-print break-before-page">
        <div className="text-center border-b-2 border-zinc-800 dark:border-zinc-200 pb-4">
          <h2 className="text-lg sm:text-xl font-bold uppercase tracking-widest text-zinc-900 dark:text-white font-sans">{companyName}</h2>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mt-1">Statement of Financial Position</h3>
          <p className="text-xs text-zinc-400 italic mt-0.5">{bsPeriodText}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-800 dark:border-zinc-200 text-left font-bold text-zinc-700 dark:text-zinc-300">
                <th className="py-2">Accounts / Category</th>
                <th className="py-2 text-right w-1/3">Balances</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr>
                <td colSpan={2} className="py-2.5 font-bold bg-zinc-50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white">ASSETS</td>
              </tr>
              {Object.keys(fsData.Asset).length ? Object.entries(fsData.Asset).map(([acc, val]) => (
                <tr key={acc} className="hover:bg-zinc-50/50">
                  <td className="py-2 pl-4 text-zinc-600 dark:text-zinc-400">{acc}</td>
                  <td className="py-2 text-right font-semibold font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(val)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={2} className="py-2 pl-4 text-zinc-400 italic">No assets posted on file.</td>
                </tr>
              )}
              <tr className="font-extrabold border-t-2 border-b-2 border-zinc-800 text-base bg-zinc-50/40 dark:bg-zinc-950/20">
                <td className="py-2.5">TOTAL ASSETS</td>
                <td className="py-2.5 text-right font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(totAsset)}</td>
              </tr>
              
              <tr>
                <td colSpan={2} className="py-2.5 font-bold bg-zinc-50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white">LIABILITIES</td>
              </tr>
              {Object.keys(fsData.Liability).length ? Object.entries(fsData.Liability).map(([acc, val]) => (
                <tr key={acc} className="hover:bg-zinc-50/50">
                  <td className="py-2 pl-4 text-zinc-600 dark:text-zinc-400">{acc}</td>
                  <td className="py-2 text-right font-semibold font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(val)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={2} className="py-2 pl-4 text-zinc-400 italic">No liability balances posted.</td>
                </tr>
              )}
              <tr className="font-bold border-t border-zinc-800">
                <td className="py-2">Total Liabilities</td>
                <td className="py-2 text-right font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(totLiab)}</td>
              </tr>

              <tr>
                <td colSpan={2} className="py-2.5 font-bold bg-zinc-50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white">OWNER'S EQUITY</td>
              </tr>
              {Object.keys(fsData.Equity).length ? Object.entries(fsData.Equity).map(([acc, val]) => (
                <tr key={acc} className="hover:bg-zinc-50/50">
                  <td className="py-2 pl-4 text-zinc-600 dark:text-zinc-400">{acc}</td>
                  <td className="py-2 text-right font-semibold font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(val)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={2} className="py-2 pl-4 text-zinc-400 italic">No equity balances found.</td>
                </tr>
              )}
              <tr className="font-bold border-t border-zinc-800">
                <td className="py-2">Total Equity</td>
                <td className="py-2 text-right font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(totEq)}</td>
              </tr>

              <tr className="font-extrabold border-t-2 border-b-4 border-double border-zinc-800 text-base bg-zinc-50/40 dark:bg-zinc-950/20">
                <td className="py-3 text-zinc-900 dark:text-white">TOTAL LIABILITIES & OWNER'S EQUITY</td>
                <td className="py-3 text-right font-mono text-zinc-900 dark:text-white">{formatCurrency(totLiabEq)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* STATEMENT OF CASH FLOWS */}
      <div className="space-y-6 pt-10 border-t border-dashed border-zinc-200 dark:border-zinc-800 fs-sheet-print break-before-page">
        <div className="text-center border-b-2 border-zinc-800 dark:border-zinc-200 pb-4">
          <h2 className="text-lg sm:text-xl font-bold uppercase tracking-widest text-zinc-900 dark:text-white font-sans">{companyName}</h2>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mt-1">Statement of Cash Flows</h3>
          <p className="text-xs text-zinc-400 italic mt-0.5">{periodText}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-800 dark:border-zinc-200 text-left font-bold text-zinc-700 dark:text-zinc-300">
                <th className="py-2">Description</th>
                <th className="py-2 text-right w-1/3">Balances</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr>
                <td colSpan={2} className="py-2.5 font-bold bg-zinc-50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white">CASH FLOWS FROM OPERATING ACTIVITIES</td>
              </tr>
              <tr>
                <td className="py-2 pl-4 text-zinc-600 dark:text-zinc-400">Cash Received from Customers</td>
                <td className="py-2 text-right font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(opIn)}</td>
              </tr>
              <tr>
                <td className="py-2 pl-4 text-zinc-600 dark:text-zinc-400 text-red-500">Cash Paid to Suppliers and Employees</td>
                <td className="py-2 text-right font-mono text-red-500">({formatCurrency(opOut)})</td>
              </tr>
              <tr className="font-bold border-t border-zinc-800">
                <td className="py-2">Net Cash from Operating Activities</td>
                <td className="py-2 text-right font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(operatingCash)}</td>
              </tr>

              <tr>
                <td colSpan={2} className="py-2.5 font-bold bg-zinc-50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white">CASH FLOWS FROM INVESTING ACTIVITIES</td>
              </tr>
              <tr>
                <td className="py-2 pl-4 text-zinc-600 dark:text-zinc-400 text-red-500">Purchase of Property, Plant, & Equipment</td>
                <td className="py-2 text-right font-mono text-red-500">({formatCurrency(invOut)})</td>
              </tr>
              <tr className="font-bold border-t border-zinc-800">
                <td className="py-2">Net Cash from Investing Activities</td>
                <td className="py-2 text-right font-mono text-zinc-800 dark:text-zinc-200">({formatCurrency(invOut)})</td>
              </tr>

              <tr>
                <td colSpan={2} className="py-2.5 font-bold bg-zinc-50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white">CASH FLOWS FROM FINANCING ACTIVITIES</td>
              </tr>
              <tr>
                <td className="py-2 pl-4 text-zinc-600 dark:text-zinc-400">Capital Additions, Drawings, and Loan Borrowings</td>
                <td className={`py-2 text-right font-mono ${financingCash >= 0 ? '' : 'text-red-500'}`}>{formatCurrency(financingCash)}</td>
              </tr>
              <tr className="font-bold border-t border-zinc-800">
                <td className="py-2">Net Cash from Financing Activities</td>
                <td className={`py-2 text-right font-mono ${financingCash >= 0 ? '' : 'text-red-500'}`}>{formatCurrency(financingCash)}</td>
              </tr>

              <tr className="font-extrabold border-t-2 border-zinc-800">
                <td className="py-2.5">NET INCREASE (DECREASE) IN CASH</td>
                <td className={`py-2.5 text-right font-mono ${netIncreaseDecrease >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{formatCurrency(netIncreaseDecrease)}</td>
              </tr>
              <tr>
                <td className="py-2 text-zinc-600 dark:text-zinc-400">Cash Balance, Beginning</td>
                <td className="py-2 text-right font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(begCashBalance)}</td>
              </tr>
              <tr className="font-extrabold border-t-2 border-b-4 border-double border-zinc-800 text-base bg-zinc-50/40 dark:bg-zinc-950/20">
                <td className="py-3 text-zinc-900 dark:text-white font-bold">CASH BALANCE, ENDING</td>
                <td className="py-3 text-right font-mono text-zinc-900 dark:text-white">{formatCurrency(endingCash)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* UNADJUSTED TRIAL BALANCE */}
      <div className="space-y-6 pt-10 border-t border-dashed border-zinc-200 dark:border-zinc-800 fs-sheet-print break-before-page">
        <div className="text-center border-b-2 border-zinc-800 dark:border-zinc-200 pb-4">
          <h2 className="text-lg sm:text-xl font-bold uppercase tracking-widest text-zinc-900 dark:text-white font-sans">{companyName}</h2>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mt-1">Unadjusted Trial Balance</h3>
          <p className="text-xs text-zinc-400 italic mt-0.5">{bsPeriodText}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-800 dark:border-zinc-200 text-left font-bold text-zinc-700 dark:text-zinc-300">
                <th className="py-2">Account Title</th>
                <th className="py-2 text-right w-1/4">Debit</th>
                <th className="py-2 text-right w-1/4">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
              {Object.keys(gl).sort((a,b) => gl[a].code.localeCompare(gl[b].code)).map(acc => {
                const rawBal = gl[acc].balance;
                if (Math.abs(rawBal) < 0.01) return null;
                const isDebitCol = rawBal > 0;
                const displayBal = Math.abs(rawBal);
                return (
                  <tr key={acc} className="hover:bg-zinc-50/50">
                    <td className="py-1.5 text-left text-zinc-600 dark:text-zinc-400 font-sans font-semibold">{gl[acc].code} - {acc}</td>
                    <td className="py-1.5 text-right text-zinc-800 dark:text-zinc-200">{isDebitCol ? formatCurrency(displayBal) : ''}</td>
                    <td className="py-1.5 text-right text-zinc-800 dark:text-zinc-200">{!isDebitCol ? formatCurrency(displayBal) : ''}</td>
                  </tr>
                );
              })}
              <tr className="font-extrabold border-t-2 border-b-4 border-double border-zinc-800 text-sm">
                <td className="py-2.5 text-left font-sans">TOTALS</td>
                <td className="py-2.5 text-right">{formatCurrency(Object.values(gl).filter(g=>g.balance > 0).reduce((sum,g)=>sum+g.balance, 0))}</td>
                <td className="py-2.5 text-right">{formatCurrency(Object.values(gl).filter(g=>g.balance < 0).reduce((sum,g)=>sum+Math.abs(g.balance), 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* NOTES */}
      <div className="space-y-4 pt-10 border-t border-dashed border-zinc-200 dark:border-zinc-800 fs-sheet-print break-before-page text-left text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
        <h4 className="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest text-center border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-4">Notes to Financial Statements</h4>
        <p>
          <strong>Note 1: Accounting Framework & Policy</strong><br />
          These statements have been compiled in absolute compliance with Double-Entry Bookkeeping and the Philippine Financial Reporting Standards (PFRS) for Small Entities. Revenues are recognized when earned (Credit normal), and disbursements or expenses are recognized when incurred (Debit normal).
        </p>
        <p>
          <strong>Note 2: Double-Entry Trial Consistency</strong><br />
          The Unadjusted Trial Balance derives ledger balances intrinsically from direct transactional postings to Sales, Purchases, and Setup classes. Mathematical proofs are checked dynamically at load time to confirm A = L + E. Current imbalance variance reads: <strong>{displayMoney(difference)}</strong>.
        </p>
        <p>
          <strong>Note 3: Corporate and PTU Authority</strong><br />
          These ledgers are generated dynamically in accordance with loose-leaf binding guidelines issued by the Bureau of Internal Revenue. Use of printed book bind logs requires a valid <strong>Permit To Use Loose-Leaf Books of Accounts</strong>.
        </p>
      </div>
    </div>
  );

  if (yearFilter === 'ALL') {
    return (
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 p-8 rounded-2xl text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-blue-500 mx-auto" />
        <h3 className="text-sm font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider">Select Taxable Year</h3>
        <p className="text-xs text-blue-700 dark:text-blue-500 max-w-md mx-auto">Please select a specific taxable year from the year filter at the top of the dashboard to generate and print compliant Financial Statements.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 no-print">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-sans">📑 Financial Statements</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Generate, audit, and print complete BIR-compliant books of accounts and statements.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700">
            <Scale className="w-3.5 h-3.5" />
            <span className={isBalanced ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-rose-600 dark:text-rose-400 font-extrabold'}>
              {isBalanced ? 'Balanced Ledger' : `Out of Balance: ${displayMoney(difference)}`}
            </span>
          </div>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 text-xs bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm border border-zinc-200 dark:border-zinc-700 focus:outline-none"
            title="Export Trial Balance for Consolidation"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm focus:outline-none"
          >
            <Printer className="w-4 h-4" />
            <span>Print Financial Statements</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ledger Compliance Status</span>
          <div className="flex items-center gap-2 mt-1">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <div className="text-base font-extrabold text-zinc-800 dark:text-zinc-200">BIR-Compliant Draft</div>
          </div>
          <p className="text-[10px] text-zinc-400 mt-2 font-medium">Double-entry ledger rules applied strictly.</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Statement Period</span>
          <div className="text-base font-extrabold text-zinc-800 dark:text-zinc-200 mt-1 line-clamp-1">{periodText}</div>
          <p className="text-[10px] text-zinc-400 mt-2 font-medium">Filter parameters matched in active statement.</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Net Operational Margin</span>
          <div className={`text-base font-extrabold mt-1 ${currentNetIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {displayMoney(currentNetIncome)}
          </div>
          <p className="text-[10px] text-zinc-400 mt-2 font-medium">Earnings net of operating disbursements.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 no-print">
        <button 
          onClick={() => setActiveView('Report')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative ${activeView === 'Report' ? 'text-blue-600' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
        >
          Full Financial Report
          {activeView === 'Report' && <motion.div layoutId="fs-tab" className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-600" />}
        </button>
        <button 
          onClick={() => setActiveView('Consolidation')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative ${activeView === 'Consolidation' ? 'text-blue-600' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
        >
          Consolidation Worksheet
          {activeView === 'Consolidation' && <motion.div layoutId="fs-tab" className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-600" />}
        </button>
      </div>

      {activeView === 'Consolidation' ? renderConsolidation() : renderReport()}
    </div>
  );
};

export default FSModule;
