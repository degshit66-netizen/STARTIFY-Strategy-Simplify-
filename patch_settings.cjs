const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

if (!code.includes('deleteUserFromFirebase')) {
  // Insert import
  code = code.replace(/import \{ CompanyConfig/, "import { deleteUserFromFirebase } from '../lib/db';\nimport { CompanyConfig");
  
  // Replace handleDeleteMember body
  const replacement = `if (setUsers) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      deleteUserFromFirebase(userId).catch(console.error);
      showToast('Team member removed successfully.', 'success');
    }`;
  
  code = code.replace(/if\s*\(\s*setUsers\s*\)\s*\{\s*setUsers[^}]+\}\s*showToast\([^)]+\);\s*\}/g, replacement);
  fs.writeFileSync('src/components/SettingsModal.tsx', code);
}
