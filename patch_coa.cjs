const fs = require('fs');
let content = fs.readFileSync('src/components/COAModule.tsx', 'utf8');

// Add PrintHeader import
if (!content.includes('PrintHeader')) {
  content = content.replace(
    "import React, { useState, useMemo } from 'react';",
    "import React, { useState, useMemo } from 'react';\nimport { PrintHeader } from './PrintHeader';"
  );
}

// Add Printer icon if not there
if (!content.includes('Printer')) {
  content = content.replace(
    "import { PlusCircle, Search, Edit3, Trash2, Hash } from 'lucide-react';",
    "import { PlusCircle, Search, Edit3, Trash2, Hash, Printer } from 'lucide-react';"
  );
}

// Update header section
content = content.replace(
  /<div className="flex items-center gap-2 self-start sm:self-auto bg-zinc-100 dark:bg-zinc-800 px-3 py-1\.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">\s*<span>\{coaList.length\} accounts configured<\/span>\s*<\/div>/,
  `<div className="flex items-center gap-2 self-start sm:self-auto bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
          <span>{coaList.length} accounts configured</span>
        </div>
        <div className="no-print">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 text-xs bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-white font-bold px-4 py-2.5 rounded-xl transition-colors border border-zinc-800 shadow-sm focus:outline-none"
            title="Print Chart of Accounts"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>`
);

// Add PrintHeader at the top of the main container
content = content.replace(
  /<div className="space-y-6">/,
  `<div className="space-y-6">
      <PrintHeader title="Chart of Accounts" />`
);

// Make the top bar no-print
content = content.replace(
  /<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">/,
  `<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 no-print">`
);

content = content.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-5 gap-4">/,
  `<div className="grid grid-cols-1 sm:grid-cols-5 gap-4 no-print">`
);

content = content.replace(
  /<div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">/,
  `<div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 no-print">`
);

// Make form no print
content = content.replace(
  /<div className="space-y-6">/, // Wait, this will match the root div, which we already replaced. Let's use a more specific regex.
  `<div className="space-y-6">`
);

fs.writeFileSync('src/components/COAModule.tsx', content);
console.log('patched COA');
