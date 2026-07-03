const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/const \[isViewingAsAdmin, setIsViewingAsAdmin\] = useState\(false\);\n/g, '');
code = code.replace(/if \(currentUser.role === 'superadmin' && !isViewingAsAdmin\)/g, "if (currentUser.role === 'superadmin')");
// Remove the 'Exit Admin Session' button block:
// {currentUser.role === 'superadmin' && ( ... <button onClick={() => setIsViewingAsAdmin(false)} ... > ... )}
code = code.replace(/\{currentUser\.role === 'superadmin' && \([\s\S]*?Exit Admin Session\s*<\/button>\s*\)\}/g, '');

fs.writeFileSync('src/App.tsx', code);
