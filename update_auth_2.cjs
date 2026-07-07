const fs = require('fs');
let content = fs.readFileSync('src/components/Auth.tsx', 'utf8');

content = content.replace(
  /<div className="mb-10">/g,
  '<div className="mb-6">'
);

content = content.replace(
  /<h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">/g,
  '<h3 className="text-xl font-black text-zinc-900 dark:text-white mb-1 text-center">'
);

content = content.replace(
  /<p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">/g,
  '<p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium text-center">'
);

content = content.replace(
  /className="w-full pl-12 pr-4 py-3\.5/g,
  'className="w-full pl-10 pr-4 py-2.5'
);

content = content.replace(
  /className="w-full mt-4 py-4/g,
  'className="w-full mt-4 py-3'
);

content = content.replace(
  /className="w-full py-4/g,
  'className="w-full py-3'
);

fs.writeFileSync('src/components/Auth.tsx', content);
console.log('updated Auth.tsx again');
