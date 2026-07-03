const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

const target = `    if (setUsers) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast('Team member removed successfully.', 'success');
    }`;

const replacement = `    if (setUsers) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      deleteUserFromFirebase(userId).catch(console.error);
      showToast('Team member removed successfully.', 'success');
    }`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/SettingsModal.tsx', code);
