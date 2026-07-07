const fs = require('fs');
let content = fs.readFileSync('src/components/PayrollModule.tsx', 'utf8');

if (!content.includes('PrintHeader')) {
  content = content.replace(
    "import React, { useState, useMemo, useEffect } from 'react';",
    "import React, { useState, useMemo, useEffect } from 'react';\nimport { PrintHeader } from './PrintHeader';"
  );
}

if (!content.includes('Printer')) {
  content = content.replace(
    "import { Calculator, Calendar, Users, DollarSign, Search, CheckCircle2, ChevronRight, Download, FileText, Settings, RefreshCw, XCircle } from 'lucide-react';",
    "import { Calculator, Calendar, Users, DollarSign, Search, CheckCircle2, ChevronRight, Download, FileText, Settings, RefreshCw, XCircle, Printer } from 'lucide-react';"
  );
}

content = content.replace(
  /<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">/,
  `<PrintHeader title="Payroll Processing" />
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 no-print">`
);

content = content.replace(
  /<button\s+onClick=\{\(\) => setSettingsModalOpen\(true\)\}\s*className="flex items-center gap-2 text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2\.5 rounded-xl transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm"\s*>\s*<Settings className="w-4 h-4" \/>\s*<span>Tax & Gov Rates<\/span>\s*<\/button>/,
  `<button 
            onClick={() => window.print()}
            className="flex items-center gap-2 text-xs bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-white font-bold px-4 py-2.5 rounded-xl transition-colors border border-zinc-800 shadow-sm focus:outline-none"
            title="Print Payroll Report"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button 
            onClick={() => setSettingsModalOpen(true)}
            className="flex items-center gap-2 text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2.5 rounded-xl transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm"
          >
            <Settings className="w-4 h-4" />
            <span>Tax & Gov Rates</span>
          </button>`
);

content = content.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">/,
  `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">`
);

fs.writeFileSync('src/components/PayrollModule.tsx', content);
console.log('patched Payroll');
