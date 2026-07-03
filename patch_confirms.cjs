const fs = require('fs');

function removeConfirm(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  // Remove if (!confirm(...)) return;
  code = code.replace(/if\s*\(!?window\.confirm\([^)]+\)\)\s*(?:return|return false);?/g, '');
  code = code.replace(/if\s*\(!?confirm\([^)]+\)\)\s*(?:\{\s*return\s*;?\s*\}|return\s*;?|return false\s*;?)/g, '');
  code = code.replace(/if\s*\(\s*!confirm\([^)]+\)\s*\)\s*\{\s*return;\s*\}/g, '');
  
  // For the SettingsModal.tsx restore logic:
  // const option = confirm( ... );
  // if (!option) return;
  // -> remove both
  code = code.replace(/const option = confirm\([^)]+\);\s*if\s*\(!option\)\s*return;/g, '');
  
  // const doubleCheck = confirm( ... );
  // if (!doubleCheck) return;
  code = code.replace(/const doubleCheck = confirm\([^)]+\);\s*if\s*\(!doubleCheck\)\s*return;/g, '');
  
  // For LedgerTable:
  // if (confirm(...)) { lock logic }
  // We'll just strip the if (confirm(...)) { and the matching } if possible. But it's easier to just do simple string replacements.
  
  fs.writeFileSync(filePath, code);
}

removeConfirm('src/components/SettingsModal.tsx');
removeConfirm('src/components/Form2307Module.tsx');
removeConfirm('src/components/SuperAdminDashboard.tsx');
