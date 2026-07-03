const fs = require('fs');
let code = fs.readFileSync('src/components/SuperAdminDashboard.tsx', 'utf8');

// Replace standard texts with black text and green glow
// Find text-slate-900, text-blue-700, text-blue-600, etc.

code = code.replace(/text-slate-900 dark:text-[a-z0-9-\/]+/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-blue-700 dark:text-[a-z0-9-\/]+/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-blue-600 dark:text-[a-z0-9-\/]+/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-emerald-700 dark:text-[a-z0-9-\/]+/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-purple-700 dark:text-[a-z0-9-\/]+/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-zinc-500/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-zinc-400/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-slate-500 dark:text-[a-z0-9-\/]+/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-slate-600 dark:text-[a-z0-9-\/]+/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-blue-900 dark:text-[a-z0-9-\/]+/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-cyan-400 dark:to-blue-500 drop-shadow-\[0_0_10px_rgba\(34,211,238,0\.5\)\]/g, 'text-black drop-shadow-[0_0_8px_rgba(34,197,94,1)]');
code = code.replace(/text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-cyan-400 dark:to-blue-500/g, 'text-black drop-shadow-[0_0_8px_rgba(34,197,94,1)]');
code = code.replace(/text-emerald-600/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-purple-600/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-blue-600/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-slate-900/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-cyan-600/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-cyan-700/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-blue-700/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-cyan-100/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-cyan-300/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-cyan-400/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');
code = code.replace(/text-cyan-50/g, 'text-black drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]');

fs.writeFileSync('src/components/SuperAdminDashboard.tsx', code);
