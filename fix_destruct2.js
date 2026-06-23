const fs = require('fs');
let file = 'src/taskpane/core/services/__tests__/diff-engine.test.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace('const { generatedAt, ...rest1 } = r1;', 'delete (r1 as any).generatedAt; const rest1 = r1;');
code = code.replace('const { generatedAt: generatedAt2, ...rest2 } = r2;', 'delete (r2 as any).generatedAt; const rest2 = r2;');
fs.writeFileSync(file, code);
