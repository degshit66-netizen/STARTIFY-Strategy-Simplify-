const fs = require('fs');
let code = fs.readFileSync('src/components/SuperAdminDashboard.tsx', 'utf8');

// Update imports
code = code.replace(
  "import { syncConfigToFirebase, loadConfigFromFirebase, loadTenantsFromFirebase } from '../lib/db';",
  "import { syncConfigToFirebase, loadConfigFromFirebase, loadTenantsFromFirebase, syncTenantToFirebase } from '../lib/db';"
);

// Remove "Initialize Remote Session" button and its logic
// We just remove the onSelectTenant usages
code = code.replace(/\{onSelectTenant && \([\s\S]*?<\/button>\s*\)\}/g, '');

// Fix handleUpdateStatus
code = code.replace(
  /const handleUpdateStatus = \(id: string, status: 'active' \| 'paused' \| 'terminated'\) => \{\s*if \(\!confirm\(`Are you sure you want to change this tenant's status to \$\{status\}\?`\)\) return;\s*setTenants\(tenants\.map\(t => t\.id === id \? \{ \.\.\.t, subscriptionStatus: status \} : t\)\);\s*\};/,
  `const handleUpdateStatus = async (id: string, status: 'active' | 'paused' | 'terminated') => {
    if (!confirm(\`Are you sure you want to change this tenant's status to \${status}?\`)) return;
    const updatedTenants = tenants.map(t => t.id === id ? { ...t, subscriptionStatus: status } : t);
    setTenants(updatedTenants);
    const tenantToSync = updatedTenants.find(t => t.id === id);
    if (tenantToSync) {
      await syncTenantToFirebase(tenantToSync);
    }
  };`
);

// Fix handleSaveUpdate
code = code.replace(
  /const handleSaveUpdate = \(\) => \{\s*if \(selectedTenant && updateDate\) \{\s*setTenants\(tenants\.map\(t => t\.id === selectedTenant\.id \? \{ \s*\.\.\.t, \s*subscriptionStatus: 'active',\s*expiresAt: new Date\(updateDate\)\.toISOString\(\),\s*modules: editModules\s*\} : t\)\);\s*setIsUpdateModalOpen\(false\);\s*\}\s*\};/,
  `const handleSaveUpdate = async () => {
    if (selectedTenant && updateDate) {
      const updatedTenants = tenants.map(t => t.id === selectedTenant.id ? { 
        ...t, 
        subscriptionStatus: 'active' as const,
        expiresAt: new Date(updateDate).toISOString(),
        modules: editModules
      } : t);
      setTenants(updatedTenants);
      const tenantToSync = updatedTenants.find(t => t.id === selectedTenant.id);
      if (tenantToSync) {
        await syncTenantToFirebase(tenantToSync);
      }
      setIsUpdateModalOpen(false);
    }
  };`
);

// Now apply gradient styles
// The user wanted: "Yung command center Gawin mo ding gradient blue and white screen"
// And replace dark themes
code = code.replace('h-screen bg-zinc-950 text-cyan-50 flex flex-col font-sans overflow-hidden selection:bg-cyan-500/30 relative', 'h-screen bg-gradient-to-br from-white to-blue-50 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-cyan-50 flex flex-col font-sans overflow-hidden selection:bg-blue-500/30 relative');
code = code.replace(/bg-zinc-950/g, 'bg-white/80 dark:bg-slate-950');
code = code.replace(/bg-zinc-900/g, 'bg-white dark:bg-slate-900');
code = code.replace(/text-cyan-400/g, 'text-blue-600 dark:text-blue-400');
code = code.replace(/text-cyan-500/g, 'text-blue-500');
code = code.replace(/bg-cyan-900\/50/g, 'bg-blue-100 dark:bg-blue-900/50');
code = code.replace(/border-cyan-900\/50/g, 'border-blue-200 dark:border-blue-900/50');
code = code.replace(/bg-cyan-950/g, 'bg-blue-50 dark:bg-blue-950');
code = code.replace(/text-cyan-100/g, 'text-blue-900 dark:text-blue-100');
code = code.replace(/text-cyan-300/g, 'text-blue-700 dark:text-blue-300');
code = code.replace(/bg-cyan-500/g, 'bg-blue-600 dark:bg-blue-500');
code = code.replace(/border-cyan-500/g, 'border-blue-500');
code = code.replace(/ring-cyan-500/g, 'ring-blue-500');
code = code.replace(/border-cyan-800/g, 'border-blue-200 dark:border-blue-800');
code = code.replace(/text-cyan-700/g, 'text-blue-700');

fs.writeFileSync('src/components/SuperAdminDashboard.tsx', code);
