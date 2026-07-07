const fs = require('fs');
let content = fs.readFileSync('src/components/SchedulerModule.tsx', 'utf8');

if (!content.includes('PrintHeader')) {
  content = content.replace(
    "import React, { useState, useEffect, useMemo } from 'react';",
    "import React, { useState, useEffect, useMemo } from 'react';\nimport { PrintHeader } from './PrintHeader';"
  );
}

if (!content.includes('Printer')) {
  content = content.replace(
    "import { Calendar, Bell, PlusCircle, Search, Edit3, Trash2, CheckCircle, Clock, AlertTriangle, Filter } from 'lucide-react';",
    "import { Calendar, Bell, PlusCircle, Search, Edit3, Trash2, CheckCircle, Clock, AlertTriangle, Filter, Printer } from 'lucide-react';"
  );
}

content = content.replace(
  /<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">/,
  `<PrintHeader title="Business Scheduler" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 no-print">`
);

content = content.replace(
  /<button \s*onClick=\{triggerPushPermission\}\s*className="flex items-center gap-2 text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2\.5 rounded-xl transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm"\s*>/,
  `<button 
            onClick={() => window.print()}
            className="flex items-center gap-2 text-xs bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-white font-bold px-4 py-2.5 rounded-xl transition-colors border border-zinc-800 shadow-sm focus:outline-none no-print"
            title="Print Schedule"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button 
            onClick={triggerPushPermission}
            className="flex items-center gap-2 text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2.5 rounded-xl transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm no-print"
          >`
);

content = content.replace(
  /<div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">/,
  `<div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 no-print">`
);

content = content.replace(
  /<div className="flex flex-col lg:flex-row gap-6 items-start">/,
  `<div className="flex flex-col lg:flex-row gap-6 items-start no-print">`
);

content = content.replace(
  /<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">/,
  `<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden print:w-full print:border-0 print:shadow-none">`
);

fs.writeFileSync('src/components/SchedulerModule.tsx', content);
console.log('patched Scheduler');
