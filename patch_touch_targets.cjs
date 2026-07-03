const fs = require('fs');

function patchSuperAdmin() {
  let code = fs.readFileSync('src/components/SuperAdminDashboard.tsx', 'utf8');
  
  // Make action buttons larger for mobile (p-3 on mobile, p-1.5 on desktop)
  code = code.replace(/className="p-1\.5 /g, 'className="p-3 sm:p-1.5 ');
  
  fs.writeFileSync('src/components/SuperAdminDashboard.tsx', code);
}

function patchSettings() {
  let code = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');
  
  // Make the delete user button larger
  code = code.replace(/className="p-1\.5 /g, 'className="p-3 sm:p-1.5 ');
  
  fs.writeFileSync('src/components/SettingsModal.tsx', code);
}

patchSuperAdmin();
patchSettings();
