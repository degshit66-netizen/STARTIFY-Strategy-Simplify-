const fs = require('fs');
let code = fs.readFileSync('src/components/SuperAdminDashboard.tsx', 'utf8');

// The original colors were mostly text-slate-900 dark:text-cyan-50 or something. 
// Or text-blue-600 dark:text-blue-400.
// Let's replace the glowy ones.

const glowRegex = /text-black (drop-shadow-\[[^\]]+\]\s*)+/g;
code = code.replace(glowRegex, 'text-slate-900 dark:text-cyan-50 ');

// Let's also restore specific known ones that were replaced entirely, or just keep it simple: 
// The user just wants the green glow gone. Changing everything to text-slate-900 dark:text-cyan-50 is readable and has no glow.

code = code.replace(/text-slate-900 dark:text-cyan-50 drop-shadow-\[[^\]]+\]/g, 'text-slate-900 dark:text-cyan-50');

fs.writeFileSync('src/components/SuperAdminDashboard.tsx', code);
