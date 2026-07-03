const fs = require('fs');
let code = fs.readFileSync('src/components/SuperAdminDashboard.tsx', 'utf8');

// Enhance the glow since black text on dark background needs a stronger halo to be readable
code = code.replace(/drop-shadow-\[0_0_5px_rgba\(34,197,94,0\.8\)\]/g, 'drop-shadow-[0_0_8px_rgba(34,197,94,1)] drop-shadow-[0_0_2px_rgba(34,197,94,1)]');
code = code.replace(/drop-shadow-\[0_0_8px_rgba\(34,197,94,1\)\]/g, 'drop-shadow-[0_0_8px_rgba(34,197,94,1)] drop-shadow-[0_0_3px_rgba(34,197,94,1)]');

fs.writeFileSync('src/components/SuperAdminDashboard.tsx', code);
