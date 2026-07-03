const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

if (!code.includes('deleteUserFromFirebase')) {
  code = code.replace(/import \{ CompanyConfig/, "import { deleteUserFromFirebase } from '../lib/db';\nimport { CompanyConfig");
  
  code = code.replace(
`    if (setUsers) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast('Team member removed successfully.', 'success');
    }`,
`    if (setUsers) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      deleteUserFromFirebase(userId).catch(console.error);
      showToast('Team member removed successfully.', 'success');
    }`
  );
  fs.writeFileSync('src/components/SettingsModal.tsx', code);
}
