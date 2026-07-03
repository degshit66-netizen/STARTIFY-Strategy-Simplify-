const fs = require('fs');

function patchEcommerce() {
  let code = fs.readFileSync('src/components/EcommerceModule.tsx', 'utf8');
  // Remove Enterprise tab button
  code = code.replace(/<button onClick=\{\(\) => setActiveTab\('Enterprise'\)\}[\s\S]*?Enterprise Features<\/button>/, '');
  // Remove Enterprise tab content
  code = code.replace(/\{activeTab === 'Enterprise' && \([\s\S]*?\}\s*<\/div>\s*\)\}/, '');
  fs.writeFileSync('src/components/EcommerceModule.tsx', code);
}

function patchHR() {
  let code = fs.readFileSync('src/components/HRModule.tsx', 'utf8');
  code = code.replace(/<button onClick=\{\(\) => alert\("Feature coming soon"\)\}[\s\S]*?<\/button>/g, '');
  // Remove Enterprise tab button
  code = code.replace(/<button onClick=\{\(\) => setActiveTab\('Enterprise'\)\}[\s\S]*?Enterprise Features<\/button>/, '');
  // Remove Enterprise tab content
  code = code.replace(/\{activeTab === 'Enterprise' && \([\s\S]*?\}\s*<\/div>\s*\)\}/, '');
  fs.writeFileSync('src/components/HRModule.tsx', code);
}

function patchPayroll() {
  let code = fs.readFileSync('src/components/PayrollModule.tsx', 'utf8');
  // Remove Advanced tab button
  code = code.replace(/<button onClick=\{\(\) => setActiveTab\('Advanced'\)\}[\s\S]*?Enterprise Features<\/button>/, '');
  // Remove Advanced tab content
  code = code.replace(/\{activeTab === 'Advanced' && \([\s\S]*?\}\s*<\/div>\s*\)\}/, '');
  fs.writeFileSync('src/components/PayrollModule.tsx', code);
}

patchEcommerce();
patchHR();
patchPayroll();
