const fs = require('fs');
let content = fs.readFileSync('src/components/Auth.tsx', 'utf8');

content = content.replace(
  /className="w-full max-w-md bg-gradient-to-br from-white to-blue-50 dark:from-zinc-900 dark:to-blue-950\/30 rounded-\[2rem\] shadow-2xl overflow-hidden border border-blue-100 dark:border-blue-900\/30 flex flex-col relative"/g,
  'className="w-full max-w-[380px] bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col relative"'
);

content = content.replace(
  /<div className="p-8 text-center bg-gradient-to-br from-blue-700 to-blue-900 border-b border-white\/5 shrink-0">[\s\S]*?<div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-transparent">/m,
  `<div className="pt-8 pb-4 text-center shrink-0">
            <img 
              src="https://i.postimg.cc/5yGwSWWR/1782659487700.png" 
              alt="STRATIFY Logo" 
              className="w-12 h-12 mx-auto mb-2 object-contain rounded-xl shadow-md shadow-blue-900/20"
            />
            <h1 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tighter">STRATIFY</h1>
          </div>
          <div className="flex-1 px-6 pb-8 overflow-y-auto custom-scrollbar bg-transparent">`
);

fs.writeFileSync('src/components/Auth.tsx', content);
console.log('updated Auth.tsx');
