const fs = require('fs');
let file = 'src/taskpane/core/services/__tests__/diff-engine.test.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace('const { generatedAt: _t1, ...rest1 } = r1;', 'const { generatedAt, ...rest1 } = r1;');
code = code.replace('const { generatedAt: _t2, ...rest2 } = r2;', 'const { generatedAt: generatedAt2, ...rest2 } = r2;');
fs.writeFileSync(file, code);
