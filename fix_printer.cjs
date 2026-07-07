const fs = require('fs');

function addPrinter(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('<Printer') && !content.includes('Printer')) {
    // This is naive, let's just inject Printer into lucide-react imports reliably
    // We'll replace `} from 'lucide-react';` with `, Printer } from 'lucide-react';`
    if (!content.match(/Printer\b/)) {
      content = content.replace(/\} from 'lucide-react';/, ', Printer } from \'lucide-react\';');
      fs.writeFileSync(file, content);
      console.log('Fixed', file);
    }
  }
}

const glob = require('fs').readdirSync('src/components');
glob.forEach(f => {
  if (f.endsWith('.tsx')) {
    let file = 'src/components/' + f;
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('<Printer') && !content.match(/Printer\b.*lucide-react/s)) {
      content = content.replace(/\} from 'lucide-react';/, ', Printer } from \'lucide-react\';');
      fs.writeFileSync(file, content);
      console.log('Fixed', file);
    }
  }
});

