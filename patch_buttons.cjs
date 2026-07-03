const fs = require('fs');

function patchSuperAdmin() {
  let code = fs.readFileSync('src/components/SuperAdminDashboard.tsx', 'utf8');
  
  // Make sure to add type="button" to action buttons just in case
  code = code.replace(/<button onClick=\{\(\) => handleUpdateStatus/g, '<button type="button" onClick={() => handleUpdateStatus');
  code = code.replace(/<button onClick=\{\(\) => openUpdateModal/g, '<button type="button" onClick={() => openUpdateModal');
  
  fs.writeFileSync('src/components/SuperAdminDashboard.tsx', code);
}

function patchSettings() {
  let code = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');
  
  code = code.replace(/<button \s*onClick=\{\(\) => handleDeleteMember/g, '<button type="button" onClick={() => handleDeleteMember');
  
  fs.writeFileSync('src/components/SettingsModal.tsx', code);
}

patchSuperAdmin();
patchSettings();
