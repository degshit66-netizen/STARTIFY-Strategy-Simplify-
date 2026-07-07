import fs from 'fs';
const file = fs.readFileSync('src/lib/firebase.ts', 'utf8');
console.log(file);
