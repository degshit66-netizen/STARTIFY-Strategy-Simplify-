const fs = require('fs');
let content = fs.readFileSync('src/main.tsx', 'utf8');

content = content.replace(
  /initializeLocalStorageOverride\(\);\n\ncreateRoot\(document\.getElementById\('root'\)!\)\.render\(\n  <App \/>,\n\);/m,
  `// OVERRIDE LOCALSTORAGE FOR TENANT ISOLATION AND FIRESTORE SYNC
initializeLocalStorageOverride().then(() => {
  createRoot(document.getElementById('root')!).render(
    <App />
  );
});`
);

// We should also remove the standalone initializeLocalStorageOverride(); just in case
content = content.replace(/\/\/ OVERRIDE LOCALSTORAGE FOR TENANT ISOLATION AND FIRESTORE SYNC\ninitializeLocalStorageOverride\(\);/, '');

fs.writeFileSync('src/main.tsx', content);
console.log('updated main.tsx');
