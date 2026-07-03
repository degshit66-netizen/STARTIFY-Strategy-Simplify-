import React from "react";
import { formatCurrency } from "../utils/helpers";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";

export const renderTinSquares = (tinString: string) => {
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

export const Form2307Sheet = ({
  periodFrom,
  periodTo,
  payee,
  payor,
  transactions,
  grandTotals,
  signature,
}: any) => {
  const qrData = JSON.stringify({
    payeeTin: payee.tin,
    payorTin: payor.tin,
    period: `${periodFrom}-${periodTo}`,
    totalTax: grandTotals.taxTot
  });

  return (
    <div
      id="bir-2307-sheet"
      className="w-[820px] bg-[#fffdef] text-zinc-950 border-[3px] border-zinc-950 p-6 shadow-md flex flex-col space-y-2 shrink-0 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:bg-white relative overflow-hidden"
      style={{ minHeight: '1056px' }}
    >
      {/* BACKGROUND WATERMARK */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none select-none z-0">
        <img 
          src="https://i.postimg.cc/XJzwZFVB/images.jpg" 
          alt="BIR Watermark" 
          className="w-[450px] h-[450px] object-contain grayscale mix-blend-multiply"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* SHEET HEADER */}
      <div className="border-b-[2px] border-zinc-950 pb-2 grid grid-cols-12 gap-3 items-stretch relative z-10">
        <div className="col-span-3 border-[1.5px] border-zinc-950 p-1 bg-white flex flex-col justify-between text-[8px] font-mono leading-none">
          <span className="font-bold border-b border-zinc-950 pb-1 text-[7px] uppercase block">
            BIR Form No.
          </span>
          <span className="font-extrabold text-[18px] text-center tracking-tighter block pt-1">
            2307
          </span>
          <span className="text-[7px] text-center uppercase font-bold block pt-1">
            January 2018 (ENCS)
          </span>
        </div>

        <div className="col-span-6 text-center space-y-0.5 leading-tight flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-1">
            <img src="https://i.postimg.cc/XJzwZFVB/images.jpg" alt="BIR" className="w-8 h-8 object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
            <div>
              <div className="text-[7px] font-mono uppercase font-bold text-zinc-700">Republic of the Philippines</div>
              <div className="text-[8px] font-serif font-extrabold uppercase tracking-tight text-zinc-900 leading-none">Department of Finance</div>
              <div className="text-[9px] font-serif font-black uppercase text-zinc-900 leading-none">Bureau of Internal Revenue</div>
            </div>
          </div>
          <h1 className="text-[12px] font-black uppercase tracking-tight text-zinc-950 border-t border-zinc-950 pt-1.5 mt-1 leading-none w-full">
            Certificate of Creditable Tax Withheld at Source
          </h1>
        </div>

        <div className="col-span-3 border-[1.5px] border-zinc-950 p-1 bg-white flex items-center justify-between gap-1">
          <div className="flex-1 flex flex-col items-center justify-center font-mono leading-tight">
            <div className="font-black text-[7px] uppercase tracking-wide">For BIR Use Only</div>
            <div className="mt-0.5">
              <Barcode 
                value={`BIR-2307-${payee.tin.replace(/[^0-9]/g, "").slice(0, 9)}`} 
                height={15} 
                width={0.8} 
                fontSize={6} 
                margin={0}
                background="transparent"
              />
            </div>
          </div>
          <div className="w-10 h-10 bg-white p-0.5 border border-zinc-200 flex items-center justify-center shrink-0">
            <QRCodeSVG value={qrData} size={36} level="L" />
          </div>
        </div>
      </div>

      {/* ROW 1: PERIOD COVERED */}
      <div className="grid grid-cols-12 gap-2 border-b border-zinc-950 pb-1 text-[10px] font-serif leading-tight">
        <div className="col-span-1 text-[11px] font-bold text-center border-r border-zinc-950 pr-2">
          1
        </div>
        <div className="col-span-11 flex items-center justify-between pl-1">
          <span className="font-extrabold uppercase text-[9px]">
            For the Period Covered:
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono uppercase text-zinc-600">From</span>
              <span className="font-mono font-bold border-b border-zinc-950 px-3 py-0.5 min-w-[80px] text-center text-[10px]">
                {periodFrom || "MM/DD/YYYY"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono uppercase text-zinc-600">To</span>
              <span className="font-mono font-bold border-b border-zinc-950 px-3 py-0.5 min-w-[80px] text-center text-[10px]">
                {periodTo || "MM/DD/YYYY"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PART I: PAYEE */}
      <div className="border border-zinc-950 leading-tight">
        <div className="bg-zinc-950 text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 flex justify-between">
          <span>Part I - PAYEE INFORMATION</span>
        </div>

        <div className="grid grid-cols-12 border-b border-zinc-950 divide-x divide-zinc-950 items-center">
          <div className="col-span-4 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">2</span> Taxpayer Identification Number (TIN)
            </div>
            {renderTinSquares(payee.tin)}
          </div>
          <div className="col-span-8 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">3</span> Payee's Name (Registered Name)
            </div>
            <div className="font-mono text-xs font-black uppercase text-zinc-950 px-1 truncate">
              {payee.name || "N/A"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 divide-x divide-zinc-950 items-center">
          <div className="col-span-9 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">4</span> Registered Address
            </div>
            <div className="font-mono text-[9px] font-bold text-zinc-900 px-1 truncate">
              {payee.address || "N/A"}
            </div>
          </div>
          <div className="col-span-3 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">4A</span> ZIP Code
            </div>
            <div className="font-mono text-[11px] font-extrabold text-zinc-950 px-1">
              {payee.zip || "0000"}
            </div>
          </div>
        </div>
      </div>

      {/* PART II: PAYOR */}
      <div className="border border-zinc-950 leading-tight">
        <div className="bg-zinc-950 text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 flex justify-between">
          <span>Part II - PAYOR INFORMATION</span>
        </div>

        <div className="grid grid-cols-12 border-b border-zinc-950 divide-x divide-zinc-950 items-center">
          <div className="col-span-4 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">5</span> Taxpayer Identification Number (TIN)
            </div>
            {renderTinSquares(payor.tin)}
          </div>
          <div className="col-span-8 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">6</span> Payor's Name (Withholding Agent)
            </div>
            <div className="font-mono text-xs font-black uppercase text-zinc-950 px-1 truncate">
              {payor.name || "N/A"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 divide-x divide-zinc-950 items-center">
          <div className="col-span-9 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">7</span> Registered Address
            </div>
            <div className="font-mono text-[9px] font-bold text-zinc-900 px-1 truncate">
              {payor.address || "N/A"}
            </div>
          </div>
          <div className="col-span-3 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">7A</span> ZIP Code
            </div>
            <div className="font-mono text-[11px] font-extrabold text-zinc-950 px-1">
              {payor.zip || "0000"}
            </div>
          </div>
        </div>
      </div>

      {/* PART III: GRID OF INCOMES */}
      <div className="border border-zinc-950 overflow-hidden leading-none">
        <div className="bg-zinc-950 text-white text-[9px] font-extrabold uppercase px-2.5 py-1 text-center">
          Part III - DETAILS OF MONTHLY INCOME PAYMENTS AND TAXES WITHHELD
        </div>

        <div className="grid grid-cols-12 bg-zinc-200 border-b border-zinc-950 divide-x divide-zinc-950 text-[7px] font-extrabold text-center items-stretch font-serif">
          <div className="col-span-4 p-1.5 flex items-center justify-center uppercase leading-tight">
            Nature of Income Payment
          </div>
          <div className="col-span-1 p-1.5 flex items-center justify-center">
            ATC
          </div>
          <div className="col-span-5 grid grid-cols-4 divide-x divide-zinc-950 items-stretch">
            <div className="col-span-3 grid grid-cols-3 divide-x divide-zinc-950">
              <div className="p-1 flex items-center justify-center uppercase">1st Month</div>
              <div className="p-1 flex items-center justify-center uppercase">2nd Month</div>
              <div className="p-1 flex items-center justify-center uppercase">3rd Month</div>
            </div>
            <div className="p-1 flex items-center justify-center uppercase">Total</div>
          </div>
          <div className="col-span-2 p-1.5 flex items-center justify-center uppercase">
            Tax Withheld
          </div>
        </div>

        <div className="divide-y divide-zinc-400 font-mono text-[9px] font-bold">
          {transactions.map((t: any, idx: number) => {
            const m1 = parseFloat(t.m1) || 0;
            const m2 = parseFloat(t.m2) || 0;
            const m3 = parseFloat(t.m3) || 0;
            const rowTot = m1 + m2 + m3;
            const taxTot = rowTot * ((parseFloat(t.rate) || 0) / 100);
            return (
              <div key={idx} className="grid grid-cols-12 divide-x divide-zinc-400 text-right items-center">
                <div className="col-span-4 px-2 py-2 text-left text-[8px] font-sans truncate font-medium text-zinc-700">
                  {t.atc === "WI158" ? "Professional/Technical Services" : t.atc === "WI157" ? "Goods Purchase" : "Creditable Income Payment"}
                </div>
                <div className="col-span-1 px-1 py-2 text-center font-extrabold text-zinc-950">{t.atc || "WI158"}</div>
                <div className="col-span-5 grid grid-cols-4 divide-x divide-zinc-400 items-center">
                  <div className="col-span-3 grid grid-cols-3 divide-x divide-zinc-400">
                    <div className="px-1 py-2">{m1 > 0 ? formatCurrency(m1) : "-"}</div>
                    <div className="px-1 py-2">{m2 > 0 ? formatCurrency(m2) : "-"}</div>
                    <div className="px-1 py-2">{m3 > 0 ? formatCurrency(m3) : "-"}</div>
                  </div>
                  <div className="px-1 py-2 text-zinc-950 font-black">{rowTot > 0 ? formatCurrency(rowTot) : "-"}</div>
                </div>
                <div className="col-span-2 px-1 py-2 text-zinc-950 font-black text-right pr-2">
                  {taxTot > 0 ? formatCurrency(taxTot) : "-"}
                </div>
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, 5 - transactions.length) }).map((_, idx) => (
            <div key={`empty-${idx}`} className="grid grid-cols-12 divide-x divide-zinc-400 text-right items-center text-zinc-300">
              <div className="col-span-4 px-2 py-2 text-left text-[9px]">&nbsp;</div>
              <div className="col-span-1 px-1 py-2 text-center">&nbsp;</div>
              <div className="col-span-5 grid grid-cols-4 divide-x divide-zinc-400 items-center">
                <div className="col-span-3 grid grid-cols-3 divide-x divide-zinc-400">
                  <div className="px-1 py-2">-</div>
                  <div className="px-1 py-2">-</div>
                  <div className="px-1 py-2">-</div>
                </div>
                <div className="px-1 py-2">-</div>
              </div>
              <div className="col-span-2 px-1 py-2">-</div>
            </div>
          ))}

          <div className="grid grid-cols-12 divide-x divide-zinc-950 border-t border-zinc-950 text-right items-center bg-zinc-100 font-serif text-[8px] font-extrabold py-1">
            <div className="col-span-5 px-3 py-1.5 text-left uppercase">Total Taxes Withheld</div>
            <div className="col-span-5 grid grid-cols-4 divide-x divide-zinc-950 items-center font-mono text-[9px]">
              <div className="col-span-3 grid grid-cols-3 divide-x divide-zinc-950">
                <div className="px-1">{grandTotals.m1Tot > 0 ? formatCurrency(grandTotals.m1Tot) : "-"}</div>
                <div className="px-1">{grandTotals.m2Tot > 0 ? formatCurrency(grandTotals.m2Tot) : "-"}</div>
                <div className="px-1">{grandTotals.m3Tot > 0 ? formatCurrency(grandTotals.m3Tot) : "-"}</div>
              </div>
              <div className="px-1 text-zinc-950 font-black">{grandTotals.netTot > 0 ? formatCurrency(grandTotals.netTot) : "-"}</div>
            </div>
            <div className="col-span-2 px-1 text-right font-black text-zinc-950 text-[9px] pr-2">
              ₱{formatCurrency(grandTotals.taxTot)}
            </div>
          </div>
        </div>
      </div>

      {/* PART IV: SIGNATURES */}
      <div className="border border-zinc-950 p-2 bg-white space-y-3">
        <p className="text-[7px] font-sans text-zinc-600 leading-tight text-justify">
          We declare under the penalties of perjury that this certificate has been made in good faith, verified by us, and to the best of our knowledge and belief, is a true and correct certificate, pursuant to the provisions of the National Internal Revenue Code, as amended, and the regulations issued under authority thereof.
        </p>

        <div className="grid grid-cols-12 gap-8 pt-1">
          <div className="col-span-6 flex flex-col items-center">
            <div className="border-b border-zinc-900 w-full h-10 flex items-end justify-center relative">
              {signature && <img src={signature} alt="Sig" className="absolute -top-4 h-16 object-contain z-10 mix-blend-multiply" />}
              <span className="text-[9px] font-mono text-zinc-300">Authorized Representative</span>
            </div>
            <div className="text-[7px] font-bold uppercase text-center text-zinc-800 mt-1">
              Signature over Printed Name of Payor/Authorized Representative
            </div>
          </div>

          <div className="col-span-6 flex flex-col items-center">
            <div className="border-b border-zinc-900 w-full h-10 flex items-end justify-center">
              <span className="text-[9px] font-mono text-zinc-300">Authorized Recipient</span>
            </div>
            <div className="text-[7px] font-bold uppercase text-center text-zinc-800 mt-1">
              CONFORME: Signature over Printed Name of Payee/Authorized Representative
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center text-[7px] font-mono text-zinc-400 mt-1">
        <span>BIR Form 2307 - January 2018 (ENCS) - Page 1</span>
        <span>Generated via Stratify Accounting System</span>
      </div>

      {/* PAGE BREAK FOR PRINT */}
      <div className="page-break-after-always h-0 print:hidden" style={{ pageBreakAfter: 'always' }}></div>

      {/* PAGE 2: SCHEDULE & INSTRUCTIONS */}
      <div className="w-full bg-[#fffdef] text-zinc-950 border-[3px] border-zinc-950 p-6 mt-8 flex flex-col space-y-4 print:mt-0 print:border-none relative overflow-hidden" style={{ minHeight: '1056px' }}>
        {/* BACKGROUND WATERMARK PAGE 2 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none select-none z-0">
          <img 
            src="https://i.postimg.cc/XJzwZFVB/images.jpg" 
            alt="BIR Watermark" 
            className="w-[500px] h-[500px] object-contain grayscale mix-blend-multiply"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="border-b-2 border-zinc-950 pb-2 flex items-center justify-between relative z-10">
          <div>
            <h2 className="text-[14px] font-black uppercase tracking-tight">Schedule 1</h2>
            <p className="text-[9px] font-bold text-zinc-600 uppercase">Details of Income Payments Subjected to Expanded Withholding Tax</p>
          </div>
          <div className="text-[10px] font-mono font-bold border border-zinc-950 px-3 py-1 bg-white">
            Page 2 - BIR Form 2307
          </div>
        </div>

        <div className="border border-zinc-950 bg-white relative z-10">
          <div className="grid grid-cols-12 bg-zinc-900 text-white text-[8px] font-bold uppercase divide-x divide-zinc-700 text-center">
            <div className="col-span-1 py-2">Row</div>
            <div className="col-span-4 py-2">Nature of Income Payment</div>
            <div className="col-span-1 py-2">ATC</div>
            <div className="col-span-2 py-2">1st Month</div>
            <div className="col-span-2 py-2">2nd Month</div>
            <div className="col-span-2 py-2">3rd Month</div>
          </div>
          <div className="divide-y divide-zinc-300">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 divide-x divide-zinc-300 text-[9px] font-mono h-8 items-center text-right">
                <div className="col-span-1 text-center font-bold text-zinc-400 italic">{i + 1}</div>
                <div className="col-span-4 px-2 text-left truncate font-sans text-[8px]">
                  {transactions[i]?.atc ? (transactions[i].atc === "WI158" ? "Professional/Technical (10%/15%)" : "Income Payment Subject to EWT") : ""}
                </div>
                <div className="col-span-1 text-center font-bold">{transactions[i]?.atc || ""}</div>
                <div className="col-span-2 px-2">{transactions[i]?.m1 ? formatCurrency(transactions[i].m1) : ""}</div>
                <div className="col-span-2 px-2">{transactions[i]?.m2 ? formatCurrency(transactions[i].m2) : ""}</div>
                <div className="col-span-2 px-2">{transactions[i]?.m3 ? formatCurrency(transactions[i].m3) : ""}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ATC REFERENCE SECTION */}
        <div className="relative z-10 pt-4">
          <h3 className="text-[10px] font-black uppercase border-b border-zinc-950 mb-2">LIST OF ALPHANUMERIC TAX CODES (ATC)</h3>
          <div className="grid grid-cols-3 gap-4 text-[7px] font-mono text-zinc-600">
            <div className="space-y-1">
              <p><strong>WI158</strong> - Professional/Technical (Indiv)</p>
              <p><strong>WC158</strong> - Professional/Technical (Corp)</p>
              <p><strong>WI160</strong> - Medical Practitioners (Indiv)</p>
              <p><strong>WC160</strong> - Medical Practitioners (Corp)</p>
            </div>
            <div className="space-y-1">
              <p><strong>WI100</strong> - Rentals: Real/Personal Prop</p>
              <p><strong>WC100</strong> - Rentals: Real/Personal Prop</p>
              <p><strong>WI120</strong> - Cinematographic Film Lessors</p>
              <p><strong>WC120</strong> - Cinematographic Film Lessors</p>
            </div>
            <div className="space-y-1">
              <p><strong>WI140</strong> - Income Payts to Contractors</p>
              <p><strong>WC140</strong> - Income Payts to Contractors</p>
              <p><strong>WI010</strong> - Income Payts to Suppliers</p>
              <p><strong>WC010</strong> - Income Payts to Suppliers</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-6 relative z-10 border-t-2 border-zinc-950">
          <h3 className="text-[10px] font-black uppercase mb-2">Guidelines and Instructions:</h3>
          <div className="grid grid-cols-2 gap-8 text-[7.5px] text-zinc-700 leading-relaxed text-justify">
            <div className="space-y-2">
              <p><strong>1. Who shall issue:</strong> This Certificate shall be issued by the Withholding Agent (Payor) to every income recipient (Payee) for every income payment subjected to expanded withholding tax (EWT).</p>
              <p><strong>2. When to issue:</strong> For EWT, this Certificate shall be issued on or before the 20th day of the month following the close of the taxable quarter. Upon request of the payee, however, it may be issued together with the income payment.</p>
              <p><strong>3. Use:</strong> This Certificate is used to substantiate tax credits for income taxes withheld at source, as required under the National Internal Revenue Code (NIRC) of 1997, as amended.</p>
            </div>
            <div className="space-y-2 font-mono">
              <p><strong>PENALTIES:</strong> Any person who fails to file a return, statement or list, or keep any record, or supply any information, as required by the Code, shall be subject to administrative and/or criminal penalties.</p>
              <div className="pt-6 border-t border-zinc-200 flex flex-col items-end">
                <p className="font-sans text-[6px] italic text-zinc-400 uppercase tracking-tighter">System-Generated Security Key: STRATIFY-2307-V2-ENCS-JAN2018</p>
                <div className="mt-1 w-24 h-6 border border-zinc-200 bg-zinc-50 flex items-center justify-center text-[5px] text-zinc-300">BARCODE PLACEHOLDER</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
