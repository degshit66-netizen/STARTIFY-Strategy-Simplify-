import fs from 'fs';

const files = [
  'src/components/FixedAssetsModule.tsx',
  'src/components/InventoryModule.tsx',
  'src/components/ContactsModule.tsx',
  'src/components/QuotationBuilder.tsx',
  'src/components/SettingsModal.tsx',
  'src/components/AuditTrailModule.tsx',
  'src/main.tsx',
  'src/App.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/degz_/g, 'stratify_');
  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
});
