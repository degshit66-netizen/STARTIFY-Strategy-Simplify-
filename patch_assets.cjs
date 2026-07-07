const fs = require('fs');
let content = fs.readFileSync('src/components/FixedAssetsModule.tsx', 'utf8');

if (!content.includes('PrintHeader')) {
  content = content.replace(
    "import React, { useState, useMemo } from 'react';",
    "import React, { useState, useMemo } from 'react';\nimport { PrintHeader } from './PrintHeader';"
  );
}

if (!content.includes('Printer')) {
  content = content.replace(
    "import { Building2, Search, PlusCircle, PenTool, Edit3, Trash2 } from 'lucide-react';",
    "import { Building2, Search, PlusCircle, PenTool, Edit3, Trash2, Printer } from 'lucide-react';"
  );
}

content = content.replace(
  /<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">/,
  `<PrintHeader title="Fixed Assets Ledger" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 no-print">`
);

content = content.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">/,
  `<div className="grid grid-cols-1 sm:grid-cols-4 gap-4 no-print">`
);

content = content.replace(
  /<div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">/,
  `<div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 no-print">`
);

content = content.replace(
  /<div className="flex items-center gap-2 self-start sm:self-auto bg-zinc-100 dark:bg-zinc-800 px-3 py-1\.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">\s*<span>\{assets\.length\} properties registered<\/span>\s*<\/div>/,
  `<div className="flex items-center gap-2 self-start sm:self-auto bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
          <span>{assets.length} properties registered</span>
        </div>
        <div className="no-print">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 text-xs bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-white font-bold px-4 py-2.5 rounded-xl transition-colors border border-zinc-800 shadow-sm focus:outline-none"
            title="Print Assets Report"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>`
);

fs.writeFileSync('src/components/FixedAssetsModule.tsx', content);
console.log('patched FixedAssets');
