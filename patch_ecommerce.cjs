const fs = require('fs');
let content = fs.readFileSync('src/components/EcommerceModule.tsx', 'utf8');

if (!content.includes('PrintHeader')) {
  content = content.replace(
    "import React, { useState, useEffect, useMemo } from 'react';",
    "import React, { useState, useEffect, useMemo } from 'react';\nimport { PrintHeader } from './PrintHeader';"
  );
}

if (!content.includes('Printer')) {
  content = content.replace(
    "import { ShoppingCart, ShoppingBag, RefreshCw, Settings, Package, Search, ExternalLink, Activity, ArrowRight, TrendingUp } from 'lucide-react';",
    "import { ShoppingCart, ShoppingBag, RefreshCw, Settings, Package, Search, ExternalLink, Activity, ArrowRight, TrendingUp, Printer } from 'lucide-react';"
  );
}

content = content.replace(
  /<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">/,
  `<PrintHeader title="E-Commerce Integration" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 no-print">`
);

content = content.replace(
  /<button\s+onClick=\{\(\) => setSettingsModalOpen\(true\)\}\s*className="flex items-center gap-2 text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2\.5 rounded-xl transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm"\s*>\s*<Settings className="w-4 h-4" \/>\s*<span>Integration Setup<\/span>\s*<\/button>/,
  `<button 
            onClick={() => window.print()}
            className="flex items-center gap-2 text-xs bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-white font-bold px-4 py-2.5 rounded-xl transition-colors border border-zinc-800 shadow-sm focus:outline-none"
            title="Print E-Commerce Orders"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button 
            onClick={() => setSettingsModalOpen(true)}
            className="flex items-center gap-2 text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2.5 rounded-xl transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm"
          >
            <Settings className="w-4 h-4" />
            <span>Integration Setup</span>
          </button>`
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
  /rounded-2xl shadow-sm overflow-hidden"/g,
  `rounded-2xl shadow-sm overflow-hidden print:border-0 print:shadow-none print:w-full"`
);

fs.writeFileSync('src/components/EcommerceModule.tsx', content);
console.log('patched Ecommerce');
