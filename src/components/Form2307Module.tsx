import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import {
  Download,
  RefreshCw,
  Plus,
  Trash2,
  FileSpreadsheet,
  Printer,
  Import,
  Sparkles,
  X,
  ChevronRight,
  FileCheck2,
} from "lucide-react";
import { r2, parseNum, formatCurrency } from "../utils/helpers";
import html2pdf from "html2pdf.js";
import { Form2307Sheet, renderTinSquares } from "./Form2307Sheet";
import { syncConfigToFirebase, loadConfigFromFirebase } from "../lib/db";

interface Transaction {
  id: number;
  atc: string;
  description: string;
  income: number;
  taxRate: number;
  tax: number;
}

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

interface Form2307ModuleProps {
  isAdmin?: boolean;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export const Form2307Module: React.FC<Form2307ModuleProps> = ({
  isAdmin = false,
  showToast,
}) => {
  // Mode selection: "split" (Editor + Live Form), "print-preview" (Full page form)
  const [viewMode, setViewMode] = useState<"split" | "form-only">("split");

  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");

  const [payee, setPayee] = useState({
    tin: "",
    name: "",
    address: "",
    zip: "",
  });
  const [payor, setPayor] = useState({
    tin: "",
    name: "",
    address: "",
    zip: "",
  });

  const [transactions, setTransactions] = useState<any[]>([
    { atc: "WI158", m1: "", m2: "", m3: "", rate: "2" },
  ]);

  const [signature, setSignature] = useState<string | null>(null);
  const [masterTemplate, setMasterTemplate] = useState<ArrayBuffer | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [excelMapping, setExcelMapping] = useState({
    payeeTin: "C12",
    payeeName: "C14",
    payeeAddress: "C16",
    payorTin: "C18",
    payorName: "C20",
    payorAddress: "C22",
  });

  // Load ledger entries to support 1-click importing of posted withholding tax items!
  const [salesLedgerEntries, setSalesLedgerEntries] = useState<any[]>([]);
  const [showImportList, setShowImportList] = useState(false);

  useEffect(() => {
    // Load e-signature from storage if exists
    const savedSig = localStorage.getItem("stratify_2307_signature");
    if (savedSig) setSignature(savedSig);

    // Load master template from Firestore
    const loadData = async () => {
      const savedTemplate = await loadConfigFromFirebase("bir_2307_master_template");
      if (savedTemplate) {
        setMasterTemplate(base64ToArrayBuffer(savedTemplate));
      }
      const savedMapping = await loadConfigFromFirebase("bir_2307_mapping");
      if (savedMapping) {
        try {
          setExcelMapping(JSON.parse(savedMapping));
        } catch (e) {}
      }
    };
    loadData();

    try {
      const tenantId = localStorage.getItem("current_tenant_id") || "default";
      const key = `stratify_general_ledger_${tenantId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter transactions that represent sales and have withholding enabled or some tax type
        const salesWithWithholding = parsed.filter(
          (row: any) =>
            row.type === "Sales" && (parseNum(row.ewt) > 0 || row.ewtSelect),
        );
        setSalesLedgerEntries(salesWithWithholding);
      }
    } catch (e) {
      console.error("Failed to load sales ledger for BIR 2307", e);
    }

    // Auto-fill Payee info from Company Config
    try {
      const companyStored = localStorage.getItem("stratify_company_config");
      if (companyStored) {
        const company = JSON.parse(companyStored);
        setPayee({
          tin: company.tin || "",
          name: company.name || "",
          address: company.address || "",
          zip: company.zip || "",
        });
      }
    } catch (e) {
      console.error("Failed to load company config for BIR 2307", e);
    }
  }, []);

  const addTransaction = () => {
    setTransactions([
      ...transactions,
      { atc: "WI158", m1: "", m2: "", m3: "", rate: "2" },
    ]);
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
      newTrans.push({ atc: "WI158", m1: "", m2: "", m3: "", rate: "2" });
    }
    setTransactions(newTrans);
  };

  const handleClear = () => {
    setPeriodFrom("");
    setPeriodTo("");
    setPayee({ tin: "", name: "", address: "", zip: "" });
    setPayor({ tin: "", name: "", address: "", zip: "" });
    setTransactions([{ atc: "WI158", m1: "", m2: "", m3: "", rate: "2" }]);

    // Reload company payee as default
    try {
      const companyStored = localStorage.getItem("stratify_company_config");
      if (companyStored) {
        const company = JSON.parse(companyStored);
        setPayee({
          tin: company.tin || "",
          name: company.name || "",
          address: company.address || "",
          zip: company.zip || "",
        });
      }
    } catch (e) {}
  };

  // Import a posted sales entry in 1 click!
  const handleImportSalesEntry = (entry: any) => {
    // Set Period Covered based on transaction month/year
    const dateObj = new Date(entry.date);
    const y = dateObj.getFullYear() || new Date().getFullYear();
    const m = dateObj.getMonth(); // 0-11

    // Estimate quarter range
    let startMonth = "01";
    let endMonth = "03";
    if (m >= 3 && m <= 5) {
      startMonth = "04";
      endMonth = "06";
    } else if (m >= 6 && m <= 8) {
      startMonth = "07";
      endMonth = "09";
    } else if (m >= 9 && m <= 11) {
      startMonth = "10";
      endMonth = "12";
    }

    setPeriodFrom(`${startMonth}/01/${y}`);
    setPeriodTo(`${endMonth}/30/${y}`);

    // Set Payor (Customer who withheld tax from us)
    setPayor({
      tin: entry.tin || "000-000-000-000",
      name: entry.payor || "General Client",
      address: entry.address || "Metro Manila, Philippines",
      zip: "1000",
    });

    // Determine ATC based on Goods vs Services or custom selections
    const isGoods = entry.itemType === "Goods";
    const ratePercentage = entry.ewtRateSelect
      ? entry.ewtRateSelect.replace("%", "")
      : "2";
    const atcCode = isGoods ? "WI157" : "WI158";

    // Disperse Net taxable base into month columns
    const grossVal = parseNum(entry.gross);
    let netVal = grossVal;
    if (entry.taxType === "Vatable") {
      netVal = r2(grossVal / 1.12);
    }

    // Clear transaction array and fill with imported numbers
    const positionInQuarter = m % 3; // 0, 1, or 2 representing 1st, 2nd, 3rd month
    setTransactions([
      {
        atc: atcCode,
        m1: positionInQuarter === 0 ? netVal.toString() : "",
        m2: positionInQuarter === 1 ? netVal.toString() : "",
        m3: positionInQuarter === 2 ? netVal.toString() : "",
        rate: ratePercentage,
      },
    ]);

    setShowImportList(false);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSignature(result);
        localStorage.setItem("stratify_2307_signature", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSignature = () => {
    setSignature(null);
    localStorage.removeItem("stratify_2307_signature");
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as ArrayBuffer;
        setMasterTemplate(result);
        
        // Sync to Firebase for all tenants to use
        const base64 = arrayBufferToBase64(result);
        await syncConfigToFirebase("bir_2307_master_template", base64);
        
        showToast("Master Template uploaded and synced globally.", "success");
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleMappingChange = async (newMapping: any) => {
    if (!isAdmin) return;
    setExcelMapping(newMapping);
    await syncConfigToFirebase("bir_2307_mapping", JSON.stringify(newMapping));
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

  // Compute Grand Totals
  const grandTotals = useMemo(() => {
    let m1Tot = 0,
      m2Tot = 0,
      m3Tot = 0,
      netTot = 0,
      taxTot = 0;
    transactions.forEach((t) => {
      m1Tot += parseFloat(t.m1) || 0;
      m2Tot += parseFloat(t.m2) || 0;
      m3Tot += parseFloat(t.m3) || 0;
      const total = calculateTotal(t);
      netTot += total;
      taxTot += total * ((parseFloat(t.rate) || 0) / 100);
    });
    return { m1Tot, m2Tot, m3Tot, netTot, taxTot };
  }, [transactions]);

  const generateExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      let worksheet;

      if (masterTemplate) {
        await workbook.xlsx.load(masterTemplate);
        worksheet = workbook.worksheets[0]; // Assume first sheet
        
        // Map basic info using coordinates
        worksheet.getCell(excelMapping.payeeTin).value = payee.tin;
        worksheet.getCell(excelMapping.payeeName).value = payee.name;
        worksheet.getCell(excelMapping.payeeAddress).value = payee.address;
        worksheet.getCell(excelMapping.payorTin).value = payor.tin;
        worksheet.getCell(excelMapping.payorName).value = payor.name;
        worksheet.getCell(excelMapping.payorAddress).value = payor.address;
        
        // Mapping transactions is harder as they are rows. 
        // We'll assume they start at a certain row or just use the default logic if it's complex.
        showToast("Generating from Master Template with your custom mappings...", "info");
      } else {
        worksheet = workbook.addWorksheet("BIR_2307");
        // Default layout if no template
        worksheet.addRow(["BIR FORM 2307 - Certificate of Creditable Tax Withheld at Source"]);
        worksheet.addRow([]);
        worksheet.addRow(["For the Period From:", periodFrom, "To:", periodTo]);
        worksheet.addRow([]);
        worksheet.addRow(["PART I - PAYEE INFORMATION"]);
        worksheet.addRow(["TIN:", payee.tin]);
        worksheet.addRow(["Name:", payee.name]);
        worksheet.addRow(["Address:", payee.address]);
        worksheet.addRow(["ZIP Code:", payee.zip]);
        worksheet.addRow([]);
        worksheet.addRow(["PART II - PAYOR INFORMATION"]);
        worksheet.addRow(["TIN:", payor.tin]);
        worksheet.addRow(["Name:", payor.name]);
        worksheet.addRow(["Address:", payor.address]);
        worksheet.addRow(["ZIP Code:", payor.zip]);
        worksheet.addRow([]);
        worksheet.addRow(["PART III - DETAILS OF MONTHLY INCOME PAYMENTS AND TAXES WITHHELD"]);
        worksheet.addRow(["ATC", "1st Month Amount", "2nd Month Amount", "3rd Month Amount", "Total Amount", "Tax Rate (%)", "Tax Withheld"]);
        
        transactions.forEach((t) => {
          const m1 = parseFloat(t.m1) || 0;
          const m2 = parseFloat(t.m2) || 0;
          const m3 = parseFloat(t.m3) || 0;
          const rate = parseFloat(t.rate) || 0;
          const totalAmount = m1 + m2 + m3;
          const taxWithheld = totalAmount * (rate / 100);
          worksheet.addRow([t.atc, m1, m2, m3, totalAmount, rate, taxWithheld]);
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `BIR_2307_${payee.name || "Payee"}_${periodFrom.replace(/\//g, "-") || "Period"}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      showToast("Excel Generated successfully.", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to generate Excel.", "error");
    }
  };

  const generatePDF = () => {
    const element = document.getElementById("bir-2307-sheet");
    if (!element) return;

    const opt = {
      margin: 0,
      filename: `BIR_2307_${payee.name || "Payee"}_${periodFrom.replace(/\//g, "-") || "Period"}.pdf`,
      image: { type: "jpeg" as const, quality: 1.0 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "in" as const, format: "letter", orientation: "portrait" as const },
    };

    html2pdf().set(opt).from(element).save();
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to split string values into boxes
  const renderTinSquares = (tinString: string) => {
    const cleanTin = (tinString || "").replace(/[^0-9]/g, "").padEnd(12, " ");
    const parts = [
      cleanTin.slice(0, 3),
      cleanTin.slice(3, 6),
      cleanTin.slice(6, 9),
      cleanTin.slice(9, 12),
    ];
    return (
      <div className="flex items-center gap-1">
        {parts.map((part, partIdx) => (
          <div
            key={partIdx}
            className="flex border border-zinc-950 bg-white divide-x divide-zinc-950 h-5"
          >
            {part.split("").map((char, idx) => (
              <div
                key={idx}
                className="w-3.5 h-full flex items-center justify-center font-mono text-[10px] font-extrabold text-zinc-950"
              >
                {char}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            BIR Form 2307 Generator
          </h2>
          <p className="text-xs text-zinc-500 font-medium">
            Create, import, and print high-fidelity Philippine Form 2307
            certificates
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <div className="relative">
              <input
                type="file"
                id="excel-import"
                className="hidden"
                accept=".xlsx"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      const buffer = event.target?.result as ArrayBuffer;
                      const workbook = new ExcelJS.Workbook();
                      await workbook.xlsx.load(buffer);
                      const worksheet = workbook.getWorksheet(1);
                      if (!worksheet) return;

                      const importedTransactions: Transaction[] = [];
                      worksheet.eachRow((row, rowNumber) => {
                        if (rowNumber > 1) { // Skip header
                          const atc = row.getCell(1).value?.toString() || "";
                          const description = row.getCell(2).value?.toString() || "";
                          const income = parseNum(row.getCell(3).value?.toString() || "0");
                          const taxRate = parseNum(row.getCell(4).value?.toString() || "1"); // Default 1%
                          
                          if (atc && description) {
                            importedTransactions.push({
                              id: Date.now() + rowNumber,
                              atc,
                              description,
                              income,
                              taxRate,
                              tax: (income * taxRate) / 100,
                            });
                          }
                        }
                      });
                      setTransactions([...transactions, ...importedTransactions]);
                      showToast(`Imported ${importedTransactions.length} transactions from Excel.`, 'success');
                    };
                    reader.readAsArrayBuffer(file);
                  }
                }}
              />
              <button
                onClick={() => document.getElementById('excel-import')?.click()}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold text-xs rounded-xl shadow-sm border border-indigo-200/50 hover:bg-indigo-100 dark:hover:bg-indigo-950 transition-colors"
              >
                <Import className="w-4 h-4" />
                Import Excel (Admin)
              </button>
            </div>
          )}
          {salesLedgerEntries.length > 0 && (
            <button
              onClick={() => setShowImportList(!showImportList)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs rounded-xl shadow-sm border border-emerald-200/50 hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors"
            >
              <Import className="w-4 h-4" />
              Import Sales ({salesLedgerEntries.length})
            </button>
          )}
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={generateExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs rounded-xl hover:opacity-90 transition-opacity"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={generatePDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-500 transition-colors shadow-md shadow-red-500/10"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-500 transition-colors shadow-md shadow-blue-500/10"
          >
            <Printer className="w-4 h-4" />
            Print 2307
          </button>
        </div>
      </div>

      {/* IMPORT DRAWER */}
      {showImportList && (
        <div className="no-print bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Posted Sales Ledger Entries with BIR 2307
            </h3>
            <button
              onClick={() => setShowImportList(false)}
              className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
            {salesLedgerEntries.map((row) => (
              <div
                key={row.id}
                onClick={() => handleImportSalesEntry(row)}
                className="cursor-pointer bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500 p-3 rounded-xl transition-all space-y-1.5"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-zinc-400">
                    {row.date}
                  </span>
                  <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                    SI-{row.id.toString().slice(-4)}
                  </span>
                </div>
                <div className="font-bold text-xs text-zinc-800 dark:text-zinc-100 truncate">
                  {row.payor}
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-500">
                    Gross: ₱{formatCurrency(parseNum(row.gross))}
                  </span>
                  <span className="font-extrabold text-emerald-600">
                    Tax: ₱{formatCurrency(parseNum(row.ewt))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SPLIT VIEW (EDITOR & PREVIEW) */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-start`}>
        {/* FORM INPUTS PANEL */}
        <div className="lg:col-span-4 space-y-5 no-print bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div>
            <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest mb-3">
              1. Period Covered
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500">
                  From (MM/DD/YYYY)
                </label>
                <input
                  type="text"
                  value={periodFrom}
                  onChange={(e) => setPeriodFrom(e.target.value)}
                  placeholder="01/01/2026"
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500">
                  To (MM/DD/YYYY)
                </label>
                <input
                  type="text"
                  value={periodTo}
                  onChange={(e) => setPeriodTo(e.target.value)}
                  placeholder="03/31/2026"
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <hr className="border-zinc-100 dark:border-zinc-800" />

          <div>
            <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest mb-3">
              2. Payee Information (Recipient)
            </h3>
            <div className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500">
                  TIN
                </label>
                <input
                  type="text"
                  value={payee.tin}
                  onChange={(e) => setPayee({ ...payee, tin: e.target.value })}
                  placeholder="000-000-000-000"
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500">
                  Registered Corporate Name
                </label>
                <input
                  type="text"
                  value={payee.name}
                  onChange={(e) => setPayee({ ...payee, name: e.target.value })}
                  placeholder="Enterprise Name"
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-500">
                    Address
                  </label>
                  <input
                    type="text"
                    value={payee.address}
                    onChange={(e) =>
                      setPayee({ ...payee, address: e.target.value })
                    }
                    placeholder="Registered Office Address"
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-500">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={payee.zip}
                    onChange={(e) =>
                      setPayee({ ...payee, zip: e.target.value })
                    }
                    placeholder="1000"
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-zinc-100 dark:border-zinc-800" />

          <div>
            <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest mb-3">
              3. Payor Information (Customer)
            </h3>
            <div className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500">
                  TIN
                </label>
                <input
                  type="text"
                  value={payor.tin}
                  onChange={(e) => setPayor({ ...payor, tin: e.target.value })}
                  placeholder="000-000-000-000"
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500">
                  Withholding Agent Name
                </label>
                <input
                  type="text"
                  value={payor.name}
                  onChange={(e) => setPayor({ ...payor, name: e.target.value })}
                  placeholder="Client Corporate Name"
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-500">
                    Address
                  </label>
                  <input
                    type="text"
                    value={payor.address}
                    onChange={(e) =>
                      setPayor({ ...payor, address: e.target.value })
                    }
                    placeholder="Client Registered Address"
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-500">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={payor.zip}
                    onChange={(e) =>
                      setPayor({ ...payor, zip: e.target.value })
                    }
                    placeholder="1000"
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-zinc-100 dark:border-zinc-800" />

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest">
                4. Income Taxes Grid
              </h3>
              <button
                onClick={addTransaction}
                className="text-[10px] font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 px-2 py-1 rounded"
              >
                + Add Line
              </button>
            </div>
            <div className="space-y-4">
              {transactions.map((t, index) => (
                <div
                  key={index}
                  className="bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 relative space-y-2 text-left"
                >
                  {transactions.length > 1 && (
                    <button
                      onClick={() => removeTransaction(index)}
                      className="absolute top-2.5 right-2.5 text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2 pr-6">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold uppercase text-zinc-500">
                        ATC Code
                      </label>
                      <input
                        type="text"
                        value={t.atc}
                        onChange={(e) =>
                          updateTransaction(index, "atc", e.target.value)
                        }
                        placeholder="WI158"
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold uppercase text-zinc-500">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        value={t.rate}
                        onChange={(e) =>
                          updateTransaction(index, "rate", e.target.value)
                        }
                        placeholder="2"
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-zinc-400">
                        1st Month
                      </label>
                      <input
                        type="number"
                        value={t.m1}
                        onChange={(e) =>
                          updateTransaction(index, "m1", e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 focus:outline-none text-right"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-zinc-400">
                        2nd Month
                      </label>
                      <input
                        type="number"
                        value={t.m2}
                        onChange={(e) =>
                          updateTransaction(index, "m2", e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 focus:outline-none text-right"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-zinc-400">
                        3rd Month
                      </label>
                      <input
                        type="number"
                        value={t.m3}
                        onChange={(e) =>
                          updateTransaction(index, "m3", e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 focus:outline-none text-right"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-zinc-100 dark:border-zinc-800" />

          <div>
            <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest mb-3">
              5. E-Signature Overlay
            </h3>
            <div className="space-y-3">
              {!signature ? (
                <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-center">
                  <label className="cursor-pointer group">
                    <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                    <Plus className="w-6 h-6 text-zinc-300 group-hover:text-emerald-500 mx-auto mb-2" />
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Upload Authorized Signature</p>
                    <p className="text-[9px] text-zinc-400 mt-1">Prefer transparent PNG</p>
                  </label>
                </div>
              ) : (
                <div className="relative bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-emerald-500/30">
                  <img src={signature} alt="Signature" className="h-16 mx-auto object-contain" />
                  <button 
                    onClick={removeSignature}
                    className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full border border-red-200 hover:bg-red-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <hr className="border-zinc-100 dark:border-zinc-800" />

          {isAdmin && (
            <>
              <div>
                <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest mb-3">
                  6. Master Excel Template (Admin Only)
                </h3>
                <div className="space-y-3">
                  {!masterTemplate ? (
                    <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-center">
                      <label className="cursor-pointer group">
                        <input type="file" accept=".xlsx" className="hidden" onChange={handleTemplateUpload} />
                        <FileSpreadsheet className="w-6 h-6 text-zinc-300 group-hover:text-blue-500 mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Upload Master Template</p>
                        <p className="text-[9px] text-zinc-400 mt-1">Official BIR 2307 Excel</p>
                      </label>
                    </div>
                  ) : (
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-2xl border border-blue-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-blue-500" />
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400">Template Active</span>
                      </div>
                      <button 
                        onClick={async () => {
                          setMasterTemplate(null);
                          await syncConfigToFirebase("bir_2307_master_template", "");
                          showToast("Template removed globally.", "info");
                        }}
                        className="text-blue-400 hover:text-blue-600"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <hr className="border-zinc-100 dark:border-zinc-800" />

              <div>
                <button 
                  onClick={() => setShowMapping(!showMapping)}
                  className="w-full flex items-center justify-between py-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <h3 className="text-xs font-extrabold uppercase tracking-widest">
                    7. Excel Template Mapping (Admin Only)
                  </h3>
                  <ChevronRight className={`w-4 h-4 transition-transform ${showMapping ? 'rotate-90' : ''}`} />
                </button>
                
                {showMapping && (
                  <div className="space-y-3 pt-3 animate-in fade-in duration-200">
                    <p className="text-[10px] text-zinc-500 italic leading-snug">
                      Define which Excel cells receive the data during automated generation.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Payee TIN Cell</label>
                        <input 
                          type="text" 
                          value={excelMapping.payeeTin} 
                          onChange={(e) => handleMappingChange({...excelMapping, payeeTin: e.target.value})}
                          className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Payee Name Cell</label>
                        <input 
                          type="text" 
                          value={excelMapping.payeeName} 
                          onChange={(e) => handleMappingChange({...excelMapping, payeeName: e.target.value})}
                          className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* HIGH FIDELITY BIR FORM 2307 SHEET PREVIEW */}
        <div className="lg:col-span-8 bg-zinc-150/40 dark:bg-zinc-950/40 p-4 sm:p-6 rounded-3xl border border-zinc-300 dark:border-zinc-800 flex justify-center overflow-x-auto print:bg-white print:border-none print:p-0">
          {/* THE PRINTABLE SHEET */}
          <Form2307Sheet
            periodFrom={periodFrom}
            periodTo={periodTo}
            payee={payee}
            payor={payor}
            transactions={transactions}
            grandTotals={grandTotals}
            signature={signature}
          />
        </div>
      </div>
    </div>
  );
};
