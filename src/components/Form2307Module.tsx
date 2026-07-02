import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, RefreshCw, Plus, Trash2, FileSpreadsheet } from 'lucide-react';

interface Form2307ModuleProps {
  isAdmin?: boolean;
}

export const Form2307Module: React.FC<Form2307ModuleProps> = ({ isAdmin = false }) => {
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  const [payee, setPayee] = useState({ tin: '', name: '', address: '', zip: '' });
  const [payor, setPayor] = useState({ tin: '', name: '', address: '', zip: '' });

  const [transactions, setTransactions] = useState<any[]>([
    { atc: '', m1: '', m2: '', m3: '', rate: '' }
  ]);

  const addTransaction = () => {
    setTransactions([...transactions, { atc: '', m1: '', m2: '', m3: '', rate: '' }]);
  };

  const updateTransaction = (index: number, field: string, value: string) => {
    const newTrans = [...transactions];
    newTrans[index][field] = value;
    setTransactions(newTrans);
  };

  const removeTransaction = (index: number) => {
    const newTrans = [...transactions];
    newTrans.splice(index, 1);
    if (newTrans.length === 0) {
      newTrans.push({ atc: '', m1: '', m2: '', m3: '', rate: '' });
    }
    setTransactions(newTrans);
  };

  const handleClear = () => {
    setPeriodFrom('');
    setPeriodTo('');
    setPayee({ tin: '', name: '', address: '', zip: '' });
    setPayor({ tin: '', name: '', address: '', zip: '' });
    setTransactions([{ atc: '', m1: '', m2: '', m3: '', rate: '' }]);
  };

  const generateExcel = () => {
    const wb = XLSX.utils.book_new();

    const wsData = [
      ["BIR FORM 2307 - Certificate of Creditable Tax Withheld at Source"],
      [],
      ["For the Period From:", periodFrom, "To:", periodTo],
      [],
      ["PART I - PAYEE INFORMATION"],
      ["TIN:", payee.tin],
      ["Name:", payee.name],
      ["Address:", payee.address],
      ["ZIP Code:", payee.zip],
      [],
      ["PART II - PAYOR INFORMATION"],
      ["TIN:", payor.tin],
      ["Name:", payor.name],
      ["Address:", payor.address],
      ["ZIP Code:", payor.zip],
      [],
      ["PART III - DETAILS OF MONTHLY INCOME PAYMENTS AND TAXES WITHHELD"],
      ["ATC", "1st Month Amount", "2nd Month Amount", "3rd Month Amount", "Total Amount", "Tax Rate (%)", "Tax Withheld"]
    ];

    let totalTax = 0;
    transactions.forEach(t => {
      const m1 = parseFloat(t.m1) || 0;
      const m2 = parseFloat(t.m2) || 0;
      const m3 = parseFloat(t.m3) || 0;
      const rate = parseFloat(t.rate) || 0;
      const totalAmount = m1 + m2 + m3;
      const taxWithheld = totalAmount * (rate / 100);
      totalTax += taxWithheld;
      
      wsData.push([
        t.atc,
        m1,
        m2,
        m3,
        totalAmount,
        rate,
        taxWithheld
      ]);
    });

    wsData.push([]);
    wsData.push(["", "", "", "", "TOTAL TAX WITHHELD:", "", totalTax]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "BIR_2307");

    const fileName = `BIR_2307_${payee.name || 'Payee'}_${periodFrom || 'Period'}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    // Auto-clear after generating
    handleClear();
  };

  const calculateTotal = (t: any) => {
    const m1 = parseFloat(t.m1) || 0;
    const m2 = parseFloat(t.m2) || 0;
    const m3 = parseFloat(t.m3) || 0;
    return m1 + m2 + m3;
  };

  const calculateTax = (t: any) => {
    const total = calculateTotal(t);
    const rate = parseFloat(t.rate) || 0;
    return total * (rate / 100);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">BIR 2307 Excel Bridge</h2>
          <p className="text-sm text-zinc-500">Auto-compute and generate Excel file for printing</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl shadow-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700"
          >
            <RefreshCw className="w-4 h-4" />
            Clear
          </button>
          <button 
            onClick={generateExcel}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Generate Excel
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Period Section */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4 uppercase tracking-wider">Period Covered</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">From Date (MM/DD/YYYY)</label>
              <input 
                type="text" 
                value={periodFrom}
                onChange={e => setPeriodFrom(e.target.value)}
                placeholder="01/01/2026"
                className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">To Date (MM/DD/YYYY)</label>
              <input 
                type="text" 
                value={periodTo}
                onChange={e => setPeriodTo(e.target.value)}
                placeholder="03/31/2026"
                className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800">
          
          {/* Payee Section */}
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Part I: Payee Info</h3>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">TIN</label>
              <input 
                type="text" 
                value={payee.tin}
                onChange={e => setPayee({ ...payee, tin: e.target.value })}
                placeholder="000-000-000-000"
                className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Payee's Name</label>
              <input 
                type="text" 
                value={payee.name}
                onChange={e => setPayee({ ...payee, name: e.target.value })}
                placeholder="Registered Name"
                className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Registered Address</label>
                <input 
                  type="text" 
                  value={payee.address}
                  onChange={e => setPayee({ ...payee, address: e.target.value })}
                  placeholder="Address"
                  className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="col-span-1 space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Zip Code</label>
                <input 
                  type="text" 
                  value={payee.zip}
                  onChange={e => setPayee({ ...payee, zip: e.target.value })}
                  placeholder="1000"
                  className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Payor Section */}
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Part II: Payor Info</h3>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">TIN</label>
              <input 
                type="text" 
                value={payor.tin}
                onChange={e => setPayor({ ...payor, tin: e.target.value })}
                placeholder="000-000-000-000"
                className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Payor's Name</label>
              <input 
                type="text" 
                value={payor.name}
                onChange={e => setPayor({ ...payor, name: e.target.value })}
                placeholder="Registered Name"
                className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Registered Address</label>
                <input 
                  type="text" 
                  value={payor.address}
                  onChange={e => setPayor({ ...payor, address: e.target.value })}
                  placeholder="Address"
                  className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="col-span-1 space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Zip Code</label>
                <input 
                  type="text" 
                  value={payor.zip}
                  onChange={e => setPayor({ ...payor, zip: e.target.value })}
                  placeholder="1000"
                  className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Transactions Section */}
        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Part III: Monthly Income & Tax</h3>
            <button 
              onClick={addTransaction}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="p-2 w-32">ATC</th>
                  <th className="p-2 w-32">1st Month</th>
                  <th className="p-2 w-32">2nd Month</th>
                  <th className="p-2 w-32">3rd Month</th>
                  <th className="p-2 w-32">Total</th>
                  <th className="p-2 w-24">Tax Rate (%)</th>
                  <th className="p-2 w-32">Tax Withheld</th>
                  <th className="p-2 w-12 text-center">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {transactions.map((t, index) => (
                  <tr key={index} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={t.atc}
                        onChange={e => updateTransaction(index, 'atc', e.target.value)}
                        placeholder="e.g. WI157"
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        value={t.m1}
                        onChange={e => updateTransaction(index, 'm1', e.target.value)}
                        placeholder="0.00"
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 text-right"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        value={t.m2}
                        onChange={e => updateTransaction(index, 'm2', e.target.value)}
                        placeholder="0.00"
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 text-right"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        value={t.m3}
                        onChange={e => updateTransaction(index, 'm3', e.target.value)}
                        placeholder="0.00"
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 text-right"
                      />
                    </td>
                    <td className="p-2 text-right text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {calculateTotal(t).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        value={t.rate}
                        onChange={e => updateTransaction(index, 'rate', e.target.value)}
                        placeholder="1"
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 text-center"
                      />
                    </td>
                    <td className="p-2 text-right text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 rounded">
                      {calculateTax(t).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 text-center">
                      <button 
                        onClick={() => removeTransaction(index)}
                        className="text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

