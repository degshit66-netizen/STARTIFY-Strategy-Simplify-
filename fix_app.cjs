const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
lines[1198] = lines[1198].replace('</div>', '</motion.div>'); // router (line 1199 -> index 1198)
lines[1285] = lines[1285].replace('</div>', '</motion.div>'); // toast (line 1286 -> index 1285)
fs.writeFileSync('src/App.tsx', lines.join('\n'));
