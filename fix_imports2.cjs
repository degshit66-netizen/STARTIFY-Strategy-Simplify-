const fs = require('fs');

const filesToFix = [
  { file: 'src/components/COAModule.tsx', needsPrinter: true, needsHeader: true },
  { file: 'src/components/ContactsModule.tsx', needsPrinter: false, needsHeader: true },
  { file: 'src/components/FixedAssetsModule.tsx', needsPrinter: false, needsHeader: true },
  { file: 'src/components/InventoryModule.tsx', needsPrinter: true, needsHeader: true },
  { file: 'src/components/PurchaseModule.tsx', needsPrinter: false, needsHeader: true },
  { file: 'src/components/ReconciliationModule.tsx', needsPrinter: false, needsHeader: true },
  { file: 'src/components/SalesModule.tsx', needsPrinter: false, needsHeader: true },
  { file: 'src/components/SchedulerModule.tsx', needsPrinter: true, needsHeader: true },
  { file: 'src/components/AuditTrailModule.tsx', needsPrinter: false, needsHeader: true },
  { file: 'src/components/EcommerceModule.tsx', needsPrinter: false, needsHeader: true },
  { file: 'src/components/HRModule.tsx', needsPrinter: false, needsHeader: true },
  { file: 'src/components/PayrollModule.tsx', needsPrinter: false, needsHeader: true }
];

for (const { file, needsPrinter } of filesToFix) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Some files actually use <Printer /> so they need Printer imported.
    if (content.includes('<Printer') && !content.includes('Printer,')) {
      content = content.replace(/import \{([^\}]+)\} from 'lucide-react';/, (match, p1) => {
        if (!p1.includes('Printer')) {
          return `import {${p1}, Printer} from 'lucide-react';`;
        }
        return match;
      });
      fs.writeFileSync(file, content);
      console.log('Fixed Printer import in', file);
    }
  }
}

