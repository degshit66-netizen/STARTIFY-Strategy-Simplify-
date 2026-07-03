const fs = require('fs');
let code = fs.readFileSync('src/components/SuperAdminDashboard.tsx', 'utf8');

code = code.replace(/text-cyan-50(?!0)/g, 'text-slate-900 dark:text-cyan-50');
code = code.replace(/text-blue-50(?!0)/g, 'text-slate-900 dark:text-blue-50');
code = code.replace(/text-emerald-50(?!0)/g, 'text-slate-900 dark:text-emerald-50');
code = code.replace(/text-purple-50(?!0)/g, 'text-slate-900 dark:text-purple-50');

code = code.replace(/text-cyan-600/g, 'text-blue-700 dark:text-cyan-600');
code = code.replace(/text-emerald-400/g, 'text-emerald-700 dark:text-emerald-400');
code = code.replace(/text-cyan-400/g, 'text-blue-700 dark:text-cyan-400');
code = code.replace(/text-purple-400/g, 'text-purple-700 dark:text-purple-400');
code = code.replace(/text-blue-400/g, 'text-blue-700 dark:text-blue-400');

code = code.replace(/bg-cyan-950\/50/g, 'bg-cyan-50 dark:bg-cyan-950/50');
code = code.replace(/bg-blue-950\/50/g, 'bg-blue-50 dark:bg-blue-950/50');
code = code.replace(/bg-emerald-950\/50/g, 'bg-emerald-50 dark:bg-emerald-950/50');
code = code.replace(/bg-purple-950\/50/g, 'bg-purple-50 dark:bg-purple-950/50');

code = code.replace(/bg-zinc-950\/50/g, 'bg-white/80 dark:bg-slate-950/50');
code = code.replace(/bg-zinc-950\/30/g, 'bg-white/80 dark:bg-slate-950/30');
code = code.replace(/bg-zinc-950\/80/g, 'bg-white/90 dark:bg-slate-950/80');
code = code.replace(/bg-zinc-800/g, 'bg-slate-100 dark:bg-slate-800');

code = code.replace(/text-zinc-500/g, 'text-slate-500 dark:text-slate-400');
code = code.replace(/text-zinc-400/g, 'text-slate-600 dark:text-slate-400');

// Replace any leftover text-cyan-something to readable blues
code = code.replace(/text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500/g, 'text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-cyan-400 dark:to-blue-500');

// Make borders readable
code = code.replace(/border-cyan-900\/40/g, 'border-blue-200 dark:border-blue-900/40');
code = code.replace(/border-cyan-900\/50/g, 'border-blue-200 dark:border-blue-900/50');
code = code.replace(/border-blue-900\/50/g, 'border-blue-200 dark:border-blue-900/50');
code = code.replace(/border-emerald-900\/50/g, 'border-emerald-200 dark:border-emerald-900/50');
code = code.replace(/border-purple-900\/50/g, 'border-purple-200 dark:border-purple-900/50');

// The headers
code = code.replace(/text-cyan-800/g, 'text-blue-800 dark:text-blue-300');
code = code.replace(/text-xs font-mono text-cyan-300/g, 'text-xs font-mono text-slate-800 dark:text-cyan-300');

fs.writeFileSync('src/components/SuperAdminDashboard.tsx', code);
