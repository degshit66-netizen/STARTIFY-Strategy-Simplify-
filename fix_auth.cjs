const fs = require('fs');
let code = fs.readFileSync('src/components/Auth.tsx', 'utf8');

// The sed command replaced BOTH 'if (user) {' with the password check logic.
// We need to revert it and apply it properly.

code = code.replace(/const isPasswordValid = user\?\.authProvider === 'google' \|\| !user\?\.password \|\| user\?\.password === trimmedPassword;\n        if \(user && isPasswordValid\) \{/g, 'if (user) {');

fs.writeFileSync('src/components/Auth.tsx', code);
