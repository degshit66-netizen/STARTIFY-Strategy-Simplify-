const fs = require('fs');
let content = fs.readFileSync('src/components/HRModule.tsx', 'utf8');

if (!content.includes('PrintHeader')) {
  content = content.replace(
    "import React, { useState, useMemo, useEffect } from 'react';",
    "import React, { useState, useMemo, useEffect } from 'react';\nimport { PrintHeader } from './PrintHeader';"
  );
}

if (!content.includes('Printer')) {
  content = content.replace(
    "import { Users, Clock, Calendar, CheckCircle2, XCircle, Search, Edit3, Trash2, PlusCircle, Building2, UserCircle, Briefcase, FileText } from 'lucide-react';",
    "import { Users, Clock, Calendar, CheckCircle2, XCircle, Search, Edit3, Trash2, PlusCircle, Building2, UserCircle, Briefcase, FileText, Printer } from 'lucide-react';"
  );
}

content = content.replace(
  /<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">/,
  `<PrintHeader title="Human Resources" />
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 no-print">`
);

content = content.replace(
  /<button\s+onClick=\{\(\) => setSettingsModalOpen\(true\)\}\s*className="flex items-center gap-2 text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2\.5 rounded-xl transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm"\s*>\s*<Building2 className="w-4 h-4" \/>\s*<span>HR & Payroll Settings<\/span>\s*<\/button>/,
  `<button 
            onClick={() => window.print()}
            className="flex items-center gap-2 text-xs bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-white font-bold px-4 py-2.5 rounded-xl transition-colors border border-zinc-800 shadow-sm focus:outline-none"
            title="Print HR Report"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button 
            onClick={() => setSettingsModalOpen(true)}
            className="flex items-center gap-2 text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2.5 rounded-xl transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm"
          >
            <Building2 className="w-4 h-4" />
            <span>HR & Payroll Settings</span>
          </button>`
);

content = content.replace(
  /<div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full lg:w-auto overflow-x-auto">/,
  `<div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full lg:w-auto overflow-x-auto no-print">`
);

content = content.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">/,
  `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">`
);

content = content.replace(
  /<div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">/,
  `<div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 no-print">`
);

fs.writeFileSync('src/components/HRModule.tsx', content);
console.log('patched HR');
