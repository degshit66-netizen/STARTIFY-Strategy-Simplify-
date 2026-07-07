const fs = require('fs');
let content = fs.readFileSync('src/components/LedgerTable.tsx', 'utf8');

if (!content.includes('PrintHeader')) {
  content = content.replace(
    "import React, { useMemo } from 'react';",
    "import React, { useMemo } from 'react';\nimport { PrintHeader } from './PrintHeader';"
  );
}

content = content.replace(
  /<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">/,
  `<PrintHeader title="General Ledger Entries" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 no-print">`
);

content = content.replace(
  /<button\s+onClick=\{\(\) => window\.print\(\)\}\s+className="flex items-center justify-center gap-1\.5 px-4 py-2 rounded-xl text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-bold transition-all border border-zinc-800 shadow-sm shrink-0 no-print"\s+title="Print current filtered ledger entries"\s*>\s*<Printer className="w-3\.5 h-3\.5" \/>\s*<span>Print Registry<\/span>\s*<\/button>/,
  `<button 
              onClick={() => window.print()}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-white font-bold transition-all border border-zinc-800 shadow-sm shrink-0 no-print"
              title="Print current filtered ledger entries"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>`
);

// We need to also add no-print to the stats section
content = content.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">/,
  `<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 no-print">`
);

fs.writeFileSync('src/components/LedgerTable.tsx', content);
console.log('patched Ledger');
