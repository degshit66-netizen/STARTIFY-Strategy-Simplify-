const fs = require('fs');

const filesToFix = [
  { file: 'src/components/COAModule.tsx', needsPrinter: true, needsHeader: true },
  { file: 'src/components/ContactsModule.tsx', needsPrinter: false, needsHeader: true },
  { file: 'src/components/FixedAssetsModule.tsx', needsPrinter: false, needsHeader: true },
  { file: 'src/components/InventoryModule.tsx', needsPrinter: true, needsHeader: true },
  { file: 'src/components/PurchaseModule.tsx', needsPrinter: false, needsHeader: true },
  { file: 'src/components/ReconciliationModule.tsx', needsPrinter: false, needsHeader: true },
  { file: 'src/components/SalesModule.tsx', needsPrinter: false, needsHeader: true },
  { file: 'src/components/SchedulerModule.tsx', needsPrinter: true, needsHeader: true }
];

for (const { file, needsPrinter, needsHeader } of filesToFix) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (needsHeader && !content.includes("import { PrintHeader } from './PrintHeader';")) {
    content = "import { PrintHeader } from './PrintHeader';\n" + content;
  }
  
  if (needsPrinter) {
    if (!content.includes('Printer')) {
      content = content.replace(/import \{([^\}]+)\} from 'lucide-react';/, (match, p1) => {
        return `import {${p1}, Printer} from 'lucide-react';`;
      });
    }
  }

  fs.writeFileSync(file, content);
}

console.log('Fixed imports');
