const fs = require('fs');
let content = fs.readFileSync('src/components/COAModule.tsx', 'utf8');

content = content.replace(
  /<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">/,
  `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">`
);

content = content.replace(
  /<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">/,
  `<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden print:border-0 print:shadow-none print:w-full">`
);

fs.writeFileSync('src/components/COAModule.tsx', content);
console.log('patched COA2');
