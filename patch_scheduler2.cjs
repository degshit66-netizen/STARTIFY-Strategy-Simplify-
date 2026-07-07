const fs = require('fs');
let content = fs.readFileSync('src/components/SchedulerModule.tsx', 'utf8');

content = content.replace(
  /<div className="flex flex-col lg:flex-row gap-6 items-start no-print">/,
  `<div className="flex flex-col lg:flex-row gap-6 items-start">`
);

content = content.replace(
  /<div className="w-full lg:w-80 shrink-0 space-y-4">/,
  `<div className="w-full lg:w-80 shrink-0 space-y-4 no-print">`
);

fs.writeFileSync('src/components/SchedulerModule.tsx', content);
console.log('patched Scheduler2');
