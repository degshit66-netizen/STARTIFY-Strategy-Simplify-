import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, FileText, Plus, CheckCircle, Clock, Calculator, 
  Banknote, TrendingUp, PieChart, ArrowRight, ArrowLeftRight, Trash2, Eye, ShieldAlert, Check, Printer, Settings, X
, Gift } from 'lucide-react';
import { LedgerEntry, COAAccount } from '../types';
import { formatCurrency, parseNum } from '../utils/helpers';
import { Employee } from './HRModule';

interface PayrollModuleProps {
  handleSaveEntry: (entry: LedgerEntry) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface Payslip {
  employeeId: string;
  name: string;
  employmentStatus?: string; // Regular or Casual
  rateType?: 'Monthly' | 'Daily' | 'Hourly';
  dailyRate?: number;
  hourlyRate?: number;
  daysWorked?: number;
  hoursWorked?: number;
  otHours?: number;
  lateHours?: number;
  basic: number;
  ot: number;
  holidayPay: number; // Holiday / Premium Pay
  allowance: number;  // Food Allowance
  lates: number;
  vale: number;       // Vale / Cash Advance
  sss: number;         // EE Share
  philHealth: number;  // EE Share
  pagIbig: number;     // EE Share
  tax: number;
  net: number;
  // Matching ER Shares (Calculated for sync bridge)
  sssEr: number;
  philHealthEr: number;
  pagIbigEr: number;
}

interface PayrollRun {
  id: string;
  date: string;
  periodMonth: string;
  periodYear: string;
  periodType: '15th' | '30th' | 'Monthly' | 'Weekly' | '13th Month';
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
  const [activeTab, setActiveTab] = useState<'Runs' | 'History' | '13thMonth'>('Runs');
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyConfig, setCompanyConfig] = useState<{ companyName: string; address: string }>({
    companyName: 'STRATIFY System',
    address: 'Ortigas Center, Pasig City, Metro Manila'
  });

  // Generator State
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [draftPeriodMonth, setDraftPeriodMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [draftPeriodYear, setDraftPeriodYear] = useState(new Date().getFullYear().toString());
  const [draftPeriodType, setDraftPeriodType] = useState<'15th' | '30th' | 'Monthly' | 'Weekly'>('15th');
  const [draftWeekNumber, setDraftWeekNumber] = useState<string>('Week 1');
  const [applyStatutory, setApplyStatutory] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [payrollSettings, setPayrollSettings] = useState({ otRate: 1.25, lateRateType: 'hourly', lateRateValue: 1, statutorySchedule: 'Divided', sssRate: 4.5, sssMaxEE: 1350, phRateEE: 2.5, phFloor: 10000, phCap: 100000, piRateEE: 2.0, piMaxEE: 200 });
  
  useEffect(() => {
    const saved = localStorage.getItem('stratify_payroll_settings');
    if (saved) {
      try { setPayrollSettings(JSON.parse(saved)); } catch(e) {}
    }
  }, []);
  const [draftPayslips, setDraftPayslips] = useState<Payslip[]>([]);

  // Preview State
  const [previewRun, setPreviewRun] = useState<PayrollRun | null>(null);
  const [previewTab, setPreviewTab] = useState<'Sheet' | 'Payslips'>('Sheet');
  const [showLedgerPreview, setShowLedgerPreview] = useState<PayrollRun | null>(null);

  useEffect(() => {
    // Load company config
    const storedConfig = localStorage.getItem('stratify_company_config');
    if (storedConfig) {
      try {
        const parsed = JSON.parse(storedConfig);
        if (parsed.companyName) {
          setCompanyConfig({
            companyName: parsed.companyName,
            address: parsed.address || 'Ortigas Center, Pasig City, Metro Manila'
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    const hrStored = localStorage.getItem(HR_STORAGE_KEY);
    if (hrStored) {
      setEmployees(JSON.parse(hrStored));
    }
    const prStored = localStorage.getItem(PR_STORAGE_KEY);
    if (prStored) {
      setRuns(JSON.parse(prStored));
    } else {
      // Seed a default draft to show functionality immediately if empty
      const defaultDraft = generateInitialDraft(
        hrStored ? JSON.parse(hrStored) : [], 
        new Date().toLocaleString('default', { month: 'long' }), 
        new Date().getFullYear().toString(), 
        '15th',
        true,
        'Week 1'
      );
      if (defaultDraft.length > 0) {
        const initialRun: PayrollRun = {
          id: 'PR-99201',
          date: new Date().toISOString().slice(0, 10),
          periodMonth: new Date().toLocaleString('default', { month: 'long' }),
          periodYear: new Date().getFullYear().toString(),
          periodType: '15th',
          payslips: defaultDraft,
          totalBasic: defaultDraft.reduce((a, c) => a + c.basic, 0),
          totalGross: defaultDraft.reduce((a, c) => a + c.basic + c.ot + (c.holidayPay || 0) + c.allowance, 0),
          totalDeductions: defaultDraft.reduce((a, c) => a + (c.sss + c.philHealth + c.pagIbig + c.lates + c.vale + c.tax), 0),
          totalNet: defaultDraft.reduce((a, c) => a + c.net, 0),
          status: 'Draft'
        };
        setRuns([initialRun]);
        localStorage.setItem(PR_STORAGE_KEY, JSON.stringify([initialRun]));
      }
    }
  }, []);

  const saveRuns = (list: PayrollRun[]) => {
    setRuns(list);
    localStorage.setItem(PR_STORAGE_KEY, JSON.stringify(list));
  };

  const generateInitialDraft = (empList: Employee[], month: string, year: string, type: '15th' | '30th' | 'Monthly' | 'Weekly', applyStat: boolean, weekNumber?: string): Payslip[] => {
    // Filter active employees based on the frequency matching the payroll run type
    const activeEmps = empList.filter(e => {
      if (e.status !== 'Active') return false;
      const freq = e.payFrequency || 'Semi-Monthly';
      if (type === 'Weekly') return freq === 'Weekly';
      if (type === '15th' || type === '30th') return freq === 'Semi-Monthly';
      if (type === 'Monthly') return freq === 'Monthly';
      return true;
    });

    return activeEmps.map(emp => {
      const savedSettingsStr = localStorage.getItem('stratify_payroll_settings');
      let statSched = 'Divided';
      let sssR = 4.5; let sssM = 1350;
      let phR = 2.5; let phF = 10000; let phC = 100000;
      let piR = 2.0; let piM = 200;
      if (savedSettingsStr) {
        try {
          const s = JSON.parse(savedSettingsStr);
          if (s.statutorySchedule) statSched = s.statutorySchedule;
          if (s.sssRate) sssR = Number(s.sssRate);
          if (s.sssMaxEE) sssM = Number(s.sssMaxEE);
          if (s.phRateEE) phR = Number(s.phRateEE);
          if (s.phFloor) phF = Number(s.phFloor);
          if (s.phCap) phC = Number(s.phCap);
          if (s.piRateEE) piR = Number(s.piRateEE);
          if (s.piMaxEE) piM = Number(s.piMaxEE);
        } catch(e) {}
      }
      
      let shouldDeductStatutory = applyStat;
      let statDivisor = 1;

      if (statSched === 'Half-Half') statSched = 'Divided';
      if (statSched === '15th Only') statSched = 'First Period';
      if (statSched === '30th Only') statSched = 'Last Period';

      if (type === 'Weekly') {
        if (statSched === 'First Period') {
           statDivisor = 1;
           if (weekNumber !== 'Week 1') shouldDeductStatutory = false;
        } else if (statSched === 'Last Period') {
           statDivisor = 1;
           if (weekNumber !== 'Week 4' && weekNumber !== 'Week 5') shouldDeductStatutory = false;
        } else {
           statDivisor = 4;
        }
      } else if (type === '15th' || type === '30th') {
        if (statSched === 'First Period') {
           statDivisor = 1;
           if (type === '30th') shouldDeductStatutory = false;
        } else if (statSched === 'Last Period') {
           statDivisor = 1;
           if (type === '15th') shouldDeductStatutory = false;
        } else {
           statDivisor = 2;
        }
      } else {
        statDivisor = 1;
      }

      // Base monthly salary is the reference point for Philippine statutory deductions
      const monthlySalary = parseNum(emp.basicSalary) || 0;

      // 1. SSS EE & ER calculation (2025/2026 Rules: 4.5% EE, 9.5% ER)
      const sssMonthly = shouldDeductStatutory ? Math.min(monthlySalary * (sssR / 100), sssM) : 0;
      const sssErMonthly = shouldDeductStatutory ? Math.min(monthlySalary * 0.095, 2850) : 0;

      // 2. PhilHealth EE & ER calculation (5% split 50-50, i.e., 2.5% EE, 2.5% ER, floor 10k, cap 100k)
      const philHealthBase = Math.max(phF, Math.min(monthlySalary, phC));
      const philHealthMonthly = philHealthBase * (phR / 100);
      const philHealthErMonthly = philHealthBase * 0.025;

      // 3. Pag-IBIG EE & ER calculation (max salary base 10k, 2% split, i.e., max 200 pesos each)
      const pagIbigMonthly = Math.min(monthlySalary * (piR / 100), piM);
      const pagIbigErMonthly = pagIbigMonthly;

      let basic = monthlySalary;
      let divisor = 1;

      if (type === 'Weekly') {
        divisor = 4;
        if (emp.rateType === 'Daily' && emp.dailyRate) {
          basic = emp.dailyRate * 6; // standard 6 working days
        } else if (emp.rateType === 'Hourly' && emp.hourlyRate) {
          basic = emp.hourlyRate * 48; // standard 48 hours
        } else {
          basic = monthlySalary / 4;
        }
      } else if (type === '15th' || type === '30th') {
        divisor = 2;
        basic = monthlySalary / 2;
      } else {
        divisor = 1;
        basic = monthlySalary;
      }

      // Statutory deductions for this period
      const sss = parseNum((sssMonthly / statDivisor).toFixed(2));
      const sssEr = parseNum((sssErMonthly / statDivisor).toFixed(2));

      const philHealth = parseNum((philHealthMonthly / statDivisor).toFixed(2));
      const philHealthEr = parseNum((philHealthErMonthly / statDivisor).toFixed(2));

      const pagIbig = parseNum((pagIbigMonthly / statDivisor).toFixed(2));
      const pagIbigEr = parseNum((pagIbigErMonthly / statDivisor).toFixed(2));

      const ot = 0;
      const holidayPay = 0;
      const allowance = 0;
      const lates = 0;
      const vale = 0;

      // Infer regular vs casual status
      const isCasual = emp.role.toLowerCase().includes('casual') || 
                       emp.role.toLowerCase().includes('helper') || 
                       emp.role.toLowerCase().includes('loader') || 
                       emp.role.toLowerCase().includes('driver') ||
                       emp.department.toLowerCase().includes('operations') || 
                       monthlySalary < 25000;
      const employmentStatus = isCasual ? 'Casual' : 'Regular';
      
      // Basic withholding tax computation (Philippine TRAIN Law Table)
      const taxableIncome = basic - (sss + philHealth + pagIbig);
      let tax = 0;

      if (type === 'Weekly') {
        // Weekly Taxable Income Bracket
        if (taxableIncome > 38462) {
          tax = 7740.38 + (taxableIncome - 38462) * 0.30;
        } else if (taxableIncome > 15385) {
          tax = 1971.15 + (taxableIncome - 15385) * 0.25;
        } else if (taxableIncome > 7692) {
          tax = 432.69 + (taxableIncome - 7692) * 0.20;
        } else if (taxableIncome > 4808) {
          tax = (taxableIncome - 4808) * 0.15;
        } else {
          tax = 0;
        }
      } else if (type === '15th' || type === '30th') {
        // Semi-monthly Taxable Income Bracket
        if (taxableIncome > 83333) {
          tax = 16770.83 + (taxableIncome - 83333) * 0.30;
        } else if (taxableIncome > 33333) {
          tax = 4270.83 + (taxableIncome - 33333) * 0.25;
        } else if (taxableIncome > 16667) {
          tax = 937.50 + (taxableIncome - 16667) * 0.20;
        } else if (taxableIncome > 10417) {
          tax = (taxableIncome - 10417) * 0.15;
        } else {
          tax = 0;
        }
      } else {
        // Monthly Taxable Income Bracket
        if (taxableIncome > 166667) {
          tax = 33541.67 + (taxableIncome - 166667) * 0.30;
        } else if (taxableIncome > 66667) {
          tax = 8541.67 + (taxableIncome - 66667) * 0.25;
        } else if (taxableIncome > 33333) {
          tax = 1875 + (taxableIncome - 33333) * 0.20;
        } else if (taxableIncome > 20833) {
          tax = (taxableIncome - 20833) * 0.15;
        } else {
          tax = 0;
        }
      }

      tax = parseNum(tax.toFixed(2));
      const net = parseNum(((basic + ot + holidayPay + allowance) - (sss + philHealth + pagIbig + lates + vale + tax)).toFixed(2));
      
      return {
        employeeId: emp.id,
        rateType: emp.rateType || 'Monthly',
        dailyRate: emp.dailyRate || 0,
        hourlyRate: emp.hourlyRate || 0,
        daysWorked: (emp.rateType === 'Daily' || emp.rateType === 'Hourly') && type === 'Weekly' ? 6 : (type === 'Weekly' ? 6 : (type === '15th' || type === '30th' ? 13 : 26)),
        hoursWorked: emp.rateType === 'Hourly' ? 48 : 0,
        otHours: 0,
        lateHours: 0,
        name: emp.name,
        employmentStatus,
        basic,
        ot,
        holidayPay,
        allowance,
        lates,
        vale,
        sss,
        philHealth,
        pagIbig,
        tax,
        net,
        sssEr,
        philHealthEr,
        pagIbigEr
      };
    });
  };

  const openGenerator = () => {
    const activeEmps = employees.filter(e => e.status === 'Active');
    if (activeEmps.length === 0) {
      showToast('No active employees found in HR to generate payroll.', 'error');
      return;
    }
    
    const initialDrafts = generateInitialDraft(employees, draftPeriodMonth, draftPeriodYear, draftPeriodType, applyStatutory, draftWeekNumber);
    setDraftPayslips(initialDrafts);
    setIsGeneratorOpen(true);
  };

  // Re-run draft calculation whenever month/year/type/week changes
  useEffect(() => {
    if (isGeneratorOpen && employees.length > 0) {
      const initialDrafts = generateInitialDraft(employees, draftPeriodMonth, draftPeriodYear, draftPeriodType, applyStatutory, draftWeekNumber);
      setDraftPayslips(initialDrafts);
    }
  }, [draftPeriodMonth, draftPeriodYear, draftPeriodType, draftWeekNumber, applyStatutory]);

  const updateDraftPayslip = (empId: string, field: keyof Payslip, value: any) => {
    setDraftPayslips(prev => prev.map(p => {
      if (p.employeeId === empId) {
        const updated = { ...p, [field]: value };
        
        // Re-calculate contributions dynamically if basic salary is updated
        if (field === 'daysWorked' || field === 'hoursWorked') {
          if (updated.rateType === 'Daily' && updated.dailyRate) {
            updated.basic = updated.dailyRate * (parseNum(updated.daysWorked) || 0);
          } else if (updated.rateType === 'Hourly' && updated.hourlyRate) {
            updated.basic = updated.hourlyRate * (parseNum(updated.hoursWorked) || 0);
          }
        }
        if (field === 'otHours') {
          if (updated.rateType === 'Daily' && updated.dailyRate) {
            const hourly = updated.dailyRate / 8;
            updated.ot = hourly * payrollSettings.otRate * (parseNum(updated.otHours) || 0);
          } else if (updated.rateType === 'Hourly' && updated.hourlyRate) {
            updated.ot = updated.hourlyRate * payrollSettings.otRate * (parseNum(updated.otHours) || 0);
          }
        }
        
        if (field === 'lateHours') {
          updated.lates = payrollSettings.lateRateValue * (parseNum(updated.lateHours) || 0);
        }

        if (field === 'basic' || field === 'daysWorked' || field === 'hoursWorked') {
          const valNum = parseNum(value) || 0;
          let refMonthly = valNum;
          let statDivisor = 1;
          let shouldDeductStatutory = applyStatutory;
          
          let statSched = payrollSettings.statutorySchedule || 'Divided';
          if (statSched === 'Half-Half') statSched = 'Divided';
          if (statSched === '15th Only') statSched = 'First Period';
          if (statSched === '30th Only') statSched = 'Last Period';
          
          if (draftPeriodType === 'Weekly') {
            if (statSched === 'First Period') {
               statDivisor = 1;
               if (draftWeekNumber !== 'Week 1') shouldDeductStatutory = false;
            } else if (statSched === 'Last Period') {
               statDivisor = 1;
               if (draftWeekNumber !== 'Week 4' && draftWeekNumber !== 'Week 5') shouldDeductStatutory = false;
            } else {
               statDivisor = 4;
            }
          } else if (draftPeriodType === '15th' || draftPeriodType === '30th') {
            if (statSched === 'First Period') {
               statDivisor = 1;
               if (draftPeriodType === '30th') shouldDeductStatutory = false;
            } else if (statSched === 'Last Period') {
               statDivisor = 1;
               if (draftPeriodType === '15th') shouldDeductStatutory = false;
            } else {
               statDivisor = 2;
            }
          }

          let div = 1;
          if (draftPeriodType === 'Weekly') {
            refMonthly = valNum * 4;
            div = 4;
          } else if (draftPeriodType === '15th' || draftPeriodType === '30th') {
            refMonthly = valNum * 2;
            div = 2;
          }
          
          // Re-calculate SSS (2025/2026 rules)
          const sssM = shouldDeductStatutory ? Math.min(refMonthly * ((payrollSettings.sssRate || 4.5) / 100), (payrollSettings.sssMaxEE || 1350)) : 0;
          updated.sss = parseNum((sssM / statDivisor).toFixed(2));
          updated.sssEr = shouldDeductStatutory ? parseNum((Math.min(refMonthly * 0.095, 2850) / statDivisor).toFixed(2)) : 0;

          // Re-calculate PhilHealth
          const phBase = Math.max((payrollSettings.phFloor || 10000), Math.min(refMonthly, (payrollSettings.phCap || 100000)));
          updated.philHealth = shouldDeductStatutory ? parseNum((phBase * ((payrollSettings.phRateEE || 2.5) / 100) / statDivisor).toFixed(2)) : 0;
          updated.philHealthEr = updated.philHealth;

          // Re-calculate Pag-IBIG
          const piM = Math.min(refMonthly * ((payrollSettings.piRateEE || 2.0) / 100), (payrollSettings.piMaxEE || 200));
          updated.pagIbig = shouldDeductStatutory ? parseNum((piM / statDivisor).toFixed(2)) : 0;
          updated.pagIbigEr = updated.pagIbig; // ER part simplified to match

          // Recompute tax dynamically based on new taxable income
          const taxInc = valNum - (updated.sss + updated.philHealth + updated.pagIbig);
          let newTax = 0;
          if (draftPeriodType === 'Weekly') {
            if (taxInc > 38462) {
              newTax = 7740.38 + (taxInc - 38462) * 0.30;
            } else if (taxInc > 15385) {
              newTax = 1971.15 + (taxInc - 15385) * 0.25;
            } else if (taxInc > 7692) {
              newTax = 432.69 + (taxInc - 7692) * 0.20;
            } else if (taxInc > 4808) {
              newTax = (taxInc - 4808) * 0.15;
            }
          } else if (draftPeriodType === '15th' || draftPeriodType === '30th') {
            if (taxInc > 83333) {
              newTax = 16770.83 + (taxInc - 83333) * 0.30;
            } else if (taxInc > 33333) {
              newTax = 4270.83 + (taxInc - 33333) * 0.25;
            } else if (taxInc > 16667) {
              newTax = 937.50 + (taxInc - 16667) * 0.20;
            } else if (taxInc > 10417) {
              newTax = (taxInc - 10417) * 0.15;
            }
          } else {
            if (taxInc > 166667) {
              newTax = 33541.67 + (taxInc - 166667) * 0.30;
            } else if (taxInc > 66667) {
              newTax = 8541.67 + (taxInc - 66667) * 0.25;
            } else if (taxInc > 33333) {
              newTax = 1875 + (taxInc - 33333) * 0.20;
            } else if (taxInc > 20833) {
              newTax = (taxInc - 20833) * 0.15;
            }
          }
          updated.tax = parseNum(newTax.toFixed(2));
        }

        // Recompute net
        const basicVal = parseNum(updated.basic);
        const otVal = parseNum(updated.ot);
        const holidayVal = parseNum(updated.holidayPay);
        const allowanceVal = parseNum(updated.allowance);
        
        const sssVal = parseNum(updated.sss);
        const phVal = parseNum(updated.philHealth);
        const piVal = parseNum(updated.pagIbig);
        const latesVal = parseNum(updated.lates);
        const valeVal = parseNum(updated.vale);
        const taxVal = parseNum(updated.tax);

        const gross = basicVal + otVal + holidayVal + allowanceVal;
        const totalDeductions = sssVal + phVal + piVal + latesVal + valeVal + taxVal;
        
        updated.net = gross - totalDeductions;
        return updated;
      }
      return p;
    }));
  };

  const saveDraftRun = () => {
    const totalBasic = draftPayslips.reduce((acc, curr) => acc + curr.basic, 0);
    const totalGross = draftPayslips.reduce((acc, curr) => acc + curr.basic + curr.ot + (curr.holidayPay || 0) + curr.allowance, 0);
    const totalDeductions = draftPayslips.reduce((acc, curr) => acc + (curr.sss + curr.philHealth + curr.pagIbig + curr.lates + curr.vale + curr.tax), 0);
    const totalNet = draftPayslips.reduce((acc, curr) => acc + curr.net, 0);

    const newRun: PayrollRun = {
      id: `PR-${Date.now().toString().slice(-5)}`,
      date: new Date().toISOString().slice(0, 10),
      periodMonth: draftPeriodType === 'Weekly' ? `${draftPeriodMonth} - ${draftWeekNumber}` : draftPeriodMonth,
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
    showToast(`Payroll run drafted for ${draftPeriodType === 'Weekly' ? `${draftPeriodMonth} (${draftWeekNumber})` : `${draftPeriodMonth} ${draftPeriodType}`}.`, 'success');
  };

  const deleteRun = (id: string) => {
    const updated = runs.filter(r => r.id !== id);
    saveRuns(updated);
    showToast(`Payroll draft ${id} has been deleted.`, 'info');
  };

  // AUTOMATED SYNC BRIDGE: Posts statutory contributions and salaries to ledger with exact balancing rows
  const processRun = (id: string) => {
    const run = runs.find(r => r.id === id);
    if (!run) return;

    const postDate = run.date || new Date().toISOString().slice(0, 10);
    const runMonth = (run.periodMonth || '').toUpperCase();
    const runYear = run.periodYear;

    // Post to ledger individually for high detailing & compliance
    run.payslips.forEach(ps => {
      // 1. Post Net Cash Salary paid to employee (Debit Salaries and Wages 6010, Credit Cash 1010)
      const cashEntry: LedgerEntry = {
        id: Date.now() + Math.random(),
        date: postDate,
        month: runMonth,
        year: runYear,
        category: 'Salaries and Wages', // 6010
        type: 'Expense',
        postingNature: 'Cash Transaction',
        payor: ps.name,
        tin: '',
        particulars: `Net Salaries Paid - ${ps.name} (${run.periodMonth} ${run.periodType})`,
        gross: ps.net,
        cash: ps.net,
        taxType: 'Non-VAT',
        vat: 0,
        taxable: ps.net,
        terms: 'Cash',
        status: 'Cleared',
        createdAt: new Date().toISOString()
      };
      handleSaveEntry(cashEntry);

      // 2. Post SSS EE contribution (Debit Salaries and Wages 6010, Credit SSS Payable 2030)
      if (ps.sss > 0) {
        const sssEeEntry: LedgerEntry = {
          id: Date.now() + Math.random(),
          date: postDate,
          month: runMonth,
          year: runYear,
          category: 'Salaries and Wages', // 6010
          type: 'Expense',
          postingNature: 'Accrual',
          payor: ps.name,
          particulars: `SSS Employee Share Deduction - ${ps.name} (${run.periodMonth} ${run.periodType})`,
          gross: ps.sss,
          cash: ps.sss,
          taxType: 'Non-VAT',
          vat: 0,
          taxable: ps.sss,
          terms: 'SSS Payable', // Credits 2030 SSS Payable
          status: 'Cleared',
          createdAt: new Date().toISOString()
        };
        handleSaveEntry(sssEeEntry);
      }

      // 3. Post SSS ER contribution (Debit SSS Contribution Expense 6011, Credit SSS Payable 2030)
      if (ps.sssEr > 0) {
        const sssErEntry: LedgerEntry = {
          id: Date.now() + Math.random(),
          date: postDate,
          month: runMonth,
          year: runYear,
          category: 'SSS Contribution Expense (ER share)', // 6011
          type: 'Expense',
          postingNature: 'Accrual',
          payor: ps.name,
          particulars: `SSS Employer Share matching (ER share) - ${ps.name} (${run.periodMonth} ${run.periodType})`,
          gross: ps.sssEr,
          cash: ps.sssEr,
          taxType: 'Non-VAT',
          vat: 0,
          taxable: ps.sssEr,
          terms: 'SSS Payable', // Credits 2030 SSS Payable
          status: 'Cleared',
          createdAt: new Date().toISOString()
        };
        handleSaveEntry(sssErEntry);
      }

      // 4. Post PhilHealth EE contribution (Debit Salaries and Wages 6010, Credit Philhealth Payable 2040)
      if (ps.philHealth > 0) {
        const phEeEntry: LedgerEntry = {
          id: Date.now() + Math.random(),
          date: postDate,
          month: runMonth,
          year: runYear,
          category: 'Salaries and Wages', // 6010
          type: 'Expense',
          postingNature: 'Accrual',
          payor: ps.name,
          particulars: `PhilHealth Employee Share Deduction - ${ps.name} (${run.periodMonth} ${run.periodType})`,
          gross: ps.philHealth,
          cash: ps.philHealth,
          taxType: 'Non-VAT',
          vat: 0,
          taxable: ps.philHealth,
          terms: 'Philhealth Payable', // Credits 2040 Philhealth Payable
          status: 'Cleared',
          createdAt: new Date().toISOString()
        };
        handleSaveEntry(phEeEntry);
      }

      // 5. Post PhilHealth ER contribution (Debit Philhealth Contribution Expense 6012, Credit Philhealth Payable 2040)
      if (ps.philHealthEr > 0) {
        const phErEntry: LedgerEntry = {
          id: Date.now() + Math.random(),
          date: postDate,
          month: runMonth,
          year: runYear,
          category: 'Philhealth Contribution Expense (ER share)', // 6012
          type: 'Expense',
          postingNature: 'Accrual',
          payor: ps.name,
          particulars: `PhilHealth Employer Share matching (ER share) - ${ps.name} (${run.periodMonth} ${run.periodType})`,
          gross: ps.philHealthEr,
          cash: ps.philHealthEr,
          taxType: 'Non-VAT',
          vat: 0,
          taxable: ps.philHealthEr,
          terms: 'Philhealth Payable', // Credits 2040 Philhealth Payable
          status: 'Cleared',
          createdAt: new Date().toISOString()
        };
        handleSaveEntry(phErEntry);
      }

      // 6. Post Pag-IBIG EE contribution (Debit Salaries and Wages 6010, Credit Pagibig Payable 2050)
      if (ps.pagIbig > 0) {
        const piEeEntry: LedgerEntry = {
          id: Date.now() + Math.random(),
          date: postDate,
          month: runMonth,
          year: runYear,
          category: 'Salaries and Wages', // 6010
          type: 'Expense',
          postingNature: 'Accrual',
          payor: ps.name,
          particulars: `Pag-IBIG Employee Share Deduction - ${ps.name} (${run.periodMonth} ${run.periodType})`,
          gross: ps.pagIbig,
          cash: ps.pagIbig,
          taxType: 'Non-VAT',
          vat: 0,
          taxable: ps.pagIbig,
          terms: 'Pagibig Payable', // Credits 2050 Pagibig Payable
          status: 'Cleared',
          createdAt: new Date().toISOString()
        };
        handleSaveEntry(piEeEntry);
      }

      // 7. Post Pag-IBIG ER contribution (Debit Pagibig Contribution Expense 6013, Credit Pagibig Payable 2050)
      if (ps.pagIbigEr > 0) {
        const piErEntry: LedgerEntry = {
          id: Date.now() + Math.random(),
          date: postDate,
          month: runMonth,
          year: runYear,
          category: 'Pagibig Contribution Expense (ER share)', // 6013
          type: 'Expense',
          postingNature: 'Accrual',
          payor: ps.name,
          particulars: `Pag-IBIG Employer Share matching (ER share) - ${ps.name} (${run.periodMonth} ${run.periodType})`,
          gross: ps.pagIbigEr,
          cash: ps.pagIbigEr,
          taxType: 'Non-VAT',
          vat: 0,
          taxable: ps.pagIbigEr,
          terms: 'Pagibig Payable', // Credits 2050 Pagibig Payable
          status: 'Cleared',
          createdAt: new Date().toISOString()
        };
        handleSaveEntry(piErEntry);
      }

      // 8. Post Taxes and other deductions (Debit Salaries and Wages 6010, Credit Accrued Expenses 2014)
      const taxAndDeductions = ps.tax + ps.lates + ps.vale;
      if (taxAndDeductions > 0) {
        const taxAndDeductionsEntry: LedgerEntry = {
          id: Date.now() + Math.random(),
          date: postDate,
          month: runMonth,
          year: runYear,
          category: 'Salaries and Wages', // 6010
          type: 'Expense',
          postingNature: 'Accrual',
          payor: ps.name,
          particulars: `Withholding Tax & Deductions - ${ps.name} (${run.periodMonth} ${run.periodType})`,
          gross: taxAndDeductions,
          cash: taxAndDeductions,
          taxType: 'Non-VAT',
          vat: 0,
          taxable: taxAndDeductions,
          terms: 'Accrued Expenses', // Credits 2014 Accrued Expenses
          status: 'Cleared',
          createdAt: new Date().toISOString()
        };
        handleSaveEntry(taxAndDeductionsEntry);
      }
    });
    
    const updated = runs.map(r => r.id === id ? { ...r, status: 'Posted' as const } : r);
    saveRuns(updated);
    showToast(`Payroll run ${id} successfully synced! Posted salaries, employee deductions, and employer matching contributions to the Chart of Accounts.`, 'success');
  };

  // Helper to compile all double-entries of a run for visualization in the preview panel
  const getLedgerLines = (run: PayrollRun) => {
    const lines: Array<{ code: string; title: string; debit: number; credit: number; type: string }> = [];
    
    let totalNet = 0;
    let totalSssEe = 0;
    let totalSssEr = 0;
    let totalPhEe = 0;
    let totalPhEr = 0;
    let totalPiEe = 0;
    let totalPiEr = 0;
    let totalTaxDeductions = 0;

    run.payslips.forEach(ps => {
      totalNet += ps.net;
      totalSssEe += ps.sss;
      totalSssEr += ps.sssEr;
      totalPhEe += ps.philHealth;
      totalPhEr += ps.philHealthEr;
      totalPiEe += ps.pagIbig;
      totalPiEr += ps.pagIbigEr;
      totalTaxDeductions += (ps.tax + ps.lates + ps.vale);
    });

    const totalSalariesWageExpense = totalNet + totalSssEe + totalPhEe + totalPiEe + totalTaxDeductions;

    // DEBITS
    lines.push({ code: '6010', title: 'Salaries and Wages', debit: totalSalariesWageExpense, credit: 0, type: 'Expense' });
    if (totalSssEr > 0) lines.push({ code: '6011', title: 'SSS Contribution Expense (ER share)', debit: totalSssEr, credit: 0, type: 'Expense' });
    if (totalPhEr > 0) lines.push({ code: '6012', title: 'Philhealth Contribution Expense (ER share)', debit: totalPhEr, credit: 0, type: 'Expense' });
    if (totalPiEr > 0) lines.push({ code: '6013', title: 'Pagibig Contribution Expense (ER share)', debit: totalPiEr, credit: 0, type: 'Expense' });

    // CREDITS
    lines.push({ code: '1010', title: 'Cash in Bank / on Hand', debit: 0, credit: totalNet, type: 'Asset' });
    if ((totalSssEe + totalSssEr) > 0) lines.push({ code: '2030', title: 'SSS Payable', debit: 0, credit: totalSssEe + totalSssEr, type: 'Liability' });
    if ((totalPhEe + totalPhEr) > 0) lines.push({ code: '2040', title: 'Philhealth Payable', debit: 0, credit: totalPhEe + totalPhEr, type: 'Liability' });
    if ((totalPiEe + totalPiEr) > 0) lines.push({ code: '2050', title: 'Pagibig Payable', debit: 0, credit: totalPiEe + totalPiEr, type: 'Liability' });
    if (totalTaxDeductions > 0) lines.push({ code: '2014', title: 'Accrued Expenses', debit: 0, credit: totalTaxDeductions, type: 'Liability' });

    return lines;
  };

  const downloadPayrollCSV = (run: PayrollRun) => {
    const headers = [
      'No.',
      'Employee Name',
      'Employment Status',
      'Basic Salary',
      'Overtime / Others',
      'Holiday / Premium Pay',
      'Food Allowance',
      'Gross Pay',
      'SSS Deduction',
      'PhilHealth Deduction',
      'Pag-IBIG Deduction',
      'Vale / Cash Advance',
      'Total Deductions',
      'Withholding Tax',
      'NET PAY'
    ];

    const sanitizedPayslips = (run.payslips || []).map(p => ({
      ...p,
      basic: parseNum(p.basic),
      ot: parseNum(p.ot),
      holidayPay: parseNum(p.holidayPay),
      allowance: parseNum(p.allowance),
      sss: parseNum(p.sss),
      philHealth: parseNum(p.philHealth),
      pagIbig: parseNum(p.pagIbig),
      vale: parseNum(p.vale),
      lates: parseNum(p.lates),
      tax: parseNum(p.tax),
      net: parseNum(p.net),
    }));

    const rows = sanitizedPayslips.map((ps, idx) => {
      const gross = ps.basic + ps.ot + ps.holidayPay + ps.allowance;
      const totalDeductions = ps.sss + ps.philHealth + ps.pagIbig + (ps.lates || 0) + ps.vale + ps.tax;
      const net = gross - totalDeductions;
      return [
        idx + 1,
        `"${ps.name}"`,
        ps.employmentStatus || 'Regular',
        ps.basic.toFixed(2),
        ps.ot.toFixed(2),
        ps.holidayPay.toFixed(2),
        ps.allowance.toFixed(2),
        gross.toFixed(2),
        ps.sss.toFixed(2),
        ps.philHealth.toFixed(2),
        ps.pagIbig.toFixed(2),
        ps.vale.toFixed(2),
        totalDeductions.toFixed(2),
        ps.tax.toFixed(2),
        net.toFixed(2)
      ];
    });

    // Add totals row
    const totalBasic = sanitizedPayslips.reduce((a, c) => a + c.basic, 0);
    const totalOT = sanitizedPayslips.reduce((a, c) => a + c.ot, 0);
    const totalHoliday = sanitizedPayslips.reduce((a, c) => a + c.holidayPay, 0);
    const totalAllowance = sanitizedPayslips.reduce((a, c) => a + c.allowance, 0);
    const totalGross = sanitizedPayslips.reduce((a, c) => a + (c.basic + c.ot + c.holidayPay + c.allowance), 0);
    const totalSss = sanitizedPayslips.reduce((a, c) => a + c.sss, 0);
    const totalPhil = sanitizedPayslips.reduce((a, c) => a + c.philHealth, 0);
    const totalPagIbig = sanitizedPayslips.reduce((a, c) => a + c.pagIbig, 0);
    const totalVale = sanitizedPayslips.reduce((a, c) => a + c.vale, 0);
    const totalDeductionsSum = sanitizedPayslips.reduce((a, c) => a + (c.sss + c.philHealth + c.pagIbig + c.vale + c.tax), 0);
    const totalTax = sanitizedPayslips.reduce((a, c) => a + c.tax, 0);
    const totalNet = sanitizedPayslips.reduce((a, c) => a + c.net, 0);

    rows.push([
      'TOTALS',
      '',
      '',
      totalBasic.toFixed(2),
      totalOT.toFixed(2),
      totalHoliday.toFixed(2),
      totalAllowance.toFixed(2),
      totalGross.toFixed(2),
      totalSss.toFixed(2),
      totalPhil.toFixed(2),
      totalPagIbig.toFixed(2),
      totalVale.toFixed(2),
      totalDeductionsSum.toFixed(2),
      totalTax.toFixed(2),
      totalNet.toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const safeCompName = (companyConfig.companyName || 'STRATIFY').toUpperCase().replace(/[^A-Z0-9]/g, '_');
    link.setAttribute("download", `${safeCompName}_PAYROLL_${(run.periodMonth || '').toUpperCase()}_${run.periodYear}_${(run.periodType || '').toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Spreadsheet CSV downloaded successfully!', 'success');
  };

  const downloadIndividualPayslipText = (ps: Payslip, run: PayrollRun) => {
    const safePs = {
      ...ps,
      basic: parseNum(ps.basic),
      ot: parseNum(ps.ot),
      holidayPay: parseNum(ps.holidayPay),
      allowance: parseNum(ps.allowance),
      sss: parseNum(ps.sss),
      philHealth: parseNum(ps.philHealth),
      pagIbig: parseNum(ps.pagIbig),
      lates: parseNum(ps.lates || 0),
      vale: parseNum(ps.vale),
      tax: parseNum(ps.tax),
      net: parseNum(ps.net),
    };
    const gross = safePs.basic + safePs.ot + safePs.holidayPay + safePs.allowance;
    const totalDeductions = safePs.sss + safePs.philHealth + safePs.pagIbig + (safePs.lates || 0) + safePs.vale + safePs.tax;
    const net = gross - totalDeductions;

    const companyHeaderLine = (companyConfig.companyName || 'STRATIFY').toUpperCase();
    const slip = `
=========================================
          ${companyHeaderLine}
           PAYSLIP VOUCHER
=========================================
Employee Name  : ${safePs.name}
Employee ID    : ${safePs.employeeId}
Status         : ${safePs.employmentStatus || 'Regular'}
Period         : ${run.periodMonth} ${run.periodYear} (${run.periodType} Period)
Date Generated : ${new Date().toLocaleDateString()}
-----------------------------------------
EARNINGS
  Basic Salary          : PHP ${safePs.basic} (${safePs.rateType === 'Hourly' ? safePs.hoursWorked + ' hrs @ ' + safePs.hourlyRate : safePs.daysWorked + ' days @ ' + safePs.dailyRate})
  Overtime / Others     : PHP ${safePs.ot} (${safePs.otHours || 0} hrs)
  Holiday / Premium Pay : PHP ${safePs.holidayPay}
  Food Allowance        : PHP ${safePs.allowance}
  ---------------------------------------
  GROSS PAY             : PHP ${formatCurrency(gross)}

DEDUCTIONS
  SSS Contribution      : PHP ${safePs.sss}
  PhilHealth            : PHP ${safePs.philHealth}
  Pag-IBIG              : PHP ${safePs.pagIbig}
  Lates / Absences      : PHP ${safePs.lates}
  Vale / Cash Advance   : PHP ${safePs.vale}
  Withholding Tax       : PHP ${safePs.tax}
  ---------------------------------------
  TOTAL DEDUCTIONS      : PHP ${formatCurrency(totalDeductions)}

=========================================
  NET PAY               : PHP ${formatCurrency(net)}
=========================================

Prepared by: ____________________________
Date: __________________________________

Received by: ____________________________
Date: __________________________________

Thank you for your hard work!
=========================================
`;
    
    const element = document.createElement("a");
    const file = new Blob([slip], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Payslip_${ps.name.replace(/\s+/g, '_')}_${run.periodMonth}_${run.periodType}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`Payslip for ${ps.name} downloaded successfully!`, 'success');
  };

  const printPayslip = (ps: Payslip, run: PayrollRun) => {
    const safePs = {
      ...ps,
      basic: parseNum(ps.basic),
      ot: parseNum(ps.ot),
      holidayPay: parseNum(ps.holidayPay),
      allowance: parseNum(ps.allowance),
      sss: parseNum(ps.sss),
      philHealth: parseNum(ps.philHealth),
      pagIbig: parseNum(ps.pagIbig),
      lates: parseNum(ps.lates || 0),
      vale: parseNum(ps.vale),
      tax: parseNum(ps.tax),
      net: parseNum(ps.net),
    };
    const gross = safePs.basic + safePs.ot + safePs.holidayPay + safePs.allowance;
    const totalDeductions = safePs.sss + safePs.philHealth + safePs.pagIbig + (safePs.lates || 0) + safePs.vale + safePs.tax;
    const net = gross - totalDeductions;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocked! Please allow popups to print.', 'error');
      return;
    }

    const renderSinglePayslipHtml = (label: string) => {
      return `
        <div class="payslip-box">
          <div class="payslip-header">
            <div class="company-name">${companyConfig.companyName.toUpperCase()}</div>
            <div class="doc-title">PAYSLIP VOUCHER (${label})</div>
          </div>
          
          <table class="meta-table">
            <tr>
              <td><strong>EMPLOYEE ID:</strong> ${safePs.employeeId}</td>
              <td style="text-align: right;"><strong>PAY PERIOD:</strong> ${run.periodMonth} ${run.periodYear} (${run.periodType})</td>
            </tr>
            <tr>
              <td><strong>EMPLOYEE NAME:</strong> ${safePs.name.toUpperCase()}</td>
              <td style="text-align: right;"><strong>STATUS:</strong> ${(safePs.employmentStatus || 'Regular').toUpperCase()}</td>
            </tr>
          </table>

          <table class="details-table">
            <thead>
              <tr>
                <th style="width: 50%;">EARNINGS</th>
                <th style="width: 50%;">DEDUCTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="col-val">
                  <div class="row-flex">
                    <span>Basic Salary:<br/><span style="font-size: 8px; color: #666; font-weight: normal;">(${safePs.rateType === 'Hourly' ? safePs.hoursWorked + ' hrs @ ' + safePs.hourlyRate : safePs.daysWorked + ' days @ ' + safePs.dailyRate})</span></span>
                    <span>${safePs.basic}</span>
                  </div>
                  <div class="row-flex">
                    <span>Overtime / OT:<br/><span style="font-size: 8px; color: #666; font-weight: normal;">(${safePs.otHours || 0} hrs)</span></span>
                    <span>${safePs.ot}</span>
                  </div>
                  <div class="row-flex"><span>Holiday / Premium Pay:</span><span>${safePs.holidayPay}</span></div>
                  <div class="row-flex"><span>Food Allowance:</span><span>${safePs.allowance}</span></div>
                  <div class="row-flex" style="border-top: 1px dashed #bbb; margin-top: 12px; padding-top: 4px; font-weight: bold;">
                    <span>GROSS PAY:</span>
                    <span>PHP ${formatCurrency(gross)}</span>
                  </div>
                </td>
                <td class="col-val" style="border-left: 1px solid #000;">
                  <div class="row-flex"><span>SSS Contribution (EE):</span><span>${safePs.sss}</span></div>
                  <div class="row-flex"><span>PhilHealth (EE):</span><span>${safePs.philHealth}</span></div>
                  <div class="row-flex"><span>Pag-IBIG (EE):</span><span>${safePs.pagIbig}</span></div>
                  <div class="row-flex"><span>Lates / Absences:</span><span>${safePs.lates || 0}</span></div>
                  <div class="row-flex"><span>Vale / Cash Advance:</span><span>${safePs.vale}</span></div>
                  <div class="row-flex"><span>Withholding Tax:</span><span>${safePs.tax}</span></div>
                  <div class="row-flex" style="border-top: 1px dashed #bbb; margin-top: 4px; padding-top: 4px; font-weight: bold;">
                    <span>TOTAL DEDUCTIONS:</span>
                    <span>PHP ${formatCurrency(totalDeductions)}</span>
                  </div>
                </td>
              </tr>
              <tr class="net-row">
                <td colspan="2">
                  <div class="net-container">
                    <span>NET TAKE-HOME PAY:</span>
                    <span class="net-amount">PHP ${formatCurrency(net)}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="signatures" style="display: flex; justify-content: space-between; margin-top: 40px;">
            <div class="sig-block" style="width: 45%; text-align: center;">
              <div class="sig-line" style="border-top: 1px solid #000; margin-bottom: 2px;"></div>
              <div style="font-weight: bold; font-family: sans-serif; font-size: 9px;">PREPARED & APPROVED BY:</div>
              <div style="font-size: 8px; color: #555;">${companyConfig.companyName} representative</div>
            </div>
            <div class="sig-block" style="width: 45%; text-align: center;">
              <div class="sig-line" style="border-top: 1px solid #000; margin-bottom: 2px;"></div>
              <div style="font-weight: bold; font-family: sans-serif; font-size: 9px;">RECEIVED BY (EMPLOYEE):</div>
              <div style="font-size: 8px; color: #555;">Signature over printed name & Date</div>
            </div>
          </div>

          <div class="print-date">Printed on ${new Date().toLocaleString()} - Confidentially Secured</div>
        </div>
      `;
    };

    const html = `
      <html>
        <head>
          <title>Payslip - ${ps.name}</title>
          <style>
            @page {
              size: portrait;
              margin: 10mm;
            }
            body {
              font-family: "Courier New", Courier, monospace;
              color: #000;
              background-color: #fff;
              margin: 0;
              padding: 0;
              font-size: 11px;
              line-height: 1.3;
            }
            .payslip-box {
              border: 2px solid #000;
              padding: 15px;
              margin-bottom: 10px;
              box-sizing: border-box;
              background: #fff;
            }
            .payslip-header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
              margin-bottom: 10px;
            }
            .company-name {
              font-family: sans-serif;
              font-size: 18px;
              font-weight: 900;
              letter-spacing: 1.5px;
              margin: 0;
            }
            .doc-title {
              font-size: 11px;
              font-weight: bold;
              margin-top: 3px;
              letter-spacing: 0.5px;
            }
            .meta-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
              font-size: 10px;
            }
            .meta-table td {
              padding: 2px 0;
            }
            .details-table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #000;
              margin-bottom: 12px;
            }
            .details-table th {
              border: 1px solid #000;
              background-color: #f2f2f2;
              font-weight: bold;
              text-align: center;
              padding: 5px;
              font-family: sans-serif;
              font-size: 10px;
            }
            .details-table td.col-val {
              vertical-align: top;
              padding: 8px;
            }
            .row-flex {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .net-row td {
              border-top: 1px solid #000;
              background-color: #f9f9f9;
              padding: 8px;
            }
            .net-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-weight: bold;
              font-family: sans-serif;
              font-size: 12px;
            }
            .net-amount {
              font-size: 15px;
              border-bottom: 4px double #000;
              padding-bottom: 2px;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 30px;
              margin-bottom: 5px;
            }
            .sig-block {
              width: 45%;
              text-align: center;
              font-family: sans-serif;
              font-size: 9px;
              font-weight: bold;
            }
            .sig-line {
              border-bottom: 1px solid #000;
              margin-bottom: 5px;
              height: 25px;
            }
            .cut-line {
              text-align: center;
              margin: 20px 0;
              border-top: 2px dashed #000;
              position: relative;
              font-size: 10px;
              font-weight: bold;
              font-family: sans-serif;
            }
            .cut-label {
              position: absolute;
              top: -8px;
              left: 50%;
              transform: translateX(-50%);
              background-color: #fff;
              padding: 0 10px;
            }
            .print-date {
              text-align: center;
              font-size: 8px;
              color: #666;
              margin-top: 10px;
              border-top: 1px solid #eee;
              padding-top: 3px;
            }
            @media print {
              body {
                background-color: #fff;
              }
              .payslip-box {
                border: 2px solid #000 !important;
              }
            }
          </style>
        </head>
        <body>
          ${renderSinglePayslipHtml('EMPLOYEE COPY')}
          <div class="cut-line">
            <span class="cut-label">✂ SEPARATE AND CUT HERE ✂</span>
          </div>
          ${renderSinglePayslipHtml('EMPLOYER FILE COPY')}
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const printPayrollSheet = (run: PayrollRun) => {
    const sanitizedPayslips = (run.payslips || []).map(p => ({
      ...p,
      basic: parseNum(p.basic),
      ot: parseNum(p.ot),
      holidayPay: parseNum(p.holidayPay),
      allowance: parseNum(p.allowance),
      sss: parseNum(p.sss),
      philHealth: parseNum(p.philHealth),
      pagIbig: parseNum(p.pagIbig),
      vale: parseNum(p.vale),
      lates: parseNum(p.lates),
      tax: parseNum(p.tax),
      net: parseNum(p.net),
    }));

    const totalBasic = sanitizedPayslips.reduce((acc, c) => acc + c.basic, 0);
    const totalOT = sanitizedPayslips.reduce((acc, c) => acc + c.ot, 0);
    const totalHoliday = sanitizedPayslips.reduce((acc, c) => acc + c.holidayPay, 0);
    const totalAllowance = sanitizedPayslips.reduce((acc, c) => acc + c.allowance, 0);
    const totalGross = sanitizedPayslips.reduce((acc, c) => acc + (c.basic + c.ot + c.holidayPay + c.allowance), 0);
    const totalSss = sanitizedPayslips.reduce((acc, c) => acc + c.sss, 0);
    const totalPhil = sanitizedPayslips.reduce((acc, c) => acc + c.philHealth, 0);
    const totalPag = sanitizedPayslips.reduce((acc, c) => acc + c.pagIbig, 0);
    const totalLates = sanitizedPayslips.reduce((acc, c) => acc + (c.lates || 0), 0);
    const totalVale = sanitizedPayslips.reduce((acc, c) => acc + c.vale, 0);
    const totalTax = sanitizedPayslips.reduce((acc, c) => acc + c.tax, 0);
    const totalDeductionsSum = sanitizedPayslips.reduce((acc, c) => acc + (c.sss + c.philHealth + c.pagIbig + (c.lates || 0) + c.vale + c.tax), 0);
    const totalNet = sanitizedPayslips.reduce((acc, c) => acc + c.net, 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocked! Please allow popups to print.', 'error');
      return;
    }

    let rowsHtml = '';
    sanitizedPayslips.forEach((ps, idx) => {
      const gross = ps.basic + ps.ot + ps.holidayPay + ps.allowance;
      const totalDeductions = ps.sss + ps.philHealth + ps.pagIbig + (ps.lates || 0) + ps.vale + ps.tax;
      const net = gross - totalDeductions;

      rowsHtml += `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-family: sans-serif; font-weight: bold;">${ps.name}</td>
          <td style="text-align: center; text-transform: uppercase; font-size: 9px; color: #555;">${ps.employmentStatus || 'Regular'}</td>
          <td style="text-align: right;">${formatCurrency(ps.basic)}</td>
          <td style="text-align: right;">${formatCurrency(ps.ot)}</td>
          <td style="text-align: right;">${formatCurrency(ps.holidayPay)}</td>
          <td style="text-align: right;">${formatCurrency(ps.allowance)}</td>
          <td style="text-align: right; font-weight: bold; background-color: #f8fafc;">${formatCurrency(gross)}</td>
          <td style="text-align: right;">${formatCurrency(ps.sss)}</td>
          <td style="text-align: right;">${formatCurrency(ps.philHealth)}</td>
          <td style="text-align: right;">${formatCurrency(ps.pagIbig)}</td>
          <td style="text-align: right;">${formatCurrency(ps.lates || 0)}</td>
          <td style="text-align: right;">${formatCurrency(ps.vale)}</td>
          <td style="text-align: right; font-weight: bold; background-color: #fffbeb; color: #b45309;">${formatCurrency(totalDeductions)}</td>
          <td style="text-align: right;">${formatCurrency(ps.tax)}</td>
          <td style="text-align: right; font-weight: bold; background-color: #f0fdf4; color: #15803d;">${formatCurrency(net)}</td>
          <td style="border-left: 1px solid #000; width: 100px;"></td>
          <td style="border-left: 1px solid #000; width: 100px;"></td>
        </tr>
      `;
    });

    const html = `
      <html>
        <head>
          <title>${companyConfig.companyName} Payroll Sheet - ${run.periodMonth} ${run.periodYear}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
            body {
              font-family: "Courier New", Courier, monospace;
              color: #000;
              background-color: #fff;
              margin: 0;
              padding: 0;
              font-size: 10px;
              line-height: 1.2;
            }
            .container {
              width: 100%;
              margin: 0 auto;
            }
            .header-table {
              width: 100%;
              margin-bottom: 12px;
              border-collapse: collapse;
            }
            .header-title {
              font-family: sans-serif;
              font-size: 16px;
              font-weight: 800;
              letter-spacing: 1px;
              text-align: center;
              color: #111;
              margin: 0;
            }
            .header-subtitle {
              font-size: 10px;
              text-align: center;
              font-weight: bold;
              margin-top: 2px;
              text-transform: uppercase;
              color: #333;
            }
            .header-note {
              font-size: 8px;
              text-align: center;
              color: #555;
              margin-top: 4px;
              font-style: italic;
            }
            table.payroll-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
            }
            table.payroll-table th {
              color: #fff;
              font-weight: bold;
              border: 1px solid #000;
              padding: 6px 4px;
              text-align: center;
              font-family: sans-serif;
              font-size: 8.5px;
            }
            table.payroll-table th.blue-hdr {
              background-color: #1f4e79;
            }
            table.payroll-table th.red-hdr {
              background-color: #a62c1d;
            }
            table.payroll-table td {
              border: 1px solid #000;
              padding: 5px 4px;
              vertical-align: middle;
            }
            .total-row td {
              font-weight: bold;
              border-top: 2px solid #000;
              border-bottom: 4px double #000;
              background-color: #f1f5f9;
            }
            .sign-offs {
              margin-top: 30px;
              width: 100%;
              border-collapse: collapse;
            }
            .sign-offs td {
              width: 33.33%;
              vertical-align: top;
              padding-right: 20px;
            }
            .sign-line {
              border-top: 1px solid #000;
              margin-top: 45px;
              font-size: 10px;
              font-family: sans-serif;
              font-weight: bold;
              padding-top: 3px;
            }
            .sign-title {
              font-size: 9px;
              color: #444;
              margin-top: 1px;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              table.payroll-table th.blue-hdr {
                background-color: #1f4e79 !important;
                color: #fff !important;
              }
              table.payroll-table th.red-hdr {
                background-color: #a62c1d !important;
                color: #fff !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <table class="header-table">
              <tr>
                <td>
                  <div class="header-title">${companyConfig.companyName.toUpperCase()}</div>
                  <div class="header-subtitle">PAYROLL & TAX SUMMARY SHEET - ${(run.periodMonth || '').toUpperCase()} ${run.periodYear} (${(run.periodType || '').toUpperCase()} PERIOD)</div>
                  <div class="header-note">Employees are minimum wage/below taxable threshold. Allowances are non-taxable. Printed on: ${new Date().toLocaleString()}</div>
                </td>
              </tr>
            </table>

            <table class="payroll-table">
              <thead>
                <tr>
                  <th class="blue-hdr" style="width: 25px;">No.</th>
                  <th class="blue-hdr" style="text-align: left;">Employee Name</th>
                  <th class="blue-hdr" style="width: 70px;">Employment Status</th>
                  <th class="blue-hdr">Basic Salary</th>
                  <th class="blue-hdr">Overtime / Others</th>
                  <th class="blue-hdr">Holiday / Premium Pay</th>
                  <th class="blue-hdr">Food Allowance</th>
                  <th class="blue-hdr">Gross Pay</th>
                  <th class="red-hdr">SSS Deduction</th>
                  <th class="red-hdr">PhilHealth Deduction</th>
                  <th class="red-hdr">Pag-IBIG Deduction</th>
                  <th class="red-hdr">Lates / Absences</th>
                  <th class="red-hdr">Vale / Cash Advance</th>
                  <th class="red-hdr">Total Deductions</th>
                  <th class="red-hdr">Withholding Tax</th>
                  <th class="blue-hdr">NET PAY</th>
                  <th class="blue-hdr" style="width: 100px;">Signature</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr class="total-row">
                  <td colspan="3" style="text-align: center; font-family: sans-serif; font-size: 10px; font-weight: 900;">GRAND TOTALS</td>
                  <td style="text-align: right;">${totalBasic}</td>
                  <td style="text-align: right;">${totalOT}</td>
                  <td style="text-align: right;">${totalHoliday}</td>
                  <td style="text-align: right;">${totalAllowance}</td>
                  <td style="text-align: right;">${totalGross}</td>
                  <td style="text-align: right;">${totalSss}</td>
                  <td style="text-align: right;">${totalPhil}</td>
                  <td style="text-align: right;">${totalPag}</td>
                  <td style="text-align: right;">${totalLates}</td>
                  <td style="text-align: right;">${totalVale}</td>
                  <td style="text-align: right; color: #b45309;">${totalDeductionsSum}</td>
                  <td style="text-align: right;">${totalTax}</td>
                  <td style="text-align: right; color: #15803d;">${totalNet}</td>
                  <td style="border-left: 1px solid #000;"></td>
                </tr>
              </tbody>
            </table>

            
              <table class="sign-offs" style="margin-top: 50px; width: 100%;">
                <tr>
                  <td style="width: 33%; padding-right: 20px;">
                    <div style="border-top: 1px solid #000; padding-top: 5px; font-weight: bold; font-family: sans-serif; font-size: 10px;">PREPARED BY:</div>
                    <div style="font-size: 9px; color: #555;">HR / Payroll Officer</div>
                  </td>
                  <td style="width: 33%; padding-right: 20px;">
                    <div style="border-top: 1px solid #000; padding-top: 5px; font-weight: bold; font-family: sans-serif; font-size: 10px;">CHECKED BY:</div>
                    <div style="font-size: 9px; color: #555;">Finance Manager</div>
                  </td>
                  <td style="width: 33%;">
                    <div style="border-top: 1px solid #000; padding-top: 5px; font-weight: bold; font-family: sans-serif; font-size: 10px;">APPROVED BY:</div>
                    <div style="font-size: 9px; color: #555;">General Manager</div>
                  </td>
                </tr>
              </table>
            </div>
            <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const draftRuns = runs.filter(r => r.status === 'Draft');
  const postedRuns = runs.filter(r => r.status === 'Posted');

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-sans">💵 Automated Payroll Sync Bridge</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Generate payrolls, calculate ER/EE contributions, and auto-sync double-entry ledger impact directly to correct Chart of Accounts.
          </p>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('Runs')} 
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'Runs' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              Active Drafts ({draftRuns.length})
            </button>
            <button 
              onClick={() => setActiveTab('History')} 
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'History' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              Sync History ({postedRuns.length})
            </button>
            <button 
              onClick={() => setActiveTab('13thMonth')} 
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === '13thMonth' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              13th Month Pay
            </button>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 shadow-sm"
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
          <button
            onClick={openGenerator}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Draft Payroll
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Gross Payroll Posted</p>
            <p className="text-lg font-black text-zinc-800 dark:text-zinc-100">
              {formatCurrency(postedRuns.reduce((acc, r) => acc + (r.totalGross || 0), 0))}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Net Salary Distributed</p>
            <p className="text-lg font-black text-emerald-600">
              {formatCurrency(postedRuns.reduce((acc, r) => acc + (r.totalNet || 0), 0))}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-xl">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Statutory Contributions (ER)</p>
            <p className="text-lg font-black text-violet-600">
              {formatCurrency(postedRuns.reduce((acc, r) => {
                const sss = (r.payslips || []).reduce((a, c) => a + (c.sssEr || 0), 0);
                const phil = (r.payslips || []).reduce((a, c) => a + (c.philHealthEr || 0), 0);
                const pag = (r.payslips || []).reduce((a, c) => a + (c.pagIbigEr || 0), 0);
                return acc + sss + phil + pag;
              }, 0))}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Payables Outstanding</p>
            <p className="text-lg font-black text-amber-600">
              {formatCurrency(postedRuns.reduce((acc, r) => {
                const sss = (r.payslips || []).reduce((a, c) => a + (c.sss || 0) + (c.sssEr || 0), 0);
                const phil = (r.payslips || []).reduce((a, c) => a + (c.philHealth || 0) + (c.philHealthEr || 0), 0);
                const pag = (r.payslips || []).reduce((a, c) => a + (c.pagIbig || 0) + (c.pagIbigEr || 0), 0);
                return acc + sss + phil + pag;
              }, 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm overflow-auto">
        {activeTab === 'Runs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Active Draft Runs</h3>
              <span className="text-xs text-zinc-400 font-semibold">{draftRuns.length} pending runs</span>
            </div>

            {draftRuns.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <ShieldAlert className="w-8 h-8 text-zinc-400 mx-auto" />
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No active drafts found</p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">Create a draft to prepare payslips, review contribution rates, and execute the ledger sync bridge.</p>
                <button onClick={openGenerator} className="mt-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold text-xs transition-colors">
                  Create Draft Now
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-850/50 border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Run ID</th>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3 text-right">Gross Payroll</th>
                      <th className="px-4 py-3 text-right">Statutory Deductions</th>
                      <th className="px-4 py-3 text-right">Net Salaries</th>
                      <th className="px-4 py-3 text-center">Bridge Status</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {draftRuns.map(run => (
                      <tr key={run.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                        <td className="px-4 py-4 font-bold text-zinc-900 dark:text-zinc-100">{run.id}</td>
                        <td className="px-4 py-4">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{run.periodMonth} {run.periodYear}</span>
                          <span className="block text-[10px] text-zinc-400 font-bold uppercase mt-0.5">{run.periodType} Period</span>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold">{formatCurrency(run.totalGross || 0)}</td>
                        <td className="px-4 py-4 text-right text-red-500 font-semibold">
                          -{formatCurrency(run.totalDeductions || 0)}
                        </td>
                        <td className="px-4 py-4 text-right font-black text-emerald-600">{formatCurrency(run.totalNet || 0)}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex px-2 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-bold text-[9px] rounded-lg border border-amber-100 dark:border-amber-900/30">
                            Ready to Sync
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => setPreviewRun(run)}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                              title="View Payslips"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setShowLedgerPreview(run)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg"
                              title="Preview Ledger Entry"
                            >
                              <ArrowLeftRight className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => processRun(run.id)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-sm flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Sync Bridge
                            </button>
                            <button 
                              onClick={() => deleteRun(run.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>)}
        {activeTab === 'History' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Synced Payroll Ledger Records</h3>
              <span className="text-xs text-zinc-400 font-semibold">{postedRuns.length} runs posted</span>
            </div>
            {postedRuns.length === 0 ? (
              <div className="py-12 text-center space-y-2 text-zinc-400">
                <Check className="w-8 h-8 text-zinc-300 mx-auto" />
                <p className="text-sm font-semibold">No sync history</p>
                <p className="text-xs">Once a payroll draft is approved and posted, the ledger entries will be archived here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-850/50 border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Run ID</th>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3 text-right">Gross Paid</th>
                      <th className="px-4 py-3 text-right">Total Deductions</th>
                      <th className="px-4 py-3 text-right">Net Disbursed</th>
                      <th className="px-4 py-3 text-center">Sync Date</th>
                      <th className="px-4 py-3 text-center">Chart of Accounts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {postedRuns.map(run => (
                      <tr key={run.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                        <td className="px-4 py-4 font-bold text-zinc-900 dark:text-zinc-100">{run.id}</td>
                        <td className="px-4 py-4">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{run.periodMonth} {run.periodYear}</span>
                          <span className="block text-[10px] text-zinc-400 font-bold uppercase mt-0.5">{run.periodType} Period</span>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold">{formatCurrency(run.totalGross || 0)}</td>
                        <td className="px-4 py-4 text-right text-red-500 font-semibold">-{formatCurrency(run.totalDeductions || 0)}</td>
                        <td className="px-4 py-4 text-right font-black text-emerald-600">{formatCurrency(run.totalNet || 0)}</td>
                        <td className="px-4 py-4 text-center text-zinc-500">{run.date}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => setPreviewRun(run)}
                              className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 font-bold text-[10px] rounded-lg"
                            >
                              Payslips
                            </button>
                            <button 
                              onClick={() => setShowLedgerPreview(run)}
                              className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-400 font-bold text-[10px] rounded-lg flex items-center gap-1"
                            >
                              <ArrowLeftRight className="w-3 h-3" /> Ledger Impact
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GENERATOR MODAL */}
      {isGeneratorOpen && (() => {
        const totalBasic = draftPayslips.reduce((a, c) => a + parseNum(c.basic), 0);
        const totalOT = draftPayslips.reduce((a, c) => a + parseNum(c.ot), 0);
        const totalHoliday = draftPayslips.reduce((a, c) => a + parseNum(c.holidayPay), 0);
        const totalAllowance = draftPayslips.reduce((a, c) => a + parseNum(c.allowance), 0);
        const totalGross = draftPayslips.reduce((a, c) => a + (parseNum(c.basic) + parseNum(c.ot) + parseNum(c.holidayPay) + parseNum(c.allowance)), 0);
        const totalSss = draftPayslips.reduce((a, c) => a + parseNum(c.sss), 0);
        const totalPhil = draftPayslips.reduce((a, c) => a + parseNum(c.philHealth), 0);
        const totalPag = draftPayslips.reduce((a, c) => a + parseNum(c.pagIbig), 0);
        const totalVale = draftPayslips.reduce((a, c) => a + parseNum(c.vale), 0);
        const totalTax = draftPayslips.reduce((a, c) => a + parseNum(c.tax), 0);
        const totalDeductionsSum = draftPayslips.reduce((a, c) => a + (parseNum(c.sss) + parseNum(c.philHealth) + parseNum(c.pagIbig) + parseNum(c.vale) + parseNum(c.tax)), 0);
        const totalNet = draftPayslips.reduce((a, c) => a + parseNum(c.net), 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-7xl max-h-[92vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
              {/* Header inspired by NDC22 Spreadsheet */}
              <div className="bg-[#1B365D] text-white p-6 text-center relative border-b border-[#122540]">
                <h1 className="text-xl font-bold tracking-wider font-sans">{companyConfig.companyName.toUpperCase()} PAYROLL & TAX SUMMARY</h1>
                <p className="text-xs font-semibold tracking-wide text-sky-200 mt-1 uppercase">
                  DRAFT SHEET FOR THE MONTH OF {(draftPeriodMonth || '').toUpperCase()} {draftPeriodYear} 
                  ({draftPeriodType === 'Weekly' ? `${draftWeekNumber.toUpperCase()} (WEEKLY)` : `${(draftPeriodType || '').toUpperCase()} PERIOD`})
                </p>
                <div className="mt-2.5 inline-block bg-sky-900/40 border border-sky-800/30 px-4 py-1 rounded-full text-[10px] text-sky-200">
                  NOTE FOR ACCOUNTANT/AUDITOR: Statutory calculations are fully configured. Type values into cells for manual overrides.
                </div>
                <button 
                  onClick={() => setIsGeneratorOpen(false)} 
                  className="absolute top-6 right-6 px-4 py-1.5 bg-red-600/90 hover:bg-red-700 text-white rounded-lg font-bold text-xs transition-all"
                >
                  Cancel
                </button>
              </div>
              
              {/* Controls Panel */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 flex flex-wrap gap-4 items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-wrap gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-400">Payroll Month</span>
                    <select value={draftPeriodMonth} onChange={e => setDraftPeriodMonth(e.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold">
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-400">Fiscal Year</span>
                    <select value={draftPeriodYear} onChange={e => setDraftPeriodYear(e.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold">
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-400">Period Type</span>
                    <select value={draftPeriodType} onChange={e => setDraftPeriodType(e.target.value as any)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold">
                      <option value="15th">15th (Half-Month)</option>
                      <option value="30th">30th (Half-Month)</option>
                      <option value="Monthly">Monthly (Full)</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                  </div>
                  {draftPeriodType === 'Weekly' && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] uppercase font-bold text-zinc-400">Week Number</span>
                      <select value={draftWeekNumber} onChange={e => setDraftWeekNumber(e.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold">
                        <option value="Week 1">Week 1</option>
                        <option value="Week 2">Week 2</option>
                        <option value="Week 3">Week 3</option>
                        <option value="Week 4">Week 4</option>
                        <option value="Week 5">Week 5</option>
                      </select>
                    </div>
                  )}
                  <div className="flex flex-col justify-center">
                    <label className="flex items-center gap-2 cursor-pointer mt-4">
                      <input 
                        type="checkbox" 
                        checked={applyStatutory} 
                        onChange={e => setApplyStatutory(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded bg-zinc-100 border-zinc-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Deduct SSS/PhilHealth/Pag-IBIG</span>
                    </label>
                  </div>
                  {applyStatutory && (
                    <div className="mt-2 text-[10px] text-zinc-500 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded inline-block">
                      Statutory Schedule: {payrollSettings.statutorySchedule || 'Half-Half'}
                    </div>
                  )}
                </div>
                <div className="text-right text-[11px] text-zinc-500 font-medium">
                  💡 Type directly in any cell to update the spreadsheet. Calculations adjust in real-time.
                </div>
              </div>

              {/* Spreadsheet Grid */}
              <div className="flex-1 overflow-auto p-4 bg-zinc-100/50 dark:bg-zinc-900/20">
                <div className="border border-zinc-300 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm bg-white dark:bg-zinc-900 min-w-max">
                  <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
                    <thead>
                      <tr className="text-white font-bold text-center border-b border-zinc-300 dark:border-zinc-800 divide-x divide-zinc-300/40">
                        <th className="px-2 py-3 w-10 bg-[#1f4e79]">No.</th>
                        <th className="px-3 py-3 text-left w-48 bg-[#1f4e79]">Employee Name</th>
                        <th className="px-2 py-3 w-28 bg-[#1f4e79]">Employment Status</th>
                        <th className="px-3 py-3 text-right bg-[#1f4e79]">Basic Salary</th>
                        <th className="px-3 py-3 text-right bg-[#1f4e79]">Overtime / Others</th>
                        <th className="px-3 py-3 text-right bg-[#1f4e79]">Holiday / Premium Pay</th>
                        <th className="px-3 py-3 text-right bg-[#1f4e79]">Food Allowance</th>
                        <th className="px-3 py-3 text-right bg-[#1f4e79] font-black">Gross Pay</th>
                        <th className="px-3 py-3 text-right bg-[#a62c1d]">SSS Deduction</th>
                        <th className="px-3 py-3 text-right bg-[#a62c1d]">PhilHealth Deduction</th>
                        <th className="px-3 py-3 text-right bg-[#a62c1d]">Pag-IBIG Deduction</th>
                        <th className="px-3 py-3 text-center bg-[#a62c1d]">Late Hrs</th>
                        <th className="px-3 py-3 text-right bg-[#a62c1d]">Lates & Absences</th>
                        <th className="px-3 py-3 text-right bg-[#a62c1d]">Vale / Cash Advance</th>
                        <th className="px-3 py-3 text-right bg-[#a62c1d] font-black">Total Deductions</th>
                        <th className="px-3 py-3 text-right bg-[#a62c1d]">Withholding Tax</th>
                        <th className="px-3 py-3 text-right bg-[#1f4e79] font-black">NET PAY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                      {draftPayslips.map((ps, idx) => {
                        const gross = ps.basic + ps.ot + (ps.holidayPay || 0) + ps.allowance;
                        const totalDeductions = ps.sss + ps.philHealth + ps.pagIbig + (ps.lates || 0) + ps.vale + ps.tax;
                        const net = gross - totalDeductions;
                        
                        return (
                          <tr key={ps.employeeId} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/10 divide-x divide-zinc-200 dark:divide-zinc-800 transition-colors">
                            <td className="px-2 py-2 text-center text-zinc-400 font-bold bg-zinc-50 dark:bg-zinc-950/20">{idx + 1}</td>
                            <td className="px-3 py-2 text-left font-sans font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-50/30 dark:bg-zinc-950/10">{ps.name}</td>
                            <td className="px-2 py-2 text-center bg-zinc-50/20">
                              <select 
                                value={ps.employmentStatus || 'Regular'} 
                                onChange={e => updateDraftPayslip(ps.employeeId, 'employmentStatus', e.target.value)}
                                className="bg-transparent text-center font-semibold text-zinc-700 dark:text-zinc-300 w-full text-[10px] uppercase outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 cursor-pointer"
                              >
                                <option value="Regular">Regular</option>
                                <option value="Casual">Casual</option>
                              </select>
                            </td>
                            <td className="px-1 py-1">
                              <div className="flex justify-center items-center gap-1 text-[10px]">
                                <input 
                                  type="number" 
                                  value={ps.rateType === 'Hourly' ? (ps.hoursWorked === 0 ? '' : ps.hoursWorked) : (ps.daysWorked === 0 ? '' : ps.daysWorked)} 
                                  onChange={e => updateDraftPayslip(ps.employeeId, ps.rateType === 'Hourly' ? 'hoursWorked' : 'daysWorked', parseNum(e.target.value))} 
                                  placeholder="0"
                                  className="w-10 text-center bg-transparent border-b border-zinc-300 dark:border-zinc-700 outline-none"
                                />
                                <span className="text-zinc-400">{ps.rateType === 'Hourly' ? 'hrs' : 'days'}</span>
                              </div>
                            </td>
                            <td className="px-1 py-1">
                              <input 
                                type="number" 
                                value={ps.basic === 0 ? '' : ps.basic} 
                                onChange={e => updateDraftPayslip(ps.employeeId, 'basic', parseNum(e.target.value))} 
                                placeholder="0.00"
                                className="w-full text-right bg-transparent focus:bg-zinc-50 dark:focus:bg-zinc-800 rounded px-1.5 py-0.5 outline-none font-bold text-zinc-800 dark:text-zinc-100"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <div className="flex justify-center items-center gap-1 text-[10px]">
                                <input 
                                  type="number" 
                                  value={ps.otHours === 0 ? '' : ps.otHours} 
                                  onChange={e => updateDraftPayslip(ps.employeeId, 'otHours', parseNum(e.target.value))} 
                                  placeholder="0"
                                  className="w-8 text-center bg-transparent border-b border-zinc-300 dark:border-zinc-700 outline-none"
                                />
                                <span className="text-zinc-400">hrs</span>
                              </div>
                            </td>
                            <td className="px-1 py-1">
                              <input 
                                type="number" 
                                value={ps.ot === 0 ? '' : ps.ot} 
                                onChange={e => updateDraftPayslip(ps.employeeId, 'ot', parseNum(e.target.value))} 
                                placeholder="0.00"
                                className="w-full text-right bg-transparent focus:bg-zinc-50 dark:focus:bg-zinc-800 rounded px-1.5 py-0.5 outline-none font-bold text-zinc-800 dark:text-zinc-100 text-emerald-600 dark:text-emerald-400"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <input 
                                type="number" 
                                value={ps.holidayPay === 0 ? '' : ps.holidayPay} 
                                onChange={e => updateDraftPayslip(ps.employeeId, 'holidayPay', parseNum(e.target.value))} 
                                placeholder="0.00"
                                className="w-full text-right bg-transparent focus:bg-zinc-50 dark:focus:bg-zinc-800 rounded px-1.5 py-0.5 outline-none font-bold text-zinc-800 dark:text-zinc-100 text-emerald-600 dark:text-emerald-400"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <input 
                                type="number" 
                                value={ps.allowance === 0 ? '' : ps.allowance} 
                                onChange={e => updateDraftPayslip(ps.employeeId, 'allowance', parseNum(e.target.value))} 
                                placeholder="0.00"
                                className="w-full text-right bg-transparent focus:bg-zinc-50 dark:focus:bg-zinc-800 rounded px-1.5 py-0.5 outline-none font-bold text-zinc-800 dark:text-zinc-100 text-emerald-600 dark:text-emerald-400"
                              />
                            </td>
                            <td className="px-3 py-2 text-right bg-[#152e52]/10 font-bold text-zinc-900 dark:text-zinc-100">
                              {gross}
                            </td>
                            <td className="px-1 py-1 bg-[#591d1d]/5">
                              <input 
                                type="number" 
                                value={ps.sss === 0 ? '' : ps.sss} 
                                onChange={e => updateDraftPayslip(ps.employeeId, 'sss', parseNum(e.target.value))} 
                                placeholder="0.00"
                                className="w-full text-right bg-transparent focus:bg-zinc-50 dark:focus:bg-zinc-800 rounded px-1.5 py-0.5 outline-none font-bold text-rose-600 dark:text-rose-400"
                              />
                            </td>
                            <td className="px-1 py-1 bg-[#591d1d]/5">
                              <input 
                                type="number" 
                                value={ps.philHealth === 0 ? '' : ps.philHealth} 
                                onChange={e => updateDraftPayslip(ps.employeeId, 'philHealth', parseNum(e.target.value))} 
                                placeholder="0.00"
                                className="w-full text-right bg-transparent focus:bg-zinc-50 dark:focus:bg-zinc-800 rounded px-1.5 py-0.5 outline-none font-bold text-rose-600 dark:text-rose-400"
                              />
                            </td>
                            <td className="px-1 py-1 bg-[#591d1d]/5">
                              <input 
                                type="number" 
                                value={ps.pagIbig === 0 ? '' : ps.pagIbig} 
                                onChange={e => updateDraftPayslip(ps.employeeId, 'pagIbig', parseNum(e.target.value))} 
                                placeholder="0.00"
                                className="w-full text-right bg-transparent focus:bg-zinc-50 dark:focus:bg-zinc-800 rounded px-1.5 py-0.5 outline-none font-bold text-rose-600 dark:text-rose-400"
                              />
                            </td>
                            <td className="px-1 py-1 bg-[#591d1d]/5">
                              <input 
                                type="number" 
                                value={ps.vale === 0 ? '' : ps.vale} 
                                onChange={e => updateDraftPayslip(ps.employeeId, 'vale', parseNum(e.target.value))} 
                                placeholder="0.00"
                                className="w-full text-right bg-transparent focus:bg-zinc-50 dark:focus:bg-zinc-800 rounded px-1.5 py-0.5 outline-none font-bold text-rose-600 dark:text-rose-400"
                              />
                            </td>
                            <td className="px-3 py-2 text-right bg-[#421515]/10 font-bold text-rose-600 dark:text-rose-400">
                              {totalDeductions}
                            </td>
                            <td className="px-1 py-1 bg-[#591d1d]/5">
                              <input 
                                type="number" 
                                value={ps.tax === 0 ? '' : ps.tax} 
                                onChange={e => updateDraftPayslip(ps.employeeId, 'tax', parseNum(e.target.value))} 
                                placeholder="0.00"
                                className="w-full text-right bg-transparent focus:bg-zinc-50 dark:focus:bg-zinc-800 rounded px-1.5 py-0.5 outline-none font-bold text-rose-600 dark:text-rose-400"
                              />
                            </td>
                            <td className="px-3 py-2 text-right bg-emerald-500/10 font-black text-emerald-600 dark:text-emerald-400">
                              {net}
                            </td>
                          </tr>
                        );
                      })}
                      
                      {/* Spreadsheet totals row */}
                      <tr className="bg-zinc-50 dark:bg-zinc-950/70 divide-x divide-zinc-200 dark:divide-zinc-800 font-bold text-zinc-900 dark:text-zinc-100 border-t-2 border-zinc-400 dark:border-zinc-700">
                        <td colSpan={3} className="px-4 py-3 text-center font-sans uppercase font-black tracking-wider text-xs bg-zinc-100 dark:bg-zinc-950">TOTALS</td>
                        <td className="px-3 py-3 text-right text-xs font-black">{totalBasic}</td>
                        <td className="px-3 py-3 text-right text-xs font-black text-emerald-600">{totalOT}</td>
                        <td className="px-3 py-3 text-right text-xs font-black text-emerald-600">{totalHoliday}</td>
                        <td className="px-3 py-3 text-right text-xs font-black text-emerald-600">{totalAllowance}</td>
                        <td className="px-3 py-3 text-right text-xs font-black bg-[#152e52]/10 text-[#1B365D] dark:text-sky-300">{totalGross}</td>
                        <td className="px-3 py-3 text-right text-xs font-black text-rose-600 bg-[#591d1d]/5">{totalSss}</td>
                        <td className="px-3 py-3 text-right text-xs font-black text-rose-600 bg-[#591d1d]/5">{totalPhil}</td>
                        <td className="px-3 py-3 text-right text-xs font-black text-rose-600 bg-[#591d1d]/5">{totalPag}</td>
                        <td className="px-3 py-3 text-right text-xs font-black text-rose-600 bg-[#591d1d]/5">{totalVale}</td>
                        <td className="px-3 py-3 text-right text-xs font-black bg-[#421515]/10 text-rose-600">{totalDeductionsSum}</td>
                        <td className="px-3 py-3 text-right text-xs font-black text-rose-600 bg-[#591d1d]/5">{totalTax}</td>
                        <td className="px-3 py-3 text-right text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{totalNet}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Panel */}
              <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Gross Payroll Expense</p>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{formatCurrency(totalGross)}</p>
                  </div>
                  <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" />
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Total Net Take-Home</p>
                    <p className="text-xl font-black text-emerald-600">{formatCurrency(totalNet)}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsGeneratorOpen(false)} 
                    className="px-5 py-2.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold text-xs transition-colors"
                  >
                    Discard Draft
                  </button>
                  <button 
                    onClick={() => printPayrollSheet({
                      id: 'draft',
                      date: new Date().toISOString().slice(0, 10),
                      periodMonth: draftPeriodMonth,
                      periodYear: draftPeriodYear,
                      periodType: draftPeriodType,
                      payslips: draftPayslips,
                      totalBasic: totalBasic,
                      totalGross: totalGross,
                      totalDeductions: totalDeductionsSum,
                      totalNet: totalNet,
                      status: 'Draft'
                    })}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-blue-600/10"
                  >
                    <Printer className="w-4 h-4" /> Print Draft Sheet
                  </button>
                  <button 
                    onClick={saveDraftRun} 
                    className="px-8 py-2.5 bg-[#1B365D] hover:bg-[#152e52] text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-900/15 flex items-center gap-2 transition-all"
                  >
                    <CheckCircle className="w-4 h-4" /> Save & Lock Payroll Run Draft
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* VIEW PAYSLIPS DETAIL MODAL */}
      {previewRun && (() => {
        const sanitizedPayslips = (previewRun.payslips || []).map(p => ({
          ...p,
          basic: parseNum(p.basic),
          ot: parseNum(p.ot),
          holidayPay: parseNum(p.holidayPay),
          allowance: parseNum(p.allowance),
          sss: parseNum(p.sss),
          philHealth: parseNum(p.philHealth),
          pagIbig: parseNum(p.pagIbig),
          vale: parseNum(p.vale),
          lates: parseNum(p.lates),
      tax: parseNum(p.tax),
          net: parseNum(p.net),
        }));

        const totalBasic = sanitizedPayslips.reduce((a, c) => a + c.basic, 0);
        const totalOT = sanitizedPayslips.reduce((a, c) => a + c.ot, 0);
        const totalHoliday = sanitizedPayslips.reduce((a, c) => a + c.holidayPay, 0);
        const totalAllowance = sanitizedPayslips.reduce((a, c) => a + c.allowance, 0);
        const totalGross = sanitizedPayslips.reduce((a, c) => a + (c.basic + c.ot + c.holidayPay + c.allowance), 0);
        const totalSss = sanitizedPayslips.reduce((a, c) => a + c.sss, 0);
        const totalPhil = sanitizedPayslips.reduce((a, c) => a + c.philHealth, 0);
        const totalPag = sanitizedPayslips.reduce((a, c) => a + c.pagIbig, 0);
        const totalVale = sanitizedPayslips.reduce((a, c) => a + c.vale, 0);
        const totalTax = sanitizedPayslips.reduce((a, c) => a + c.tax, 0);
        const totalDeductionsSum = sanitizedPayslips.reduce((a, c) => a + (c.sss + c.philHealth + c.pagIbig + c.vale + c.tax), 0);
        const totalNet = sanitizedPayslips.reduce((a, c) => a + c.net, 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-7xl max-h-[92vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
              {/* Header inspired by NDC22 Spreadsheet */}
              <div className="bg-[#1B365D] text-white p-6 text-center relative border-b border-[#122540]">
                <h1 className="text-xl font-bold tracking-wider font-sans">{companyConfig.companyName.toUpperCase()} PAYROLL & TAX SUMMARY</h1>
                <p className="text-xs font-semibold tracking-wide text-sky-200 mt-1 uppercase">FINALIZED RUN FOR THE MONTH OF {(previewRun.periodMonth || '').toUpperCase()} {previewRun.periodYear} ({(previewRun.periodType || '').toUpperCase()} PERIOD)</p>
                <div className="mt-2.5 inline-block bg-sky-900/40 border border-sky-800/30 px-4 py-1 rounded-full text-[10px] text-sky-200">
                  STATUS: {(previewRun.status || '').toUpperCase()} | TOTAL EMPLOYEES: {previewRun.payslips.length}
                </div>
                <button 
                  onClick={() => setPreviewRun(null)} 
                  className="absolute top-6 right-6 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-xs transition-all"
                >
                  Close
                </button>
              </div>

              {/* View Selector Controls */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row gap-4 justify-between items-center border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-xl">
                  <button 
                    onClick={() => setPreviewTab('Sheet')} 
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${previewTab === 'Sheet' ? 'bg-[#1B365D] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                  >
                    📊 Spreadsheet Grid View
                  </button>
                  <button 
                    onClick={() => setPreviewTab('Payslips')} 
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${previewTab === 'Payslips' ? 'bg-[#1B365D] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                  >
                    🎫 Downloadable Payslips ({previewRun.payslips.length})
                  </button>
                </div>

                {previewTab === 'Sheet' && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => downloadPayrollCSV(previewRun)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/10"
                    >
                      <FileText className="w-4 h-4" /> Export Spreadsheet (CSV)
                    </button>
                    <button 
                      onClick={() => printPayrollSheet(previewRun)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-600/10"
                    >
                      <Printer className="w-4 h-4" /> Print Payroll Sheet
                    </button>
                  </div>
                )}
                {previewTab === 'Payslips' && (
                  <div className="text-right text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                    👉 Click any card's button below to print or download as document
                  </div>
                )}
              </div>

              {/* Dynamic Content Area */}
              <div className="flex-1 overflow-auto p-6 bg-zinc-100/30 dark:bg-zinc-950/20">
                {previewTab === 'Sheet' ? (
                  <div className="border border-zinc-300 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-zinc-900 min-w-max">
                    <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
                      <thead>
                        <tr className="text-white font-bold text-center border-b border-zinc-300 dark:border-zinc-800 divide-x divide-zinc-300/40">
                          <th className="px-2 py-3 w-10 bg-[#1f4e79]">No.</th>
                          <th className="px-3 py-3 text-left w-48 bg-[#1f4e79]">Employee Name</th>
                          <th className="px-2 py-3 w-28 bg-[#1f4e79]">Employment Status</th>
                          <th className="px-3 py-3 text-right bg-[#1f4e79]">Basic Salary</th>
                          <th className="px-3 py-3 text-right bg-[#1f4e79]">Overtime / Others</th>
                          <th className="px-3 py-3 text-right bg-[#1f4e79]">Holiday / Premium Pay</th>
                          <th className="px-3 py-3 text-right bg-[#1f4e79]">Food Allowance</th>
                          <th className="px-3 py-3 text-right bg-[#1f4e79] font-black">Gross Pay</th>
                          <th className="px-3 py-3 text-right bg-[#a62c1d]">SSS Deduction</th>
                          <th className="px-3 py-3 text-right bg-[#a62c1d]">PhilHealth Deduction</th>
                          <th className="px-3 py-3 text-right bg-[#a62c1d]">Pag-IBIG Deduction</th>
                          <th className="px-3 py-3 text-right bg-[#a62c1d]">Vale / Cash Advance</th>
                          <th className="px-3 py-3 text-right bg-[#a62c1d] font-black">Total Deductions</th>
                          <th className="px-3 py-3 text-right bg-[#a62c1d]">Withholding Tax</th>
                          <th className="px-3 py-3 text-right bg-[#1f4e79] font-black">NET PAY</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                        {sanitizedPayslips.map((ps, idx) => {
                          const gross = ps.basic + ps.ot + ps.holidayPay + ps.allowance;
                          const totalDeductions = ps.sss + ps.philHealth + ps.pagIbig + (ps.lates || 0) + ps.vale + ps.tax;
                          const net = gross - totalDeductions;
                          
                          return (
                            <tr key={ps.employeeId} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/10 divide-x divide-zinc-200 dark:divide-zinc-800 transition-colors">
                              <td className="px-2 py-2 text-center text-zinc-400 font-bold bg-zinc-50 dark:bg-zinc-950/20">{idx + 1}</td>
                              <td className="px-3 py-2 text-left font-sans font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-50/30 dark:bg-zinc-950/10">{ps.name}</td>
                              <td className="px-2 py-2 text-center bg-zinc-50/20 uppercase font-bold text-[9px] text-zinc-500">
                                {ps.employmentStatus || 'Regular'}
                              </td>
                              <td className="px-3 py-2 text-right">{formatCurrency(ps.basic)}</td>
                              <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(ps.ot)}</td>
                              <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(ps.holidayPay)}</td>
                              <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(ps.allowance)}</td>
                              <td className="px-3 py-2 text-right bg-[#152e52]/10 font-bold text-zinc-900 dark:text-zinc-100">
                                {gross}
                              </td>
                              <td className="px-3 py-2 text-right text-rose-600 bg-[#591d1d]/5">{formatCurrency(ps.sss)}</td>
                              <td className="px-3 py-2 text-right text-rose-600 bg-[#591d1d]/5">{formatCurrency(ps.philHealth)}</td>
                              <td className="px-3 py-2 text-right text-rose-600 bg-[#591d1d]/5">{formatCurrency(ps.pagIbig)}</td>
                              <td className="px-3 py-2 text-right text-rose-600 bg-[#591d1d]/5">{formatCurrency(ps.vale)}</td>
                              <td className="px-3 py-2 text-right bg-[#421515]/10 font-bold text-rose-600 dark:text-rose-400">
                                {totalDeductions}
                              </td>
                              <td className="px-3 py-2 text-right text-rose-600 bg-[#591d1d]/5">{formatCurrency(ps.tax)}</td>
                              <td className="px-3 py-2 text-right bg-emerald-500/10 font-black text-emerald-600 dark:text-emerald-400">
                                {net}
                              </td>
                            </tr>
                          );
                        })}
                        
                        {/* Totals row */}
                        <tr className="bg-zinc-50 dark:bg-zinc-950/70 divide-x divide-zinc-200 dark:divide-zinc-800 font-bold text-zinc-900 dark:text-zinc-100 border-t-2 border-zinc-400 dark:border-zinc-700">
                          <td colSpan={3} className="px-4 py-3 text-center font-sans uppercase font-black tracking-wider text-xs bg-zinc-100 dark:bg-zinc-950">TOTALS</td>
                          <td className="px-3 py-3 text-right text-xs font-black">{totalBasic}</td>
                          <td className="px-3 py-3 text-right text-xs font-black text-emerald-600">{totalOT}</td>
                          <td className="px-3 py-3 text-right text-xs font-black text-emerald-600">{totalHoliday}</td>
                          <td className="px-3 py-3 text-right text-xs font-black text-emerald-600">{totalAllowance}</td>
                          <td className="px-3 py-3 text-right text-xs font-black bg-[#152e52]/10 text-[#1B365D] dark:text-sky-300">{totalGross}</td>
                          <td className="px-3 py-3 text-right text-xs font-black text-rose-600 bg-[#591d1d]/5">{totalSss}</td>
                          <td className="px-3 py-3 text-right text-xs font-black text-rose-600 bg-[#591d1d]/5">{totalPhil}</td>
                          <td className="px-3 py-3 text-right text-xs font-black text-rose-600 bg-[#591d1d]/5">{totalPag}</td>
                          <td className="px-3 py-3 text-right text-xs font-black text-rose-600 bg-[#591d1d]/5">{totalVale}</td>
                          <td className="px-3 py-3 text-right text-xs font-black bg-[#421515]/10 text-rose-600">{totalDeductionsSum}</td>
                          <td className="px-3 py-3 text-right text-xs font-black text-rose-600 bg-[#591d1d]/5">{totalTax}</td>
                          <td className="px-3 py-3 text-right text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{totalNet}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sanitizedPayslips.map(ps => {
                      const gross = ps.basic + ps.ot + ps.holidayPay + ps.allowance;
                      const totalDeductions = ps.sss + ps.philHealth + ps.pagIbig + (ps.lates || 0) + ps.vale + ps.tax;
                      const net = gross - totalDeductions;

                      return (
                        <div key={ps.employeeId} className="border-2 border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                          <div>
                            {/* Company Header */}
                            <div className="text-center border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">
                              <h3 className="font-bold text-xs tracking-widest text-[#1B365D] dark:text-sky-300">{companyConfig.companyName.toUpperCase()}</h3>
                              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Payslip Voucher</p>
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-y-1.5 text-xs pb-3 border-b border-dashed border-zinc-200 dark:border-zinc-800 mb-3 text-zinc-600 dark:text-zinc-400 font-medium">
                              <div>Employee Name: <span className="font-bold text-zinc-900 dark:text-zinc-100">{ps.name}</span></div>
                              <div className="text-right">Employee ID: <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{ps.employeeId}</span></div>
                              <div>Status: <span className="font-bold text-[#1B365D] dark:text-sky-400 uppercase text-[10px]">{ps.employmentStatus || 'Regular'}</span></div>
                              <div className="text-right">Period: <span className="font-bold text-zinc-900 dark:text-zinc-100">{previewRun.periodMonth} {previewRun.periodYear} ({previewRun.periodType})</span></div>
                            </div>

                            {/* Ledger lines break-up */}
                            <div className="grid grid-cols-2 gap-x-6 text-[11px] font-mono">
                              {/* Earnings column */}
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 pb-0.5 uppercase mb-1.5">Earnings</div>
                                <div className="flex justify-between">
                                  <span>Basic Salary<span className="block text-[8px] text-zinc-400">({ps.rateType === 'Hourly' ? (ps.hoursWorked || 0) + ' hrs @ ' + (ps.hourlyRate || 0) : (ps.daysWorked || 0) + ' days @ ' + (ps.dailyRate || 0)})</span></span>
                                  <span>{formatCurrency(ps.basic)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Overtime / OT<span className="block text-[8px] text-zinc-400">({ps.otHours || 0} hrs)</span></span>
                                  <span>{formatCurrency(ps.ot)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Holiday Pay</span>
                                  <span>{formatCurrency(ps.holidayPay)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Allowance</span>
                                  <span>{formatCurrency(ps.allowance)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-zinc-950 dark:text-zinc-100 border-t border-zinc-100 dark:border-zinc-800 pt-1.5 mt-1">
                                  <span>GROSS PAY</span>
                                  <span>{formatCurrency(gross)}</span>
                                </div>
                              </div>

                              {/* Deductions column */}
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-rose-400 border-b border-rose-100/10 pb-0.5 uppercase mb-1.5">Deductions</div>
                                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                                  <span>SSS Contribution</span>
                                  <span>{formatCurrency(ps.sss)}</span>
                                </div>
                                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                                  <span>PhilHealth</span>
                                  <span>{formatCurrency(ps.philHealth)}</span>
                                </div>
                                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                                  <span>Pag-IBIG</span>
                                  <span>{formatCurrency(ps.pagIbig)}</span>
                                </div>
                                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                                  <span>Vale Adv.</span>
                                  <span>{formatCurrency(ps.vale)}</span>
                                </div>
                                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                                  <span>Withholding Tax</span>
                                  <span>{formatCurrency(ps.tax)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-rose-700 dark:text-rose-300 border-t border-rose-100/10 pt-1.5 mt-1">
                                  <span>TOTAL DED.</span>
                                  <span>{formatCurrency(totalDeductions)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Net pay highlight */}
                            <div className="mt-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-xl flex justify-between items-center">
                              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Net Take-Home Pay</span>
                              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">PHP {net}</span>
                            </div>
                          </div>

                          {/* Individual Download Actions */}
                          <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => downloadIndividualPayslipText(ps, previewRun)}
                              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> Plain-text (.txt)
                            </button>
                            <button 
                              onClick={() => printPayslip(ps, previewRun)}
                              className="px-3 py-1.5 bg-[#1B365D] hover:bg-[#152e52] text-white text-[10px] font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1 shadow-md shadow-blue-900/10"
                            >
                              <CheckCircle className="w-3 h-3" /> Print / PDF Voucher
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* LEDGER IMPACT / DOUBLE-ENTRY PREVIEW OVERLAY */}
      

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-zinc-500" /> Payroll Settings
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Overtime Rate Multiplier</label>
                <div className="relative">
                  <input 
                    type="number"
                    step="0.01"
                    value={payrollSettings.otRate}
                    onChange={e => setPayrollSettings({...payrollSettings, otRate: Number(e.target.value)})}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">x</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Standard rate is 1.25 (125% of hourly rate).</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Late Deduction Rate (Per Hour)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">PHP</span>
                  <input 
                    type="number"
                    step="0.01"
                    value={payrollSettings.lateRateValue}
                    onChange={e => setPayrollSettings({...payrollSettings, lateRateValue: Number(e.target.value)})}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Fixed amount deducted per hour of tardiness.</p>
              </div>
              
              
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Statutory Deduction Schedule (SSS, PhilHealth, Pag-IBIG)</label>
                <select 
                  value={payrollSettings.statutorySchedule || 'Divided'}
                  onChange={e => setPayrollSettings({...payrollSettings, statutorySchedule: e.target.value})}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Divided">Divided (Deducted every payroll run)</option>
                  <option value="First Period">Once a Month (First period of the month - 15th / Week 1)</option>
                  <option value="Last Period">Once a Month (Last period of the month - 30th / Week 4)</option>
                </select>
                <p className="text-[10px] text-zinc-500 mt-1">Choose when to deduct government contributions for semi-monthly and weekly payrolls.</p>
              </div>
              
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                <button
                  onClick={() => {
                    localStorage.setItem('stratify_payroll_settings', JSON.stringify(payrollSettings));
                    setIsSettingsOpen(false);
                    showToast('Settings saved successfully.', 'success');
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/20"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLedgerPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Chart of Accounts Ledger Impact</h2>
                  <p className="text-xs text-zinc-500">Double-entry journal visualization for Payroll Run {showLedgerPreview.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLedgerPreview(null)} 
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-auto">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 p-4 rounded-2xl mb-6 text-xs text-blue-800 dark:text-blue-400">
                <strong>Bridge Mechanism:</strong> Posting this run decodes employee files to debit salaries and contributions to 
                appropriate expense codes (`6010` - `6013`), crediting the respective liability accounts (`2030` SSS, `2040` Philhealth, `2050` Pagibig Payable) 
                and updating cash balances (`1010`) instantly in a balanced format.
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-850/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
                    <th className="px-4 py-2.5">Code</th>
                    <th className="px-4 py-2.5">Account Title</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5 text-right">Debit (PHP)</th>
                    <th className="px-4 py-2.5 text-right">Credit (PHP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
                  {getLedgerLines(showLedgerPreview).map((line, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                      <td className="px-4 py-3 font-bold text-zinc-700 dark:text-zinc-300">{line.code}</td>
                      <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                        {line.credit > 0 ? <span className="pl-6">{line.title}</span> : line.title}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{line.type}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600">
                        {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">
                        {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 dark:bg-zinc-950 font-bold border-t-2 border-zinc-200 dark:border-zinc-700">
                    <td colSpan={3} className="px-4 py-4 text-left font-sans font-black text-zinc-900 dark:text-zinc-100">
                      Total Ledger Postings (Balanced)
                    </td>
                    <td className="px-4 py-4 text-right font-black text-blue-600">
                      {formatCurrency(getLedgerLines(showLedgerPreview).reduce((a, c) => a + c.debit, 0))}
                    </td>
                    <td className="px-4 py-4 text-right font-black text-emerald-600">
                      {formatCurrency(getLedgerLines(showLedgerPreview).reduce((a, c) => a + c.credit, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>

              {showLedgerPreview.status === 'Draft' && (
                <div className="mt-6 flex justify-end gap-3">
                  <button 
                    onClick={() => setShowLedgerPreview(null)}
                    className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-350 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      processRun(showLedgerPreview.id);
                      setShowLedgerPreview(null);
                    }}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Post Entries to General Ledger
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollModule;
