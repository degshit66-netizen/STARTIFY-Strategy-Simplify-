const fs = require('fs');
let content = fs.readFileSync('src/components/PurchaseModule.tsx', 'utf8');

if (!content.includes('PrintHeader')) {
  content = content.replace(
    "import React, { useState, useMemo } from 'react';",
    "import React, { useState, useMemo } from 'react';\nimport { PrintHeader } from './PrintHeader';"
  );
}

content = content.replace(
  /<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">/,
  `<PrintHeader title="Purchase Journal" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 no-print">`
);

content = content.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">/,
  `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">`
);

content = content.replace(
  /<div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">/,
  `<div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 no-print">`
);

fs.writeFileSync('src/components/PurchaseModule.tsx', content);
console.log('patched Purchase');
