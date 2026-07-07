const fs = require('fs');
let content = fs.readFileSync('src/lib/db.ts', 'utf8');

content = content.replace(
  "import { Tenant, User, PasswordResetRequest } from '../types';",
  "import { Tenant, User, PasswordResetRequest } from '../types';\nimport * as idb from 'idb-keyval';"
);

content = content.replace(
  "// Apply the localStorage override\nexport const initializeLocalStorageOverride = () => {\n  try {\n    Storage.prototype.getItem = function(key: string) {",
  "// In-memory store to bypass 5MB localStorage limit\nconst inMemoryStorage = new Map<string, string>();\n\n// Apply the localStorage override\nexport const initializeLocalStorageOverride = async () => {\n  try {\n    const entries = await idb.entries();\n    for (const [k, v] of entries) {\n      if (typeof k === 'string' && typeof v === 'string') {\n        inMemoryStorage.set(k, v);\n      }\n    }\n\n    Storage.prototype.getItem = function(key: string) {"
);

content = content.replace(
  /const getTenantKey = \(key: string\) => {[\s\S]*?return key;\n};/m,
  `const getTenantKey = (key: string) => {
  if (isGlobalKey(key)) return key;
  try {
    const tenantId = inMemoryStorage.get('current_tenant_id') || rawStorage.getItem.call(window.localStorage, 'current_tenant_id');
    if (tenantId) {
      return \`\${tenantId}_\${key}\`;
    }
  } catch (e) {}
  return key;
};`
);

content = content.replace(
  /    Storage\.prototype\.getItem = function\(key: string\) {\n      if \(!key\) return null;\n      return rawStorage\.getItem\.call\(this, getTenantKey\(key\)\);\n    };/m,
  `    Storage.prototype.getItem = function(key: string) {
      if (!key) return null;
      const tenantKey = getTenantKey(key);
      return inMemoryStorage.get(tenantKey) || rawStorage.getItem.call(this, tenantKey);
    };`
);

content = content.replace(
  /    Storage\.prototype\.setItem = function\(key: string, value: string\) {\n      if \(!key\) return;\n      const tenantKey = getTenantKey\(key\);\n      rawStorage\.setItem\.call\(this, tenantKey, value\);\n      \/\/ Async sync to Firebase if it's tenant-specific\n      if \(!isGlobalKey\(key\)\) {\n        const tenantId = rawStorage\.getItem\.call\(window\.localStorage, 'current_tenant_id'\);\n        if \(tenantId\) {\n          syncStorageToFirebase\(tenantId, key, value\);\n        }\n      }\n    };/m,
  `    Storage.prototype.setItem = function(key: string, value: string) {
      if (!key) return;
      const tenantKey = getTenantKey(key);
      inMemoryStorage.set(tenantKey, value);
      try {
        rawStorage.setItem.call(this, tenantKey, value);
      } catch (e) {} // Ignore quota exceeded
      idb.set(tenantKey, value).catch(() => {});
      
      // Async sync to Firebase if it's tenant-specific
      if (!isGlobalKey(key)) {
        const tenantId = inMemoryStorage.get('current_tenant_id') || rawStorage.getItem.call(window.localStorage, 'current_tenant_id');
        if (tenantId) {
          syncStorageToFirebase(tenantId, key, value);
        }
      }
    };`
);

content = content.replace(
  /    Storage\.prototype\.removeItem = function\(key: string\) {\n      if \(!key\) return;\n      const tenantKey = getTenantKey\(key\);\n      rawStorage\.removeItem\.call\(this, tenantKey\);\n      \/\/ Async delete from Firebase if it's tenant-specific\n      if \(!isGlobalKey\(key\)\) {\n        const tenantId = rawStorage\.getItem\.call\(window\.localStorage, 'current_tenant_id'\);\n        if \(tenantId\) {\n          deleteStorageFromFirebase\(tenantId, key\);\n        }\n      }\n    };/m,
  `    Storage.prototype.removeItem = function(key: string) {
      if (!key) return;
      const tenantKey = getTenantKey(key);
      inMemoryStorage.delete(tenantKey);
      rawStorage.removeItem.call(this, tenantKey);
      idb.del(tenantKey).catch(() => {});
      
      // Async delete from Firebase if it's tenant-specific
      if (!isGlobalKey(key)) {
        const tenantId = inMemoryStorage.get('current_tenant_id') || rawStorage.getItem.call(window.localStorage, 'current_tenant_id');
        if (tenantId) {
          deleteStorageFromFirebase(tenantId, key);
        }
      }
    };`
);

content = content.replace(
  /        const tenantId = rawStorage\.getItem\.call\(window\.localStorage, 'current_tenant_id'\);\n        if \(!tenantId\) {\n          return;\n        }\n        const keysToRemove: string\[\] = \[\];\n        for \(let i = 0; i < window\.localStorage\.length; i\+\+\) {\n          const k = window\.localStorage\.key\(i\);\n          if \(k && k\.startsWith\(`\$\{tenantId\}_`\)\) {\n            keysToRemove\.push\(k\);\n          }\n        }\n        keysToRemove\.forEach\(k => {\n          rawStorage\.removeItem\.call\(window\.localStorage, k\);\n          const originalKey = k\.replace\(`\$\{tenantId\}_`, ''\);\n          deleteStorageFromFirebase\(tenantId, originalKey\);\n        }\);/m,
  `        const tenantId = inMemoryStorage.get('current_tenant_id') || rawStorage.getItem.call(window.localStorage, 'current_tenant_id');
        if (!tenantId) {
          return;
        }
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(\`\${tenantId}_\`)) {
            keysToRemove.push(k);
          }
        }
        for (const k of inMemoryStorage.keys()) {
          if (k.startsWith(\`\${tenantId}_\`) && !keysToRemove.includes(k)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => {
          inMemoryStorage.delete(k);
          rawStorage.removeItem.call(window.localStorage, k);
          idb.del(k).catch(() => {});
          const originalKey = k.replace(\`\${tenantId}_\`, '');
          deleteStorageFromFirebase(tenantId, originalKey);
        });`
);

fs.writeFileSync('src/lib/db.ts', content);
console.log('updated db.ts');
