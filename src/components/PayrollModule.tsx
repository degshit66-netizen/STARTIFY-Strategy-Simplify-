import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, Plus, CheckCircle, Clock, Calculator, Banknote, TrendingUp, PieChart } from 'lucide-react';
import { LedgerEntry } from '../types';
import { formatCurrency } from '../utils/helpers';
import { Employee } from './HRModule';

interface PayrollModuleProps {
  handleSaveEntry: (entry: LedgerEntry) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface Payslip {
  employeeId: string;
  name: string;
  basic: number;
  ot: number;
  allowance: number;
  lates: number;
  vale: number;
  sss: number;
  philHealth: number;
  pagIbig: number;
  tax: number;
  net: number;
}

interface PayrollRun {
  id: string;
  date: string;
  periodMonth: string;
  periodYear: string;
  periodType: '15th' | '30th' | 'Monthly';
  payslips: Payslip[];
  totalBasic: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  status: 'Draft' | 'Posted';
}

const HR_STORAGE_KEY = 'stratify_hr_employees';
const PR_STORAGE_KEY = 'stratify_payroll_runs';

export const PayrollModule: React.FC<PayrollModuleProps> = ({ handleSaveEntry, showToast }) => {
  const [activeTab, setActiveTab] = useState<'Runs' | 'History' | 'Settings'>('Runs');
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Filters for History
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  // Generator State
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [draftPeriodMonth, setDraftPeriodMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [draftPeriodYear, setDraftPeriodYear] = useState(new Date().getFullYear().toString());
  const [draftPeriodType, setDraftPeriodType] = useState<'15th' | '30th' | 'Monthly'>('15th');
  const [draftPayslips, setDraftPayslips] = useState<Payslip[]>([]);

  useEffect(() => {
    const hrStored = localStorage.getItem(HR_STORAGE_KEY);
    if (hrStored) {
      setEmployees(JSON.parse(hrStored));
    }
    const prStored = localStorage.getItem(PR_STORAGE_KEY);
    if (prStored) {
      setRuns(JSON.parse(prStored));
    }
  }, []);

  const saveRuns = (list: PayrollRun[]) => {
    setRuns(list);
    localStorage.setItem(PR_STORAGE_KEY, JSON.stringify(list));
  };

  const openGenerator = () => {
    const activeEmps = employees.filter(e => e.status === 'Active');
    if (activeEmps.length === 0) {
      showToast('No active employees found in HR to generate payroll.', 'error');
      return;
    }
    
    // Setup draft
    const initialDrafts: Payslip[] = activeEmps.map(emp => {
      let basic = Number(emp.basicSalary) || 0;
      if (draftPeriodType !== 'Monthly') basic = basic / 2;
      
      const sss = basic * 0.045; // simplified
      const philHealth = basic * 0.02; // simplified
      const pagIbig = 100;
      
      const ot = 0;
      const allowance = 0;
      const lates = 0;
      const vale = 0;
      
      // Basic withholding tax computation (simplified: 15% for amount > 10,417 semi-monthly equivalent of 250k/yr)
      const taxableIncome = basic - (sss + philHealth + pagIbig);
      const tax = taxableIncome > 10417 ? (taxableIncome - 10417) * 0.15 : 0; 
      
      const net = (basic + ot + allowance) - (sss + philHealth + pagIbig + lates + vale + tax);
      
      return {
        employeeId: emp.id,
        name: emp.name,
        basic,
        ot,
        allowance,
        lates,
        vale,
        sss,
        philHealth,
        pagIbig,
        tax,
        net
      };
    });
    
    setDraftPayslips(initialDrafts);
    setIsGeneratorOpen(true);
  };

  const updateDraftPayslip = (empId: string, field: keyof Payslip, value: number) => {
    setDraftPayslips(prev => prev.map(p => {
      if (p.employeeId === empId) {
        const updated = { ...p, [field]: value };
        // Recompute net
        updated.net = (updated.basic + updated.ot + updated.allowance) - 
                      (updated.sss + updated.philHealth + updated.pagIbig + updated.lates + updated.vale + updated.tax);
        return updated;
      }
      return p;
    }));
  };

  const saveDraftRun = () => {
    const totalBasic = draftPayslips.reduce((acc, curr) => acc + curr.basic, 0);
    const totalGross = draftPayslips.reduce((acc, curr) => acc + curr.basic + curr.ot + curr.allowance, 0);
    const totalDeductions = draftPayslips.reduce((acc, curr) => acc + (curr.sss + curr.philHealth + curr.pagIbig + curr.lates + curr.vale + curr.tax), 0);
    const totalNet = draftPayslips.reduce((acc, curr) => acc + curr.net, 0);

    const newRun: PayrollRun = {
      id: `PR-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().slice(0, 10),
      periodMonth: draftPeriodMonth,
      periodYear: draftPeriodYear,
      periodType: draftPeriodType,
      payslips: draftPayslips,
      totalBasic,
      totalGross,
      totalDeductions,
      totalNet,
      status: 'Draft'
    };

    saveRuns([newRun, ...runs]);
    setIsGeneratorOpen(false);
    setActiveTab('Runs');
    showToast(`Payroll run drafted for ${draftPeriodMonth} ${draftPeriodType}.`, 'success');
  };

  const processRun = (id: string) => {
    const run = runs.find(r => r.id === id);
    if (!run) return;

    // Post to ledger individually to keep it detailed.
    run.payslips.forEach(ps => {
      const entry: LedgerEntry = {
        id: Date.now() + Math.random(),
        date: run.date,
        month: run.periodMonth.toUpperCase(),
        category: 'Operating',
        cash: 0,
        createdAt: new Date().toISOString(),
        accountCode: '6000', // Salaries Expense
        type: 'Expense',
        payor: ps.name,
        tin: '',
        particulars: `Payroll ${run.periodMonth} ${run.periodType} - Basic: ${ps.basic}, OT: ${ps.ot}, Ded: ${ps.sss + ps.philHealth + ps.pagIbig + ps.vale + ps.lates}`,
        gross: ps.basic + ps.ot + ps.allowance,
        taxType: 'Non-VAT',
        vat: 0,
        taxable: ps.basic + ps.ot + ps.allowance,
        terms: 'Cash',
        status: 'Cleared'
      };
      handleSaveEntry(entry);
    });
    
    const updated = runs.map(r => r.id === id ? { ...r, status: 'Posted' as const } : r);
    saveRuns(updated);
    showToast(`Payroll run ${id} posted to Journal Ledger.`, 'success');
  };

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Payroll System</h2>
          <p className="text-sm text-zinc-500">Manage employee salaries, process OT & deductions, and auto-post expenses.</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button onClick={() => setActiveTab('Runs')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'Runs' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>Current Runs</button>
            <button onClick={() => setActiveTab('History')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'History' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>History</button>
            
          </div>
          <button
            onClick={openGenerator}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Draft Payroll
          </button>
        </div>
      </div>
      
      {/* GENERATOR OVERLAY */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-6xl max-h-[90vh] rounded-3xl flex flex-col shadow-2xl">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Draft Payroll Run</h2>
                <p className="text-sm text-zinc-500">Review and adjust individual payslips before saving.</p>
              </div>
              <button onClick={() => setIsGeneratorOpen(false)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold text-xs">Cancel</button>
            </div>
            
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 flex gap-4 border-b border-zinc-200 dark:border-zinc-800">
              <select value={draftPeriodMonth} onChange={e => setDraftPeriodMonth(e.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm font-bold">
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={draftPeriodYear} onChange={e => setDraftPeriodYear(e.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm font-bold">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={draftPeriodType} onChange={e => setDraftPeriodType(e.target.value as any)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm font-bold">
                <option value="15th">15th (Half-Month)</option>
                <option value="30th">30th (Half-Month)</option>
                <option value="Monthly">Monthly (Full)</option>
              </select>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 uppercase">
                    <th className="px-3 py-2 font-bold">Employee</th>
                    <th className="px-3 py-2 font-bold text-right">Basic</th>
                    <th className="px-3 py-2 font-bold text-right text-emerald-600">OT/Allow</th>
                    <th className="px-3 py-2 font-bold text-right text-red-500">Lates/Vale</th>
                    <th className="px-3 py-2 font-bold text-right text-red-500">Statutory (S/P/H)</th>
                    <th className="px-3 py-2 font-bold text-right">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {draftPayslips.map(ps => (
                    <tr key={ps.employeeId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                      <td className="px-3 py-3 font-bold">{ps.name}</td>
                      <td className="px-3 py-3 text-right">
                        <input type="number" value={ps.basic} onChange={e => updateDraftPayslip(ps.employeeId, 'basic', Number(e.target.value))} className="w-20 text-right bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:border-blue-500 outline-none" />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <input type="number" title="Overtime" value={ps.ot} onChange={e => updateDraftPayslip(ps.employeeId, 'ot', Number(e.target.value))} className="w-16 text-right bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:border-blue-500 outline-none text-emerald-600 font-bold" placeholder="OT" />
                          <input type="number" title="Allowance" value={ps.allowance} onChange={e => updateDraftPayslip(ps.employeeId, 'allowance', Number(e.target.value))} className="w-16 text-right bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:border-blue-500 outline-none text-emerald-600 font-bold" placeholder="Alw" />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <input type="number" title="Lates Deduction" value={ps.lates} onChange={e => updateDraftPayslip(ps.employeeId, 'lates', Number(e.target.value))} className="w-16 text-right bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:border-red-500 outline-none text-red-500 font-bold" placeholder="Late" />
                          <input type="number" title="Vale / Advance" value={ps.vale} onChange={e => updateDraftPayslip(ps.employeeId, 'vale', Number(e.target.value))} className="w-16 text-right bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:border-red-500 outline-none text-red-500 font-bold" placeholder="Vale" />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {formatCurrency((ps.sss + ps.philHealth + ps.pagIbig).toString())}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-lg text-emerald-600">
                        {formatCurrency(ps.net.toString())}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center rounded-b-3xl">
              <div>
                <p className="text-sm font-bold text-zinc-500">Total Net Payroll</p>
                <p className="text-3xl font-black text-emerald-600">{formatCurrency(draftPayslips.reduce((a,c) => a + c.net, 0).toString())}</p>
              </div>
              <button onClick={saveDraftRun} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20">
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
};
