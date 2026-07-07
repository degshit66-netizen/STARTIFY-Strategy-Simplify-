const fs = require('fs');

const glob = require('fs').readdirSync('src/components');
glob.forEach(f => {
  if (f.endsWith('.tsx')) {
    let file = 'src/components/' + f;
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('<Printer') && !content.includes('Printer')) {
      console.log('Missed:', file);
    }
  }
});
